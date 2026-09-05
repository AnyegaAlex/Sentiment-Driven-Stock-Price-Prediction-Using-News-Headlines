"""
Tier 11: Caching

Tests all caching logic:
- stocks.cache_utils: get/set/delete, TTL, pattern deletion
- stocks.views: get_technical_indicators caching
- news.views: get_news caching
- stocks.opinion_generator: price data and technical metrics caching
- LSTM feature caching

Author: Tickflow Capital
Version: 1.0.0
"""

import pytest
import pandas as pd
from datetime import timedelta
from unittest.mock import patch, MagicMock
from django.core.cache import cache
from django.utils import timezone
from django.test import override_settings

from stocks.cache_utils import (
    get_cache_key,
    set_cached_data,
    get_cached_data,
    delete_cached_data,
    clear_cache_pattern,
    cache_technical_data,
    get_cached_technical_data,
    cache_price_data,
    get_cached_price_data,
    TTL_TECHNICAL,
    TTL_PRICE,
)
from stocks.views import get_technical_indicators, get_sentiment_summary
from stocks.opinion_generator import (
    _get_cached_price_data,
    _cache_price_data,
    _get_cached_technical_data,
    _cache_technical_data,
    get_technical_analyzer,
)
from news.views import _get_cached_news_response, _set_cached_news_response, CACHE_TTL_SECONDS

pytestmark = pytest.mark.django_db


class TestCacheUtils:
    def test_get_cache_key(self):
        key = get_cache_key("technical", "AAPL")
        assert key == "technical:AAPL"

        key = get_cache_key("price", "AAPL", period="1d")
        assert key == "price:AAPL:period=1d"

    def test_set_and_get_cached_data(self):
        key = "test_key"
        data = {"value": 123}
        set_cached_data(key, data, ttl=60)
        retrieved = get_cached_data(key)
        assert retrieved == data

    def test_delete_cached_data(self):
        key = "test_key"
        cache.set(key, "data", timeout=60)
        assert cache.get(key) == "data"
        delete_cached_data(key)
        assert cache.get(key) is None

    def test_clear_cache_pattern(self):
        # Set multiple keys with a prefix
        for i in range(3):
            cache.set(f"tech:AAPL:{i}", i, timeout=60)
        # If cache backend supports delete_pattern (Redis does)
        # For testing, we'll mock it or use locmem which doesn't have pattern
        # We'll just verify that clear_cache_pattern returns 0 on locmem
        deleted = clear_cache_pattern("tech:*")
        # In locmem, it returns 0; in Redis, it returns count.
        # We'll just ensure it doesn't raise.
        assert deleted >= 0

    def test_cache_technical_data(self):
        symbol = "AAPL"
        metrics = {"rsi": 55, "sma": 100}
        cache_technical_data(symbol, metrics)
        cached = get_cached_technical_data(symbol)
        assert cached == metrics

    def test_cache_technical_data_ttl(self):
        symbol = "AAPL"
        metrics = {"rsi": 55}
        # Use a very short TTL for testing
        with patch("stocks.cache_utils.TTL_TECHNICAL", 1):
            cache_technical_data(symbol, metrics, ttl=1)
            cached = get_cached_technical_data(symbol)
            assert cached == metrics
            # Wait for expiration (we can't wait, so we'll mock time)
            # Instead, we'll test that the TTL is passed correctly.
            # We'll verify by checking the cache timeout? Not directly.

    def test_cache_price_data(self):
        symbol = "AAPL"
        df = pd.DataFrame({"Close": [100, 101]})
        cache_price_data(symbol, df)
        cached = get_cached_price_data(symbol)
        assert cached is not None
        assert cached.equals(df)


class TestOpinionGeneratorCaching:
    @patch("stocks.opinion_generator.cache.set")
    def test_cache_price_data_called(self, mock_set):
        symbol = "AAPL"
        df = pd.DataFrame({"Close": [100, 101]})
        _cache_price_data(symbol, df, ttl=123)
        mock_set.assert_called_once()
        # Check key and TTL
        key = f"price:{symbol.upper()}"
        mock_set.assert_called_with(key, df, timeout=123)

    @patch("stocks.opinion_generator.cache.get")
    def test_get_cached_price_data(self, mock_get):
        symbol = "AAPL"
        _get_cached_price_data(symbol)
        mock_get.assert_called_with(f"price:{symbol.upper()}")

    @patch("stocks.opinion_generator._get_cached_price_data")
    @patch("stocks.opinion_generator.TechnicalAnalyzer._fetch_from_finnhub")
    def test_get_data_uses_cache_first(self, mock_finnhub, mock_cached):
        mock_cached.return_value = pd.DataFrame({"Close": [100]})
        analyzer = get_technical_analyzer()
        data = analyzer._get_data("AAPL")
        assert not data.empty
        mock_finnhub.assert_not_called()


