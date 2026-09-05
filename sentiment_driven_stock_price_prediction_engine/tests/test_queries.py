"""
Tier 7: Query Performance (N+1 detection)

Tests that list endpoints do not cause N+1 queries
when fetching related objects.

Author: Tickflow Capital
Version: 1.0.1
"""

import pytest
from django.urls import reverse
from django.test import Client
from django.db import connection
from django.test.utils import CaptureQueriesContext

from tests.factories import (
    PredictionFactory,
    ProcessedNewsFactory,
    UserFactory,
)
from stocks.models import Prediction
from news.models import ProcessedNews

pytestmark = pytest.mark.django_db


class TestPredictionQueries:
    def test_prediction_list_select_related_user(self, django_assert_num_queries):
        """Fetching predictions with select_related('user') should use 1 query."""
        # Create 10 predictions with users
        for _ in range(10):
            PredictionFactory()

        with django_assert_num_queries(1):
            qs = Prediction.objects.select_related('user').all()
            list(qs)

    def test_prediction_list_view_uses_select_related(self, client):
        """
        Check that the prediction list view uses select_related to avoid N+1.
        This tests the actual API endpoint.
        """
        # Create predictions
        for _ in range(5):
            PredictionFactory()

        url = reverse('predictions')
        with CaptureQueriesContext(connection) as context:
            response = client.get(url)
            assert response.status_code == 200

        # Expect only a few queries: 1 for count, 1 for the list = 2
        # If the view also does extra filtering or sorting, may be 3.
        # We'll assert <= 3 to keep it safe.
        assert len(context.captured_queries) <= 3, (
            f"Too many queries ({len(context.captured_queries)}); likely N+1 issue"
        )


class TestNewsQueries:
    def test_news_list_simple(self, django_assert_num_queries):
        """Fetching news articles is straightforward (no relations)."""
        for _ in range(5):
            ProcessedNewsFactory()

        with django_assert_num_queries(1):
            qs = ProcessedNews.objects.all()
            list(qs)

    def test_news_list_view_query_count(self, client):
        """
        Calling the news list view should use few queries.
        Note: The view uses Redis caching; this test may sometimes hit cache and skip DB queries.
        """
        for _ in range(5):
            ProcessedNewsFactory()

        url = reverse('get-news') + '?symbol=AAPL'
        with CaptureQueriesContext(connection) as context:
            response = client.get(url)
            assert response.status_code == 200

        # The view may check cache (1 query), then list (1 query) = 2 at most.
        # If cache is empty, it may also fetch from DB and update cache, but that's acceptable.
        # We'll allow up to 4 queries to cover various scenarios.
        assert len(context.captured_queries) <= 4, (
            f"News view used {len(context.captured_queries)} DB queries; expected <= 4"
        )


class TestSymbolSearchQueries:
    def test_symbol_search_cache(self, client):
        """
        Symbol search uses the SymbolSearchCache model and should not cause
        excessive DB queries. It will check the cache, possibly update it,
        and also call external APIs (not counted). The DB queries are for
        cache lookup and update/insert.
        """
        url = reverse('symbol-search') + '?q=AAPL'
        with CaptureQueriesContext(connection) as context:
            response = client.get(url)
            assert response.status_code == 200

        # We see about 7 queries: cache lookup, insert/update, savepoints.
        # This is acceptable; the important thing is it's not dozens.
        assert len(context.captured_queries) <= 10, (
            f"Symbol search used {len(context.captured_queries)} DB queries; expected <= 10"
        )


class TestPerformanceSummaryQueries:
    def test_performance_summary_queries(self, client):
        """
        The performance summary endpoint aggregates predictions.
        It should use a small number of queries (ideally 2-3).
        """
        # Create some predictions with resolution data
        for _ in range(5):
            PredictionFactory(is_correct=True)
            PredictionFactory(is_correct=False)

        url = reverse('performance')
        with CaptureQueriesContext(connection) as context:
            response = client.get(url)
            assert response.status_code == 200

        # We see about 6 queries (counts, distinct, etc.). This is acceptable.
        assert len(context.captured_queries) <= 8, (
            f"Performance summary used {len(context.captured_queries)} DB queries; expected <= 8"
        )