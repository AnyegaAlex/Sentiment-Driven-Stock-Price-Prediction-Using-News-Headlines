import logging
import re
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import ProcessedNews, SymbolSearchCache
from .tasks import fetch_and_save_news  # Only import sync function
from .serializers import ProcessedNewsSerializer

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 3600
MAX_ARTICLES = 50
SYNC_FETCH_TIMEOUT = 15

_TICKER_RE = re.compile(r"^[A-Z0-9.\-]{1,10}$")


def _normalize_symbol(raw: str) -> str:
    return (raw or "").strip().upper()


def _serialize_news(qs):
    serializer = ProcessedNewsSerializer(qs, many=True)
    return serializer.data


@api_view(["GET"])
def get_news(request):
    symbol = _normalize_symbol(request.GET.get("symbol", ""))
    if not symbol or not _TICKER_RE.match(symbol):
        return Response({"error": "Valid 'symbol' query parameter is required."}, status=400)

    force_refresh = request.GET.get("refresh", "false").lower() == "true"

    news_qs = ProcessedNews.objects.filter(symbol=symbol).order_by("-published_at")[:MAX_ARTICLES]
    now = timezone.now()

    cache_is_stale = True
    if news_qs:
        newest_created = news_qs[0].created_at
        cache_is_stale = (now - newest_created).total_seconds() > CACHE_TTL_SECONDS

    refresh_queued = False
    if force_refresh or not news_qs or cache_is_stale:
        try:
            result = fetch_and_save_news(
                symbol,
                fetch_latest_only=True,
                recent_hours=24,
                timeout_seconds=SYNC_FETCH_TIMEOUT
            )
            if result.get("status") == "success" and result.get("new_articles", 0) > 0:
                news_qs = ProcessedNews.objects.filter(symbol=symbol).order_by("-published_at")[:MAX_ARTICLES]
                cache_is_stale = False
                refresh_queued = False
        except Exception as e:
            logger.warning("Synchronous fetch failed for %s: %s", symbol, e)

    return Response({
        "symbol": symbol,
        "refresh_queued": refresh_queued,
        "cache_stale": cache_is_stale,
        "count": len(news_qs),
        "news": _serialize_news(news_qs),
    })


@api_view(["GET"])
def symbol_search(request):
    query = (request.GET.get("q") or "").strip()
    if not query:
        return Response({"error": 'Query parameter "q" is required'}, status=400)

    cache_instance = SymbolSearchCache.objects.filter(query=query).first()
    if cache_instance and cache_instance.is_valid:
        return Response(cache_instance.results)

    results = []
    try:
        av = requests.get(
            "https://www.alphavantage.co/query",
            params={
                "function": "SYMBOL_SEARCH",
                "keywords": query,
                "apikey": settings.ALPHA_VANTAGE_KEY,
            },
            timeout=10,
        )
        av.raise_for_status()
        av_data = av.json()
        if "bestMatches" in av_data:
            results = av_data["bestMatches"] or []

        if not results and settings.RAPIDAPI_KEY:
            yh = requests.get(
                "https://apidojo-yahoo-finance-v1.p.rapidapi.com/auto-complete",
                params={"q": query, "region": "US"},
                headers={
                    "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
                    "X-RapidAPI-Host": settings.RAPIDAPI_HOST,
                },
                timeout=10,
            )
            yh.raise_for_status()
            yh_data = yh.json()
            results = yh_data.get("quotes", []) or []

        SymbolSearchCache.objects.update_or_create(
            query=query,
            defaults={
                "results": results,
                "expires_at": timezone.now() + timedelta(minutes=30),
            },
        )

        return Response(results)

    except requests.RequestException as e:
        logger.error(f"Symbol search failed for query '{query}': {e}")
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_analyzed_news(request):
    return get_news(request)