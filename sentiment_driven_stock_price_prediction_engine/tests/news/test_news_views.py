"""
Tests for news views: get_news, symbol_search, get_analyzed_news.
Uses pytest and Django test client.

Author: Tickflow Capital
Version: 2.0.0
"""

import json
import pytest
from datetime import timedelta
from unittest.mock import patch, MagicMock
from django.urls import reverse
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from django.test import Client

from tests.factories import ProcessedNewsFactory
from news.models import ProcessedNews, SymbolSearchCache
from news.serializers import ProcessedNewsSerializer
from news.views import CACHE_TTL_SECONDS, MAX_ARTICLES, fetch_and_save_news

pytestmark = pytest.mark.django_db


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    """Unauthenticated client for public endpoints."""
    return Client()


@pytest.fixture
def mock_news_data():
    """Sample raw news data from external APIs."""
    return [
        {
            "title": "Apple stock rises on strong earnings",
            "summary": "Apple reported record revenue and profit.",
            "provider": "Reuters",
            "source_name": "Reuters",
            "url": "https://example.com/article1",
            "published_at": "2025-01-15T10:00:00Z",
            "banner_image_url": "https://example.com/img1.jpg",
        },
        {
            "title": "iPhone demand soars",
            "summary": "New iPhone models drive growth.",
            "provider": "Bloomberg",
            "source_name": "Bloomberg",
            "url": "https://example.com/article2",
            "published_at": "2025-01-14T14:30:00Z",
            "banner_image_url": "https://example.com/img2.jpg",
        },
    ]


@pytest.fixture
def existing_news():
    """Create sample news articles in DB for a symbol."""
    symbol = "AAPL"
    articles = []
    for i in range(5):
        articles.append(
            ProcessedNewsFactory(
                symbol=symbol,
                title=f"News {i}",
                published_at=timezone.now() - timedelta(days=i),
                sentiment="positive" if i % 2 == 0 else "negative",
                confidence=0.8,
            )
        )
    return symbol, articles


@pytest.fixture
def mock_fetch_and_save_news():
    """Mock fetch_and_save_news to return a success dict."""
    with patch('news.views.fetch_and_save_news') as mock:
        mock.return_value = {
            'status': 'success',
            'symbol': 'AAPL',
            'fetched': 10,
            'new_articles': 5,
            'duplicates': 0,
            'cache_hit': False,
        }
        yield mock


@pytest.fixture
def mock_requests_get():
    """Mock requests.get for symbol_search."""
    with patch('news.views.requests.get') as mock_get:
        yield mock_get


# ============================================================================
# Tests for get_news
# ============================================================================