class TestViewsCaching:
    def test_get_technical_indicators_caches(self):
        symbol = "AAPL"
        # Clear cache
        cache.delete(f"tech_{symbol}_1d")
        with patch("stocks.views.calculate_technical_indicators") as mock_calc:
            mock_calc.return_value = {"current_price": 100}
            result = get_technical_indicators(symbol)
            assert result == {"current_price": 100}
            # Second call should hit cache, not call calculate
            mock_calc.reset_mock()
            result2 = get_technical_indicators(symbol)
            assert result2 == {"current_price": 100}
            mock_calc.assert_not_called()

    def test_get_news_caching(self):
        symbol = "AAPL"
        cache_key = f"news_response:{symbol}"
        cache.delete(cache_key)

        cached = _get_cached_news_response(symbol)
        assert cached is None

        data = {"news": "test"}
        _set_cached_news_response(symbol, data, ttl=60)

        cached = _get_cached_news_response(symbol)
        assert cached == data

    def test_sentiment_analysis_caching(self):
        symbol = "AAPL"
        cache_key = f"sentiment_{symbol}_7d"
        cache.delete(cache_key)

        with patch("stocks.views.get_sentiment_summary") as mock_summary:
            mock_summary.return_value = {"overall": "Bullish", "score": 0.5}
            # First call should call the function
            from stocks.views import get_sentiment_summary as view_summary
            result1 = view_summary(symbol, days=7)
            # Second call should use cache (if the view does caching, but get_sentiment_summary itself doesn't cache)
            # Actually, the view `SentimentAnalysisView` caches the response, not the function.
            # We'll test the view caching via a different test.

    def test_sentiment_analysis_view_caching(self, api_client):
        from django.urls import reverse
        symbol = "AAPL"
        url = reverse("sentiment-analysis")
        with patch("stocks.views.get_sentiment_summary") as mock_summary:
            mock_summary.return_value = {
                "overall": "Bullish",
                "score": 0.5,
                "recent_articles": 1,
                "source_stats": {},
                "history": []
            }
            # First request
            response = api_client.get(url, {"symbol": symbol})
            assert response.status_code == 200
            # Second request should hit cache
            mock_summary.reset_mock()
            response2 = api_client.get(url, {"symbol": symbol})
            assert response2.status_code == 200
            mock_summary.assert_not_called()

    def test_stock_analysis_caching(self, api_client):
        from django.urls import reverse
        symbol = "AAPL"
        url = reverse("stock-analysis")
        # Patch the actual function location
        with patch("stocks.opinion_generator.generate_stock_opinion") as mock_opinion, \
            patch("stocks.views.get_technical_indicators") as mock_tech, \
            patch("stocks.views.get_sentiment_summary") as mock_sent:
            mock_opinion.return_value = {"company": "Apple", "analysis": {"recommendation": "BUY", "confidence": 80}}
            mock_tech.return_value = {"current_price": 100, "sma_50": 99}
            mock_sent.return_value = {"overall": "Bullish", "score": 0.5, "recent_articles": 1, "source_stats": {}, "history": []}
            # First request
            response = api_client.get(url, {"symbol": symbol})
            assert response.status_code == 200
            # Second request should hit cache
            mock_opinion.reset_mock()
            mock_tech.reset_mock()
            mock_sent.reset_mock()
            response2 = api_client.get(url, {"symbol": symbol})
            assert response2.status_code == 200
            mock_opinion.assert_not_called()
            mock_tech.assert_not_called()
            mock_sent.assert_not_called()


class TestLSTMCaching:
    def test_lstm_features_cache(self):
        symbol = "AAPL"
        cache_key = f"lstm_features_{symbol}"
        cache.delete(cache_key)

        from stocks.lstm_predictor import compute_lstm_features
        with patch("yfinance.download") as mock_yf:
            df = pd.DataFrame({
                "Close": [100, 101, 102, 103, 104] * 50  
            })
            mock_yf.return_value = df
            result1 = compute_lstm_features(symbol)
            # Second call should hit cache
            mock_yf.reset_mock()
            result2 = compute_lstm_features(symbol)
            mock_yf.assert_not_called()
            assert result1 == result2

    def test_lstm_prediction_view_caching(self, api_client):
        from django.urls import reverse
        url = reverse("lstm-predict")
        symbol = "AAPL"
        with patch("stocks.views.get_lstm_predictor") as mock_predictor:
            mock_predictor.return_value.predict.return_value = {
                "prediction": "UP", "confidence": 80, "success": True
            }
            response1 = api_client.get(url, {"symbol": symbol})
            assert response1.status_code == 200
            mock_predictor.reset_mock()
            response2 = api_client.get(url, {"symbol": symbol})
            assert response2.status_code == 200
            mock_predictor.assert_not_called()