"""
News views – fetch, sentiment analysis, and symbol search.
All endpoints are documented via OpenAPI (Swagger).

Performance:
- GET /news/get-news/ is cached in Redis for 1 hour (TTL=3600s) to reduce DB load.
- Background sync is performed only if cache is stale.
- External API calls are limited to 15 seconds timeout.

Author: Tickflow Capital
Version: 1.1.0
"""

import gc
import hashlib
import logging
import re
import requests
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Any, Dict, List, Optional, Tuple

import dateutil.parser
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError, transaction, close_old_connections
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status, serializers

from authentication.utils import error_response, success_response
from drf_spectacular.utils import (
    extend_schema, OpenApiParameter, OpenApiResponse, OpenApiTypes
)

from .models import ProcessedNews, SymbolSearchCache
from .serializers import ProcessedNewsSerializer
from .utils import analyze_sentiment

logger = logging.getLogger(__name__)

# ============================================================================
# Constants
# ============================================================================

CACHE_TTL_SECONDS = 3600
MAX_ARTICLES = 50
SYNC_FETCH_TIMEOUT = 15  # seconds
API_TIMEOUT = 10
BATCH_SIZE = 25
RECENT_HOURS_DEFAULT = 24
_TICKER_RE = re.compile(r"^[A-Z0-9.\-]{1,10}$")
USER_AGENT = "sentiment-news-worker/1.0"
_STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "your", "you", "are",
    "was", "were", "will", "has", "have", "had", "its", "their", "they", "them",
}
_AV_TIME_FORMATS = ("%Y%m%dT%H%M%S", "%Y%m%dT%H%M")


# ============================================================================
# Helper functions
# ============================================================================

def normalize_title(title: str) -> str:
    """Normalize a title for deduplication."""
    return re.sub(r"[^\w\s]", "", (title or "").strip().lower())


def extract_key_phrases(text: str) -> List[str]:
    """Extract important bigrams from text."""
    if not text:
        return []
    words = re.findall(r"[A-Za-z]{3,}", text.lower())
    if len(words) < 6:
        return []
    bigrams = [" ".join((words[i], words[i + 1])) for i in range(len(words) - 1)]
    freq: Dict[str, int] = {}
    for bg in bigrams:
        head = bg.split()[0]
        if head in _STOPWORDS:
            continue
        freq[bg] = freq.get(bg, 0) + 1
    return [k for k, _ in sorted(freq.items(), key=lambda kv: kv[1], reverse=True)[:5]]


def _parse_date(value: Any) -> Optional[datetime]:
    """Parse various date formats into a timezone-aware datetime."""
    if not value:
        return None
    try:
        if isinstance(value, int):
            return datetime.fromtimestamp(value, tz=dt_timezone.utc)
        if isinstance(value, str) and value.isdigit():
            iv = int(value)
            if iv > 1_000_000_000_000:
                return datetime.fromtimestamp(iv / 1000.0, tz=dt_timezone.utc)
            return datetime.fromtimestamp(iv, tz=dt_timezone.utc)
        if isinstance(value, str):
            for fmt in _AV_TIME_FORMATS:
                try:
                    dt = datetime.strptime(value, fmt)
                    return dt.replace(tzinfo=dt_timezone.utc)
                except ValueError:
                    continue
            dt = dateutil.parser.parse(value)
            if timezone.is_naive(dt):
                return timezone.make_aware(dt, dt_timezone.utc)
            return dt.astimezone(dt_timezone.utc)
        return None
    except Exception:
        logger.warning("Date parse failed: %s", value)
        return None


def get_source_reliability(name: str) -> int:
    """Return a reliability score for a news source."""
    trusted = {
        "financial times": 90, "bloomberg": 95, "reuters": 85,
        "yahoo finance": 80, "wsj": 90, "wall street journal": 90,
    }
    return trusted.get((name or "").strip().lower(), 70)


