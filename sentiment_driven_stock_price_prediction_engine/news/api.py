# news/api.py
import logging
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import ProcessedNews
from .serializers import ProcessedNewsSerializer
from .external_apis import fetch_alpha, fetch_finnhub, fetch_yahoo

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

        # Fallback chain
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
            # Update or create based on a unique key: here using symbol and title.
            # Consider using a hash field if titles may vary slightly.
            record, _ = ProcessedNews.objects.update_or_create(
                symbol=symbol,
                title=item.get('title'),
                defaults={
                    'summary': item.get('summary', ''),
                    'source': item.get('source', 'Unknown'),
                    'published_at': item.get('published_at') or timezone.now(),
                    'sentiment': item.get('sentiment', 'neutral'),
                    'confidence': item.get('confidence', 0.5),
                    'raw_data': item,
                    'updated_at': timezone.now(),
                }
            )
            records.append(record)

        serializer = ProcessedNewsSerializer(records, many=True)
        logger.info("Fetched and stored %d news items for symbol %s", len(records), symbol)
        return Response(serializer.data)