class TestGetNews:
    def test_get_news_missing_symbol(self, api_client):
        """Missing symbol returns 400."""
        url = reverse("get-news")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "error" in data
        error_msg = data["error"] if isinstance(data["error"], str) else data["error"].get("message", "")
        assert "symbol" in error_msg.lower()

    def test_get_news_invalid_symbol(self, api_client):
        """Invalid symbol format returns 400."""
        url = reverse("get-news")
        response = api_client.get(url, {"symbol": "AAPL!"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_news_cached_response(self, api_client, existing_news):
        """Return cached response if available and not stale."""
        symbol, articles = existing_news
        # Pre-cache a response
        cached_data = {
            "symbol": symbol,
            "refresh_queued": False,
            "cache_stale": False,
            "count": len(articles),
            "news": [{"id": a.id, "title": a.title} for a in articles],
        }
        cache_key = f"news_response:{symbol}"
        cache.set(cache_key, cached_data, timeout=60)

        url = reverse("get-news")
        response = api_client.get(url, {"symbol": symbol})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"] == cached_data

    @patch("news.views.fetch_and_save_news")
    def test_get_news_force_refresh(self, mock_fetch, api_client, existing_news):
        """force_refresh=True bypasses cache and fetches fresh."""
        symbol, articles = existing_news
        # Pre-cache something
        cache.set(f"news_response:{symbol}", {"old": "data"}, timeout=60)

        mock_fetch.return_value = {
            "status": "success",
            "new_articles": 2,
            "duplicates": 0,
            "cache_hit": False,
        }

        url = reverse("get-news")
        response = api_client.get(url, {"symbol": symbol, "refresh": "true"})
        assert response.status_code == status.HTTP_200_OK
        mock_fetch.assert_called_once_with(
            symbol,
            fetch_latest_only=True,
            recent_hours=24,
            timeout_seconds=15,
        )
        data = response.json()
        assert data["data"]["symbol"] == symbol
        cached = cache.get(f"news_response:{symbol}")
        assert cached is not None

    @patch("news.views.fetch_and_save_news")
    def test_get_news_stale_cache(self, mock_fetch, api_client, existing_news):
        """When cache is absent and articles are stale, fetch new data."""
        symbol, articles = existing_news
        # Make all articles older than CACHE_TTL
        for article in articles:
            article.created_at = timezone.now() - timedelta(hours=2)
            article.save()

        mock_fetch.return_value = {
            "status": "success",
            "new_articles": 1,
            "duplicates": 0,
            "cache_hit": False,
        }

        # Ensure no Redis cache
        cache.delete(f"news_response:{symbol}")

        url = reverse("get-news")
        response = api_client.get(url, {"symbol": symbol})
        assert response.status_code == status.HTTP_200_OK
        mock_fetch.assert_called_once()
        # After fetch, cache_stale should be False
        data = response.json()
        assert data["data"]["cache_stale"] is False

    @patch("news.views.fetch_and_save_news")
    def test_get_news_fetch_fails(self, mock_fetch, api_client, existing_news):
        """If fetch fails, return existing news and keep stale flag True."""
        symbol, articles = existing_news
        # Make articles stale so fetch is attempted
        for article in articles:
            article.created_at = timezone.now() - timedelta(hours=2)
            article.save()

        cache.delete(f"news_response:{symbol}")

        mock_fetch.return_value = {"status": "error", "message": "API failure"}

        url = reverse("get-news")
        response = api_client.get(url, {"symbol": symbol})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should still return existing articles (since we have some)
        assert data["data"]["count"] > 0
        assert data["data"]["cache_stale"] is True  # remains stale

    def test_get_news_no_articles(self, api_client):
        """If no articles exist, fetch tries to get some."""
        symbol = "AAPL"
        with patch("news.views.fetch_and_save_news") as mock_fetch:
            mock_fetch.return_value = {
                "status": "success",
                "new_articles": 0,
                "duplicates": 0,
                "cache_hit": False,
            }
            url = reverse("get-news")
            response = api_client.get(url, {"symbol": symbol})
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["data"]["count"] == 0
            assert data["data"]["cache_stale"] is True

    def test_get_news_returns_limited_articles(self, api_client):
        """Only up to MAX_ARTICLES are returned."""
        symbol = "AAPL"
        # Create more than MAX_ARTICLES
        for i in range(MAX_ARTICLES + 10):
            ProcessedNewsFactory(symbol=symbol, published_at=timezone.now() - timedelta(days=i))
        url = reverse("get-news")
        response = api_client.get(url, {"symbol": symbol})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["count"] == MAX_ARTICLES

    def test_get_news_serializes_correctly(self, api_client):
        """Check serialization format matches expected fields."""
        article = ProcessedNewsFactory(
            symbol='AAPL',
            title='Apple announces new product',
            summary='Apple announced a new product today.',
            url='https://example.com',
            provider='finnhub',
            source_name='Reuters',
            published_at=timezone.now() - timedelta(hours=2),
            sentiment='positive',
            confidence=0.85,
            sentiment_score=0.75,
            key_phrases='Apple, product',
            source_reliability=85,
            banner_image_url='https://example.com/image.jpg',
        )
        url = reverse("get-news")
        response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        news_item = data['data']['news'][0]
        expected_fields = [
            'id', 'symbol', 'title', 'summary', 'url', 'provider', 'source_name',
            'published_at', 'sentiment', 'confidence', 'sentiment_score',
            'key_phrases', 'source_reliability', 'banner_image_url'
        ]
        for field in expected_fields:
            assert field in news_item


# ============================================================================
# Tests for symbol_search
# ============================================================================

class TestSymbolSearch:
    def test_symbol_search_missing_query(self, api_client):
        """Missing 'q' returns 400."""
        url = reverse("symbol-search")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_symbol_search_db_cache_hit(self, api_client):
        """Return cached results from SymbolSearchCache if valid."""
        query = "AAPL"
        cached_results = [{"symbol": "AAPL", "name": "Apple Inc.", "region": "US"}]
        SymbolSearchCache.objects.create(
            query=query,
            results=cached_results,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        url = reverse("symbol-search")
        response = api_client.get(url, {"q": query})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"] == cached_results

    @patch("news.views.requests.get")
    def test_symbol_search_finnhub_success(self, mock_get, api_client):
        """Finnhub returns results and they are cached."""
        query = "AAPL"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "result": [
                {"symbol": "AAPL", "description": "Apple Inc.", "type": "US"},
                {"symbol": "AAPL34", "description": "Apple Inc.", "type": "Brazil"},
            ]
        }
        mock_get.return_value = mock_response

        url = reverse("symbol-search")
        with patch("news.views.settings.FINNHUB_API_KEY", "fake"):
            response = api_client.get(url, {"q": query})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 2
        assert data["data"][0]["symbol"] == "AAPL"
        cache_obj = SymbolSearchCache.objects.filter(query=query).first()
        assert cache_obj is not None
        assert cache_obj.results == data["data"]

    @patch("news.views.requests.get")
    def test_symbol_search_finnhub_fails_fallback_alpha_vantage(self, mock_get, api_client):
        """If Finnhub fails, fallback to Alpha Vantage."""
        query = "AAPL"
        def side_effect(url, **kwargs):
            if "finnhub" in url:
                mock_resp = MagicMock()
                mock_resp.status_code = 500
                return mock_resp
            elif "alphavantage" in url:
                mock_resp = MagicMock()
                mock_resp.status_code = 200
                mock_resp.json.return_value = {
                    "bestMatches": [
                        {"1. symbol": "AAPL", "2. name": "Apple Inc.", "3. region": "US"},
                    ]
                }
                return mock_resp
            return MagicMock(status_code=404)
        mock_get.side_effect = side_effect

        url = reverse("symbol-search")
        with patch("news.views.settings.FINNHUB_API_KEY", "fake"):
            with patch("news.views.settings.ALPHA_VANTAGE_KEY", "fake"):
                response = api_client.get(url, {"q": query})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["symbol"] == "AAPL"

    @patch("news.views.requests.get")
    def test_symbol_search_finnhub_alpha_fallback_to_rapidapi(self, mock_get, api_client):
        """If Finnhub and Alpha return nothing, try RapidAPI."""
        query = "AAPL"
        # Finnhub empty
        finnhub_resp = MagicMock(status_code=200, json=MagicMock(return_value={}))
        # Alpha empty
        alpha_resp = MagicMock(status_code=200, json=MagicMock(return_value={}))
        # RapidAPI returns results
        rapid_resp = MagicMock(status_code=200, json=MagicMock(return_value={
            "quotes": [{"symbol": "AAPL", "shortname": "Apple Inc.", "region": "US"}]
        }))
        mock_get.side_effect = [finnhub_resp, alpha_resp, rapid_resp]

        url = reverse("symbol-search")
        with patch("news.views.settings.FINNHUB_API_KEY", "fake"):
            with patch("news.views.settings.ALPHA_VANTAGE_KEY", "fake"):
                with patch("news.views.settings.RAPIDAPI_KEY", "fake"):
                    with patch("news.views.settings.RAPIDAPI_HOST", "fakehost"):
                        response = api_client.get(url, {"q": query})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["symbol"] == "AAPL"

    @patch("news.views.requests.get")
    def test_symbol_search_all_api_fail_static_fallback(self, mock_get, api_client):
        """If all APIs fail, return static fallback list."""
        query = "AAPL"
        mock_get.side_effect = Exception("API error")

        url = reverse("symbol-search")
        response = api_client.get(url, {"q": query})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) > 0
        symbols = [item["symbol"] for item in data["data"]]
        assert "AAPL" in symbols

    def test_symbol_search_cache_expired(self, api_client):
        """Expired cache is ignored and fresh search is performed."""
        query = "AAPL"
        SymbolSearchCache.objects.create(
            query=query,
            results=[{"symbol": "AAPL", "name": "Old", "region": "US"}],
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        with patch("news.views.requests.get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "result": [{"symbol": "AAPL", "description": "Apple Inc.", "type": "US"}]
            }
            url = reverse("symbol-search")
            with patch("news.views.settings.FINNHUB_API_KEY", "fake"):
                response = api_client.get(url, {"q": query})
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["data"][0]["name"] == "Apple Inc."

    def test_symbol_search_caches_results(self, api_client, mock_requests_get):
        """Results are cached after successful fetch."""
        mock_resp = MagicMock(status_code=200, json=MagicMock(return_value={
            "result": [{"symbol": "AAPL", "description": "Apple Inc.", "type": "US"}]
        }))
        mock_requests_get.return_value = mock_resp
        url = reverse("symbol-search")
        with patch("news.views.settings.FINNHUB_API_KEY", "fake"):
            response = api_client.get(url, {"q": "apple"})
        assert response.status_code == status.HTTP_200_OK
        cache_entry = SymbolSearchCache.objects.filter(query="apple").first()
        assert cache_entry is not None
        assert cache_entry.results == [{"symbol": "AAPL", "name": "Apple Inc.", "region": "US"}]


# ============================================================================
# Tests for get_analyzed_news (alias)
# ============================================================================

class TestGetAnalyzedNews:
    def test_get_analyzed_news_alias(self, api_client):
        """Alias endpoint should behave like get-news."""
        # Test that it returns 200 for a valid symbol and that fetch is attempted if needed.
        with patch("news.views.fetch_and_save_news") as mock_fetch:
            mock_fetch.return_value = {"status": "success", "new_articles": 1, "duplicates": 0}
            url = reverse("analyzed-news")
            response = api_client.get(url, {"symbol": "AAPL"})
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "data" in data
            assert data["data"]["symbol"] == "AAPL"

    def test_get_analyzed_news_invalid_symbol(self, api_client):
        """Invalid symbol returns 400."""
        url = reverse("analyzed-news")
        response = api_client.get(url, {"symbol": "INVALID!"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Valid" in response.json()["error"]


# ============================================================================
# Integration-like tests for fetch_and_save_news
# ============================================================================

class TestFetchAndSaveNews:
    def test_fetch_and_save_news_success(self):
        """Test fetch_and_save_news with mocked fetchers."""
        with patch('news.views._fetch_alpha_vantage') as mock_alpha:
            mock_alpha.return_value = [{'title': 'Test', 'published_at': timezone.now().isoformat()}]
            with patch('news.views.settings.ALPHA_VANTAGE_KEY', 'fake'):
                result = fetch_and_save_news('AAPL')
                assert result['status'] == 'success'
                assert result['symbol'] == 'AAPL'
                assert result['new_articles'] == 1

    def test_fetch_and_save_news_no_articles(self):
        """If no articles fetched, return error."""
        with patch('news.views._fetch_alpha_vantage', return_value=[]):
            with patch('news.views.settings.ALPHA_VANTAGE_KEY', 'fake'):
                result = fetch_and_save_news('AAPL')
                assert result['status'] == 'error'
                assert 'No articles fetched' in result['message']

    def test_fetch_and_save_news_db_cache_hit(self):
        """If recent articles exist, return cache_hit=True."""
        ProcessedNews.objects.create(
            symbol='AAPL',
            title='Recent article',
            title_hash='hash',
            published_at=timezone.now() - timedelta(hours=1),
            sentiment='neutral',
            confidence=0.5,
            provider='other',
        )
        result = fetch_and_save_news('AAPL')
        assert result['status'] == 'success'
        assert result['cache_hit'] is True
        assert result['new_articles'] == 0

    def test_fetch_and_save_news_missing_symbol(self):
        """Empty symbol returns error."""
        result = fetch_and_save_news('')
        assert result['status'] == 'error'
        assert 'Symbol required' in result['message']

    def test_fetch_and_save_news_no_fetchers(self):
        """If no API keys configured, return error."""
        with patch('news.views.settings.ALPHA_VANTAGE_KEY', None):
            with patch('news.views.settings.FINNHUB_API_KEY', None):
                with patch('news.views.settings.RAPIDAPI_KEY', None):
                    result = fetch_and_save_news('AAPL')
                    assert result['status'] == 'error'
                    assert 'No data sources' in result['message']

    def test_fetch_and_save_news_memory_error(self):
        """MemoryError is caught and returned as error."""
        with patch('news.views._fetch_alpha_vantage', side_effect=MemoryError):
            with patch('news.views.settings.ALPHA_VANTAGE_KEY', 'fake'):
                result = fetch_and_save_news('AAPL')
                assert result['status'] == 'error'
                assert 'Memory exhausted' in result['message']


# ============================================================================
# Edge cases & Unicode handling
# ============================================================================

def test_get_news_handles_unicode_symbol(api_client):
    """Symbol with unicode should be normalized (uppercase)."""
    symbol = "AAPL"
    ProcessedNewsFactory(symbol=symbol)
    url = reverse("get-news")
    response = api_client.get(url, {"symbol": "aapl"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["data"]["symbol"] == symbol

def test_symbol_search_handles_unicode(api_client):
    """Query with unicode should still work."""
    with patch("news.views.requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"result": []}
        url = reverse("symbol-search")
        response = api_client.get(url, {"q": "AAPL™"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data["data"], list)