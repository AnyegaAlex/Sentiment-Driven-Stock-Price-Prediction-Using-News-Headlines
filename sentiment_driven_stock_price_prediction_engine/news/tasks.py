# news/tasks.py
from __future__ import annotations

import gc
import hashlib
import logging
import os
import re
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Any, Dict, List, Optional, Tuple

import dateutil.parser
import requests
from celery import shared_task
from celery.utils.log import get_task_logger
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db import close_old_connections
from django.utils import timezone

from .models import ProcessedNews, StockSymbol
from .utils import analyze_sentiment

logger = logging.getLogger(__name__)
task_logger = get_task_logger(__name__)

# ===== Tunables =====
API_TIMEOUT = 15
MAX_ARTICLES = 100
BATCH_SIZE = 25
RECENT_HOURS_DEFAULT = 24

LOG_FILE = os.path.join(getattr(settings, "BASE_DIR", "."), "logs", "news_fetch_log.txt")

# Alpha Vantage formats seen (your logs show: 20260225T132238)
_AV_TIME_FORMATS = (
    "%Y%m%dT%H%M%S",  # 20260225T132238
    "%Y%m%dT%H%M",    # 20260225T1322 (rare)
)

_STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "your", "you", "are",
    "was", "were", "will", "has", "have", "had", "its", "their", "they", "them",
}

USER_AGENT = "sentiment-news-worker/1.0"


# ===== Utilities =====
def _write_log(message: str) -> None:
    """Non-fatal disk logging (optional)."""
    try:
        os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now(dt_timezone.utc).isoformat()} - {message}\n")
    except Exception:
        # never fail tasks due to log file issues
        logger.debug("Log write failed", exc_info=True)


def normalize_title(title: str) -> str:
    return re.sub(r"[^\w\s]", "", (title or "").strip().lower())


def extract_key_phrases(text: str) -> List[str]:
    """
    Cheap heuristic: top repeated 2-grams (no extra deps).
    """
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


def _parse_date(article: Dict[str, Any]) -> Optional[datetime]:
    """
    Normalize multiple provider date fields to aware UTC datetime.
    Handles:
      - AlphaVantage: time_published = 20260225T132238
      - Finnhub: datetime (epoch seconds int)
      - Yahoo: pubDate / date strings
    """
    value = (
        article.get("time_published")
        or article.get("datetime")
        or article.get("date")
        or article.get("pubDate")
        or article.get("published_at")
        or article.get("publishedAt")
    )
    if not value:
        return None

    try:
        # Finnhub: epoch seconds int
        if isinstance(value, int):
            return datetime.fromtimestamp(value, tz=dt_timezone.utc)

        # sometimes numeric strings (sec or ms)
        if isinstance(value, str) and value.isdigit():
            iv = int(value)
            if iv > 1_000_000_000_000:  # ms
                return datetime.fromtimestamp(iv / 1000.0, tz=dt_timezone.utc)
            return datetime.fromtimestamp(iv, tz=dt_timezone.utc)

        if isinstance(value, str):
            # AlphaVantage like 20260225T132238
            for fmt in _AV_TIME_FORMATS:
                try:
                    dt = datetime.strptime(value, fmt)
                    return dt.replace(tzinfo=dt_timezone.utc)
                except ValueError:
                    continue

            # generic parse
            dt = dateutil.parser.parse(value)
            if timezone.is_naive(dt):
                return timezone.make_aware(dt, dt_timezone.utc)
            return dt.astimezone(dt_timezone.utc)

        return None
    except Exception:
        logger.warning("Date parse failed: %s", value)
        return None


def get_source_reliability(name: str) -> int:
    trusted = {
        "financial times": 90,
        "bloomberg": 95,
        "reuters": 85,
        "yahoo finance": 80,
        "wsj": 90,
        "wall street journal": 90,
    }
    if not name:
        return 70
    return trusted.get(name.strip().lower(), 70)