def _safe_float(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default


def _standardize_article(symbol: str, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert raw article data into a standardised dict ready for DB."""
    title = (raw.get("title") or raw.get("headline") or raw.get("description") or "").strip()
    if not title:
        return None
    published_at = _parse_date(raw)
    if not published_at:
        return None
    summary = (raw.get("summary") or raw.get("content") or raw.get("snippet") or "").strip()
    provider = (raw.get("provider") or raw.get("source") or raw.get("publisher") or "other").strip()
    source_name = (raw.get("source_name") or raw.get("publisher") or raw.get("source") or provider).strip()
    url = raw.get("url") or raw.get("link") or raw.get("canonicalUrl") or ""
    banner_image_url = (
        raw.get("banner_image_url")
        or raw.get("banner_image")
        or raw.get("image")
        or ""
    )
    title_norm = normalize_title(title)
    rounded_ts = int(round(published_at.timestamp() / 60) * 60)
    title_hash = hashlib.sha256(f"{title_norm}_{rounded_ts}".encode("utf-8")).hexdigest()
    combined_text = f"{title} {summary}".strip()
    sentiment = analyze_sentiment(combined_text) or {}
    label = (sentiment.get("label") or "neutral").lower()
    score = _safe_float(sentiment.get("score"), 0.0)
    key_phrases = extract_key_phrases(combined_text)
    return {
        "symbol": symbol,
        "title_hash": title_hash,
        "title": title[:200],
        "summary": summary[:500],
        "url": url,
        "provider": provider[:50],
        "source_name": source_name[:255],
        "published_at": published_at,
        "sentiment": label,
        "confidence": max(0.0, min(1.0, abs(score))),
        "sentiment_score": score,
        "key_phrases": ", ".join(key_phrases),
        "source_reliability": get_source_reliability(source_name or provider),
        "banner_image_url": banner_image_url[:500],
        "raw_data": raw,
    }


def _filter_recent(raw_articles: List[Dict[str, Any]], hours: int) -> List[Dict[str, Any]]:
    """Keep only articles newer than `hours`."""
    cutoff = timezone.now() - timedelta(hours=hours)
    kept: List[Dict[str, Any]] = []
    for a in raw_articles:
        dt = _parse_date(a)
        if dt and dt >= cutoff:
            kept.append(a)
    return kept


def _upsert_articles(symbol: str, raw_articles: List[Dict[str, Any]]) -> Tuple[int, int]:
    """Insert/update articles in DB. Returns (new_count, duplicate_count)."""
    new_count = 0
    dup_or_updated = 0
    for i in range(0, len(raw_articles), BATCH_SIZE):
        batch = raw_articles[i : i + BATCH_SIZE]
        for raw in batch:
            std = _standardize_article(symbol, raw)
            if not std:
                continue
            lookup = {"symbol": symbol, "title_hash": std["title_hash"]}
            defaults = {k: v for k, v in std.items() if k not in ("symbol", "title_hash")}
            try:
                with transaction.atomic():
                    _, created = ProcessedNews.objects.update_or_create(
                        **lookup,
                        defaults=defaults,
                    )
                if created:
                    new_count += 1
                else:
                    dup_or_updated += 1
            except IntegrityError:
                dup_or_updated += 1
            except Exception as e:
                logger.warning("Upsert failed for %s: %s", symbol, e)
        del batch
        gc.collect()
    return new_count, dup_or_updated


# ============================================================================
# API Fetchers
# ============================================================================

def _fetch_alpha_vantage(session: requests.Session, symbol: str) -> List[Dict[str, Any]]:
    params = {
        "function": "NEWS_SENTIMENT",
        "tickers": symbol,
        "apikey": settings.ALPHA_VANTAGE_KEY,
        "limit": 50,
        "sort": "LATEST",
    }
    r = session.get("https://www.alphavantage.co/query", params=params, timeout=API_TIMEOUT)
    r.raise_for_status()
    data = r.json() or {}
    if "Note" in data or "Information" in data:
        raise ValueError(data.get("Note") or data.get("Information"))
    if "feed" not in data:
        raise ValueError(data.get("Error Message", "Invalid Alpha Vantage response"))
    feed = data.get("feed") or []
    out: List[Dict[str, Any]] = []
    for a in feed[:MAX_ARTICLES]:
        out.append({"banner_image_url": a.get("banner_image", ""), **a})
    return out


def _fetch_finnhub(session: requests.Session, symbol: str) -> List[Dict[str, Any]]:
    today = timezone.now().date()
    seven_days_ago = today - timedelta(days=7)
    r = session.get(
        "https://finnhub.io/api/v1/company-news",
        params={
            "symbol": symbol,
            "from": seven_days_ago.strftime("%Y-%m-%d"),
            "to": today.strftime("%Y-%m-%d"),
            "token": settings.FINNHUB_API_KEY,
        },
        timeout=API_TIMEOUT,
    )
    r.raise_for_status()
    items = r.json() or []
    out: List[Dict[str, Any]] = []
    for a in items[:MAX_ARTICLES]:
        out.append({"banner_image_url": a.get("image", ""), **a})
    return out


def _fetch_yahoo_rapidapi(session: requests.Session, symbol: str) -> List[Dict[str, Any]]:
    headers = {
        "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
        "X-RapidAPI-Host": settings.RAPIDAPI_HOST,
    }
    r = session.get(
        "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v3/get-news",
        params={"symbol": symbol, "count": 50},
        headers=headers,
        timeout=API_TIMEOUT,
    )
    r.raise_for_status()
    data = r.json() or {}
    articles = data.get("items") or data.get("news") or []
    out: List[Dict[str, Any]] = []
    for a in articles[:MAX_ARTICLES]:
        out.append(a)
    return out


# ============================================================================
# Core synchronous fetch function (cached and efficient)
# ============================================================================

def fetch_and_save_news(
    symbol: str,
    fetch_latest_only: bool = True,
    recent_hours: int = RECENT_HOURS_DEFAULT,
    timeout_seconds: int = 30,
) -> Dict[str, Any]:
    """
    Fetch news from external APIs and store in DB.

    Returns:
        dict with status, symbol, fetched count, new_articles, duplicates, cache_hit
    """
    close_old_connections()
    symbol = (symbol or "").strip().upper()
    if not symbol:
        return {"status": "error", "message": "Symbol required"}

    try:
        cutoff = timezone.now() - timedelta(hours=recent_hours)
        if ProcessedNews.objects.filter(symbol=symbol, published_at__gte=cutoff).exists():
            logger.info("Cache hit for %s (last %sh)", symbol, recent_hours)
            return {
                "status": "success",
                "new_articles": 0,
                "duplicates": 0,
                "cache_hit": True,
                "symbol": symbol,
            }

        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT})
            session.timeout = timeout_seconds

            fetchers = []
            if getattr(settings, "ALPHA_VANTAGE_KEY", None):
                fetchers.append(_fetch_alpha_vantage)
            if getattr(settings, "FINNHUB_API_KEY", None):
                fetchers.append(_fetch_finnhub)
            if getattr(settings, "RAPIDAPI_KEY", None) and getattr(settings, "RAPIDAPI_HOST", None):
                fetchers.append(_fetch_yahoo_rapidapi)

            if not fetchers:
                logger.warning("No API keys configured for news fetching")
                return {"status": "error", "message": "No data sources available"}

            last_err: Optional[Exception] = None
            raw_articles: List[Dict[str, Any]] = []

            for fetch in fetchers:
                try:
                    raw_articles = fetch(session, symbol)
                    if raw_articles:
                        break
                except Exception as e:
                    last_err = e
                    logger.warning("API fetch failed (%s): %s", fetch.__name__, e)

            if not raw_articles:
                msg = f"No articles fetched for {symbol}"
                if last_err:
                    msg += f" (last_err={last_err})"
                return {"status": "error", "message": msg}

            if fetch_latest_only:
                raw_articles = _filter_recent(raw_articles, hours=recent_hours)

            new_count, dup_count = _upsert_articles(symbol, raw_articles)
            logger.info("%s: new=%d dup=%d fetched=%d", symbol, new_count, dup_count, len(raw_articles))

            return {
                "status": "success",
                "symbol": symbol,
                "fetched": len(raw_articles),
                "new_articles": new_count,
                "duplicates": dup_count,
                "cache_hit": False,
            }

    except MemoryError:
        logger.critical("Memory exhausted during processing for %s", symbol)
        return {"status": "error", "message": "Memory exhausted"}
    except Exception as e:
        logger.error("Unexpected error for %s: %s", symbol, e)
        return {"status": "error", "message": str(e)}
    finally:
        close_old_connections()
        gc.collect()


# ============================================================================
# Helper functions for views
# ============================================================================

def _normalize_symbol(raw: str) -> str:
    return (raw or "").strip().upper()


def _serialize_news(qs):
    return ProcessedNewsSerializer(qs, many=True).data


def _get_cached_news_response(symbol: str) -> Optional[Dict[str, Any]]:
    """Retrieve cached response for get_news."""
    key = f"news_response:{symbol}"
    return cache.get(key)


def _set_cached_news_response(symbol: str, data: Dict[str, Any], ttl: int = CACHE_TTL_SECONDS):
    """Cache the response for get_news."""
    key = f"news_response:{symbol}"
    cache.set(key, data, timeout=ttl)


# ============================================================================
# Inline Serializers for Swagger
# ============================================================================

class NewsArticleSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    symbol = serializers.CharField()
    title = serializers.CharField()
    summary = serializers.CharField()
    url = serializers.CharField()
    provider = serializers.CharField()
    source_name = serializers.CharField()
    published_at = serializers.DateTimeField()
    sentiment = serializers.CharField()
    confidence = serializers.FloatField()
    sentiment_score = serializers.FloatField()
    key_phrases = serializers.CharField()
    source_reliability = serializers.IntegerField()
    banner_image_url = serializers.CharField()
    created_at = serializers.DateTimeField(required=False)
    updated_at = serializers.DateTimeField(required=False)


class GetNewsResponseSerializer(serializers.Serializer):
    symbol = serializers.CharField()
    refresh_queued = serializers.BooleanField()
    cache_stale = serializers.BooleanField()
    count = serializers.IntegerField()
    news = NewsArticleSerializer(many=True)


# ============================================================================
# Views
# ============================================================================

@extend_schema(
    summary="Get news articles with sentiment",
    description="Fetches news for a given stock symbol with AI sentiment analysis. Uses cached data unless `refresh=true`.",
    parameters=[
        OpenApiParameter(
            name='symbol',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Stock ticker (e.g., AAPL)',
            required=True
        ),
        OpenApiParameter(
            name='refresh',
            type=OpenApiTypes.BOOL,
            location=OpenApiParameter.QUERY,
            description='Force refresh from external APIs',
            required=False,
            default=False
        ),
    ],
    responses={
        200: GetNewsResponseSerializer,
        400: OpenApiResponse(description="Missing or invalid symbol"),
        500: OpenApiResponse(description="Internal server error"),
    },
    tags=["News"]
)
@api_view(["GET"])
def get_news(request):
    symbol = _normalize_symbol(request.GET.get("symbol", ""))
    if not symbol or not _TICKER_RE.match(symbol):
        return Response(
            error_response("Valid 'symbol' query parameter is required.", code=2001),
            status=status.HTTP_400_BAD_REQUEST
        )

    force_refresh = request.GET.get("refresh", "false").lower() == "true"

    # 1. Try Redis cache (unless force refresh)
    if not force_refresh:
        cached = _get_cached_news_response(symbol)
        if cached is not None:
            logger.debug("Returning cached response for %s", symbol)
            return Response(success_response(data=cached), status=status.HTTP_200_OK)

    # 2. Fetch from DB
    news_qs = ProcessedNews.objects.filter(symbol=symbol).order_by("-published_at")[:MAX_ARTICLES]
    now = timezone.now()

    cache_is_stale = True
    refresh_queued = False

    if news_qs.exists():
        newest_created = news_qs[0].created_at
        cache_is_stale = (now - newest_created).total_seconds() > CACHE_TTL_SECONDS
    else:
        cache_is_stale = True

    # 3. If stale or empty, try to refresh synchronously
    if force_refresh or not news_qs.exists() or cache_is_stale:
        try:
            result = fetch_and_save_news(
                symbol,
                fetch_latest_only=True,
                recent_hours=24,
                timeout_seconds=SYNC_FETCH_TIMEOUT
            )
            if result.get("status") == "success" and result.get("new_articles", 0) > 0:
                # Re-fetch from DB
                news_qs = ProcessedNews.objects.filter(symbol=symbol).order_by("-published_at")[:MAX_ARTICLES]
                cache_is_stale = False
                refresh_queued = False
            elif result.get("cache_hit"):
                # Cache hit in DB, but we already have news_qs
                cache_is_stale = False
        except Exception as e:
            logger.warning("Synchronous fetch failed for %s: %s", symbol, e)

    # 4. Build response data
    response_data = {
        "symbol": symbol,
        "refresh_queued": refresh_queued,
        "cache_stale": cache_is_stale,
        "count": len(news_qs),
        "news": _serialize_news(news_qs),
    }

    # 5. Cache response in Redis (only if not stale)
    if not cache_is_stale:
        _set_cached_news_response(symbol, response_data, CACHE_TTL_SECONDS)

    return Response(
        success_response(data=response_data),
        status=status.HTTP_200_OK
    )


@extend_schema(
    summary="Search stock symbols",
    description="Auto‑complete endpoint that searches for ticker symbols and company names using multiple providers: Finnhub (primary), Alpha Vantage, and Yahoo Finance (RapidAPI), with a static fallback.",
    parameters=[
        OpenApiParameter(
            name='q',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Partial symbol or company name (min 2 characters)',
            required=True
        ),
    ],
    responses={
        200: OpenApiResponse(
            description='List of matching symbols. Format: {symbol, name, region}',
            examples=[
                {
                    "application/json": [
                        {"symbol": "AAPL", "name": "Apple Inc.", "region": "US"},
                        {"symbol": "AAPL34", "name": "Apple Inc.", "region": "Brazil"}
                    ]
                }
            ]
        ),
        400: OpenApiResponse(description="Missing query parameter"),
    },
    tags=["News"]
)
@api_view(["GET"])
def symbol_search(request):
    """
    Search for stock symbols using multiple providers in order:
    1. Finnhub (primary – 60 calls/min)
    2. Alpha Vantage (backup – 5 calls/min)
    3. RapidAPI (Yahoo) (fallback)
    4. Static fallback list (always works)

    Always returns a 200 status with results (or an empty list). No 500 errors.
    """
    query = (request.GET.get("q") or "").strip()
    if not query:
        return Response(
            error_response('Query parameter "q" is required', code=2001),
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Check DB cache
    cache_instance = SymbolSearchCache.objects.filter(query=query).first()
    if cache_instance and cache_instance.is_valid:
        return Response(
            success_response(data=cache_instance.results),
            status=status.HTTP_200_OK
        )

    results = []

    # 2. Try Finnhub (primary)
    finnhub_key = getattr(settings, 'FINNHUB_API_KEY', '')
    if finnhub_key:
        try:
            fh = requests.get(
                "https://finnhub.io/api/v1/search",
                params={"q": query, "token": finnhub_key},
                timeout=5,
            )
            if fh.status_code == 200:
                fh_data = fh.json()
                if "result" in fh_data:
                    results = [
                        {
                            "symbol": item.get("symbol", ""),
                            "name": item.get("description", ""),
                            "region": item.get("type", "US"),
                        }
                        for item in fh_data.get("result", [])
                        if item.get("symbol")
                    ]
                    logger.info("Finnhub found %d results for '%s'", len(results), query)
            else:
                logger.warning("Finnhub status %d for '%s'", fh.status_code, query)
        except Exception as e:
            logger.warning("Finnhub exception for '%s': %s", query, e)

    # 3. Try Alpha Vantage if Finnhub returned nothing
    if not results:
        av_key = getattr(settings, 'ALPHA_VANTAGE_KEY', '')
        if av_key:
            try:
                av = requests.get(
                    "https://www.alphavantage.co/query",
                    params={
                        "function": "SYMBOL_SEARCH",
                        "keywords": query,
                        "apikey": av_key,
                    },
                    timeout=5,
                )
                if av.status_code == 200:
                    av_data = av.json()
                    if "bestMatches" in av_data:
                        results = [
                            {
                                "symbol": item.get("1. symbol", ""),
                                "name": item.get("2. name", ""),
                                "region": item.get("3. region", "US"),
                            }
                            for item in av_data["bestMatches"]
                            if item.get("1. symbol")
                        ]
                        logger.info("Alpha Vantage found %d results for '%s'", len(results), query)
                else:
                    logger.warning("Alpha Vantage status %d for '%s'", av.status_code, query)
            except Exception as e:
                logger.warning("Alpha Vantage exception for '%s': %s", query, e)

    # 4. Try RapidAPI (Yahoo) if previous providers returned nothing
    if not results:
        rapid_key = getattr(settings, 'RAPIDAPI_KEY', '')
        rapid_host = getattr(settings, 'RAPIDAPI_HOST', '')
        if rapid_key and rapid_host:
            try:
                yh = requests.get(
                    f"https://{rapid_host}/auto-complete",
                    params={"q": query, "region": "US"},
                    headers={
                        "X-RapidAPI-Key": rapid_key,
                        "X-RapidAPI-Host": rapid_host,
                    },
                    timeout=5,
                )
                if yh.status_code == 200:
                    yh_data = yh.json()
                    results = [
                        {
                            "symbol": item.get("symbol", ""),
                            "name": item.get("shortname", item.get("longname", item.get("symbol", ""))),
                            "region": item.get("region", "US"),
                        }
                        for item in yh_data.get("quotes", [])
                        if item.get("symbol")
                    ]
                    logger.info("RapidAPI found %d results for '%s'", len(results), query)
                elif yh.status_code == 403:
                    logger.warning("RapidAPI 403 Forbidden for '%s' – check API key/host", query)
                else:
                    logger.warning("RapidAPI status %d for '%s'", yh.status_code, query)
            except Exception as e:
                logger.warning("RapidAPI exception for '%s': %s", query, e)

    # 5. Ultimate fallback: static list
    if not results:
        popular = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "JPM", "IBM", "BABA"]
        results = [
            {"symbol": sym, "name": sym, "region": "US"}
            for sym in popular
            if query.upper() in sym
        ]
        if results:
            logger.info("Returning %d static fallback results for '%s'", len(results), query)

    # 6. Cache if we have results
    if results:
        SymbolSearchCache.objects.update_or_create(
            query=query,
            defaults={
                "results": results,
                "expires_at": timezone.now() + timedelta(minutes=30),
            },
        )

    # 7. Always return 200 – empty results if nothing found
    return Response(
        success_response(data=results),
        status=status.HTTP_200_OK
    )


@extend_schema(
    summary="Get analyzed news (alias)",
    description="Alias for `/api/news/get-news/` – maintained for backward compatibility.",
    parameters=[
        OpenApiParameter(
            name='symbol',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Stock ticker (e.g., AAPL)',
            required=True
        ),
    ],
    responses={
        200: GetNewsResponseSerializer,
        400: OpenApiResponse(description="Missing symbol"),
    },
    tags=["News"]
)
@api_view(["GET"])
def get_analyzed_news(request):
    # Pass the original Django HttpRequest to avoid DRF request wrapping twice
    return get_news(request._request)