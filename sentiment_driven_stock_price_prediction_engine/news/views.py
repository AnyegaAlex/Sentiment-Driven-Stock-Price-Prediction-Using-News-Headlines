"""
News views – Serve news data, sentiment analysis, and symbol search.
All endpoints are documented via OpenAPI (Swagger).

Performance & Architecture:
- GET /news/get-news/ is now a purely READ-ONLY endpoint.
- All external API fetching and ML processing is handled asynchronously 
  by the background pipeline (GitHub Actions) via the `services` layer.
- Cached in Redis for 1 hour (TTL=3600s) to reduce Neon DB compute.

Author: Tickflow Capital
Version: 1.2.0 (Decoupled Architecture)
"""

import logging
import re
import requests
from datetime import timedelta
from typing import Any, Dict, Optional

from django.conf import settings
from django.core.cache import cache
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

logger = logging.getLogger(__name__)

# ============================================================================
# Constants
# ============================================================================
CACHE_TTL_SECONDS = 3600
MAX_ARTICLES = 50
_TICKER_RE = re.compile(r"^[A-Z0-9.\-]{1,10}$")

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
# Inline Serializers for Swagger Documentation
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
    description=(
        "Fetches stored news for a given stock symbol with AI sentiment analysis. "
        "This endpoint only reads from the database/cache. Fresh data is populated "
        "asynchronously by the background data pipeline. The `refresh` parameter "
        "is deprecated and ignored."
    ),
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
            description='Deprecated. Ignored.',
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
    """
    Read-only endpoint to fetch news from DB/Cache.
    """
    symbol = _normalize_symbol(request.GET.get("symbol", ""))
    if not symbol or not _TICKER_RE.match(symbol):
        return Response(
            error_response("Valid 'symbol' query parameter is required.", code=2001),
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Try Cache (Instant response)
    cached_data = _get_cached_news_response(symbol)
    if cached_data is not None:
        logger.debug("Returning cached response for %s", symbol)
        return Response(success_response(data=cached_data), status=status.HTTP_200_OK)

    # 2. Query DB (If cache miss)
    try:
        news_qs = ProcessedNews.objects.filter(symbol=symbol).order_by("-published_at")[:MAX_ARTICLES]
        
        # We have data, build response
        response_data = {
            "symbol": symbol,
            "refresh_queued": False,
            "cache_stale": False, # Data is as fresh as the last pipeline run
            "count": len(news_qs),
            "news": _serialize_news(news_qs),
        }

        # 3. Update Cache and Return
        if news_qs.exists():
            _set_cached_news_response(symbol, response_data, CACHE_TTL_SECONDS)
        
        return Response(success_response(data=response_data), status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Failed to fetch news from DB for {symbol}: {e}")
        return Response(
            error_response("Internal server error while fetching news.", code=5001),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    summary="Search stock symbols",
    description=(
        "Auto-complete endpoint that searches for ticker symbols and company names using "
        "multiple providers: Finnhub (primary), Alpha Vantage, and Yahoo Finance (RapidAPI), "
        "with a static fallback."
    ),
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
        try:
            SymbolSearchCache.objects.update_or_create(
                query=query,
                defaults={
                    "results": results,
                    "expires_at": timezone.now() + timedelta(minutes=30),
                },
            )
        except Exception as e:
            logger.error(f"Failed to cache symbol search for {query}: {e}")

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