def _safe_float(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default


def _standardize_article(symbol: str, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Convert provider-specific shapes into one internal shape that matches ProcessedNews fields.
    Your model fields include:
      provider, source_name (NOT source)
    """
    title = (raw.get("title") or raw.get("headline") or raw.get("description") or "").strip()
    if not title:
        return None

    published_at = _parse_date(raw)
    if not published_at:
        return None

    summary = (raw.get("summary") or raw.get("content") or raw.get("snippet") or "").strip()

    # provider + source_name mapping (critical fix)
    provider = (raw.get("provider") or raw.get("source") or raw.get("publisher") or "other").strip()
    source_name = (raw.get("source_name") or raw.get("publisher") or raw.get("source") or provider).strip()

    url = raw.get("url") or raw.get("link") or raw.get("canonicalUrl") or ""

    # banner image mapping (handles alpha: banner_image, finnhub: image, yahoo: thumbnail)
    banner_image_url = (
        raw.get("banner_image_url")
        or raw.get("banner_image")
        or raw.get("image")
        or ""
    )
    # yahoo shapes often: thumbnail.resolutions[0].url
    if not banner_image_url and isinstance(raw.get("thumbnail"), dict):
        resolutions = raw.get("thumbnail", {}).get("resolutions") or []
        if resolutions and isinstance(resolutions[0], dict):
            banner_image_url = resolutions[0].get("url") or ""

    # stable hash: normalized title + minute-rounded timestamp
    title_norm = normalize_title(title)
    rounded_ts = int(round(published_at.timestamp() / 60) * 60)
    title_hash = hashlib.sha256(f"{title_norm}_{rounded_ts}".encode("utf-8")).hexdigest()

    combined_text = f"{title} {summary}".strip()

    sentiment = analyze_sentiment(combined_text) or {}
    label = (sentiment.get("label") or "neutral").lower()
    score = _safe_float(sentiment.get("score"), 0.0)

    key_phrases = extract_key_phrases(combined_text)

    # IMPORTANT: return only fields that exist in ProcessedNews (plus symbol/title_hash for lookup)
    return {
        "symbol": symbol,
        "title_hash": title_hash,
        "title": title[:200],
        "summary": summary[:500],
        "url": url,
        "provider": provider[:50],          # adjust if your model differs
        "source_name": source_name[:255],   # adjust if your model differs
        "published_at": published_at,
        "sentiment": label,
        "confidence": max(0.0, min(1.0, abs(score))),  # 0..1
        "sentiment_score": score,
        "key_phrases": ", ".join(key_phrases),
        "source_reliability": get_source_reliability(source_name or provider),
        "banner_image_url": banner_image_url[:500],
        "raw_data": raw,
    }


def _filter_recent(raw_articles: List[Dict[str, Any]], hours: int) -> List[Dict[str, Any]]:
    cutoff = timezone.now() - timedelta(hours=hours)
    kept: List[Dict[str, Any]] = []
    for a in raw_articles:
        dt = _parse_date(a)
        if dt and dt >= cutoff:
            kept.append(a)
    return kept


def _upsert_articles(symbol: str, raw_articles: List[Dict[str, Any]]) -> Tuple[int, int]:
    """
    Upsert standardized articles into DB.
    Returns (new_count, updated_or_duplicate_count)
    """
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
                # This should now NOT happen unless your model differs
                task_logger.warning("Upsert failed for %s: %s", symbol, e)

        del batch
        gc.collect()

    return new_count, dup_or_updated


# ===== Fetchers =====
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

    # Rate-limit / errors come as "Note" or "Information"
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
    today = datetime.now(dt_timezone.utc).date()
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

    # Some responses nest differently; keep it flexible
    articles = data.get("items") or data.get("news") or []
    out: List[Dict[str, Any]] = []
    for a in articles[:MAX_ARTICLES]:
        # keep raw; banner mapping handled in standardizer
        out.append(a)
    return out


# ===== Celery Tasks =====
@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=120,
    max_retries=2,
    time_limit=300,
    soft_time_limit=240,
)
def fetch_and_process_news(self, symbol: str, fetch_latest_only: bool = True, recent_hours: int = RECENT_HOURS_DEFAULT) -> Dict[str, Any]:
    """
    Fetch and process news for one symbol.
    - DB fast-exit if we already have news in last `recent_hours`
    - Fetch AlphaVantage -> Finnhub -> Yahoo RapidAPI (whichever works)
    - Optionally filter to last `recent_hours`
    - Upsert into ProcessedNews
    """
    close_old_connections()
    symbol = (symbol or "").strip().upper()

    if not symbol:
        return {"status": "error", "message": "Symbol required"}

    try:
        cutoff = timezone.now() - timedelta(hours=recent_hours)
        if ProcessedNews.objects.filter(symbol=symbol, published_at__gte=cutoff).exists():
            task_logger.info("Cache hit for %s (last %sh)", symbol, recent_hours)
            return {"status": "success", "new_articles": 0, "duplicates": 0, "cache_hit": True}

        with requests.Session() as session:
            session.headers.update({"User-Agent": USER_AGENT})

            fetchers = []
            if getattr(settings, "ALPHA_VANTAGE_KEY", None):
                fetchers.append(_fetch_alpha_vantage)
            if getattr(settings, "FINNHUB_API_KEY", None):
                fetchers.append(_fetch_finnhub)
            if getattr(settings, "RAPIDAPI_KEY", None) and getattr(settings, "RAPIDAPI_HOST", None):
                fetchers.append(_fetch_yahoo_rapidapi)

            last_err: Optional[Exception] = None
            raw_articles: List[Dict[str, Any]] = []

            for fetch in fetchers:
                try:
                    raw_articles = fetch(session, symbol)
                    if raw_articles:
                        break
                except Exception as e:
                    last_err = e
                    task_logger.warning("API fetch failed (%s): %s", fetch.__name__, e)

            if not raw_articles:
                msg = f"No articles fetched for {symbol}"
                if last_err:
                    msg += f" (last_err={last_err})"
                return {"status": "error", "message": msg}

            if fetch_latest_only:
                raw_articles = _filter_recent(raw_articles, hours=recent_hours)

            new_count, dup_count = _upsert_articles(symbol, raw_articles)
            _write_log(f"{symbol}: new={new_count} dup={dup_count} fetched={len(raw_articles)}")

            return {
                "status": "success",
                "symbol": symbol,
                "fetched": len(raw_articles),
                "new_articles": new_count,
                "duplicates": dup_count,
                "cache_hit": False,
            }

    except MemoryError:
        task_logger.critical("Memory exhausted during processing for %s", symbol)
        raise self.retry(countdown=300)
    except Exception as e:
        task_logger.error("Unexpected error for %s: %s", symbol, e)
        raise self.retry(exc=e, countdown=300)
    finally:
        close_old_connections()
        gc.collect()


@shared_task(bind=True, time_limit=600, soft_time_limit=540)
def fetch_news_for_all_symbols(self) -> Dict[str, Any]:
    """
    Periodic task: enqueue fetch_and_process_news for all active symbols.
    """
    close_old_connections()
    symbols = list(StockSymbol.objects.filter(is_active=True).values_list("symbol", flat=True))

    enqueued = 0
    for sym in symbols:
        try:
            fetch_and_process_news.delay(sym, fetch_latest_only=True)
            enqueued += 1
        except Exception as e:
            task_logger.warning("Failed to enqueue news task for %s: %s", sym, e)

    return {"status": "ok", "symbols": len(symbols), "enqueued": enqueued}