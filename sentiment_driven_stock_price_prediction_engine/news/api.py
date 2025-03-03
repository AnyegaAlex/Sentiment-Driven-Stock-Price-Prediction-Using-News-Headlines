# news/api.py
import logging
from datetime import timedelta
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import ProcessedNews
from .serializers import ProcessedNewsSerializer
from .external_apis import fetch_alpha, fetch_finnhub, fetch_yahoo
from .tasks import normalize_title  # Import normalization function for consistency
import hashlib


logger = logging.getLogger(__name__)
CACHE_TTL_MINUTES = 60

class NewsAPIView(APIView):
    """
    Unified endpoint for fetching news.
    Checks the local database first. If data is stale or missing,
    attempts to fetch from external APIs in fallback order.
    """
    def get(self, request):
        symbol = request.query_params.get('symbol', 'IBM')
        cutoff = timezone.now() - timezone.timedelta(minutes=CACHE_TTL_MINUTES)
        local_data = ProcessedNews.objects.filter(symbol=symbol, updated_at__gte=cutoff)
        if local_data.exists():
            serializer = ProcessedNewsSerializer(local_data, many=True)
            logger.info("Serving %s news from local DB for symbol %s", local_data.count(), symbol)
            return Response(serializer.data)

       # Fallback chain: try external APIs in order
        news_items = fetch_alpha(symbol)
        if not news_items:
            logger.warning("Alpha Vantage returned no data for %s, trying Finnhub.", symbol)
            news_items = fetch_finnhub(symbol)
        if not news_items:
            logger.warning("Finnhub returned no data for %s, trying Yahoo Finance.", symbol)
            news_items = fetch_yahoo(symbol)

        if not news_items:
            logger.error("No news items found for symbol %s from any source.", symbol)
            return Response([])  # or return an error response

        records = []
        for item in news_items:
            # Normalize the title and compute title_hash to ensure uniqueness
            title_raw = item.get('title', '')
            title_norm = normalize_title(title_raw)
            title_hash = hashlib.sha256(title_norm.encode('utf-8')).hexdigest()

            # Ensure source matches allowed choices: 'alpha', 'yahoo', 'finnhub', or default to 'other'
            source = item.get('source', '').lower()
            if source not in ['alpha', 'yahoo', 'finnhub']:
                source = 'other'

            # Update or create the news record using title_hash and symbol as the unique key
            record, _ = ProcessedNews.objects.update_or_create(
                title_hash=title_hash,
                symbol=symbol,
                defaults={
                    'title': title_raw,
                    'summary': item.get('summary', ''),
                    'source': source,
                    'published_at': item.get('published_at') or timezone.now(),
                    'sentiment': item.get('sentiment', 'neutral'),
                    'confidence': item.get('confidence', 0.5),
                    'raw_data': item,
                    # updated_at is auto-managed, so it is not set manually here
                }
            )
            records.append(record)

        serializer = ProcessedNewsSerializer(records, many=True)
        logger.info("Fetched and stored %d news items for symbol %s", len(records), symbol)
        return Response(serializer.data)