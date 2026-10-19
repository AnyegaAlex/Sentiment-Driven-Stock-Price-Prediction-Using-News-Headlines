# tests/news/test_ingestion.py
import pytest
import time
from unittest.mock import patch
from news.services.ingestion import IngestionService

@pytest.mark.django_db
class TestIngestionService:

    @patch('news.services.ingestion.ProcessedNews.objects.bulk_create')
    @patch('news.services.ingestion.analyze_sentiment')
    def test_ingestion_uses_bulk_create(self, mock_sentiment, mock_bulk_create):
        # Setup mock
        mock_sentiment.return_value = {"label": "positive", "score": 0.9}
        
        # ✅ FIX: Use current time (timezone.now) instead of 2023
        import datetime
        from django.utils import timezone
        now_ts = int(timezone.now().timestamp())
        
        raw_articles = [
            {
                "title": f"Test Article {i}", 
                "datetime": now_ts - (i * 60), # 0 to 5 minutes ago
                "url": f"https://example.com/{i}"
            } for i in range(5)
        ]
        
        # Run service
        new_count, dup_count = IngestionService.process_and_save("AAPL", raw_articles)
        
        # Assertions
        assert new_count == 5
        assert dup_count == 0
        
        # CRITICAL: Ensure bulk_create was called exactly ONCE, not 5 times
        assert mock_bulk_create.call_count == 1
        
        # Verify the items passed to bulk_create
        args, kwargs = mock_bulk_create.call_args
        assert len(args[0]) == 5
        assert kwargs['ignore_conflicts'] is True

    def test_ingestion_filters_old_articles(self):
        """Ensure articles older than 24h are ignored."""
        from django.utils import timezone
        old_ts = int((timezone.now() - timezone.timedelta(days=5)).timestamp())
        
        raw_articles = [
            {"title": "Old News", "datetime": old_ts, "url": "https://example.com/old"}
        ]
        
        new_count, dup_count = IngestionService.process_and_save("AAPL", raw_articles)
        assert new_count == 0
        assert dup_count == 0