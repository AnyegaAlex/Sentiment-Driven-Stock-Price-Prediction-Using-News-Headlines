"""
Tests for stock views: analysis, technicals, predictions, etc.
Uses pytest and Django test client.

P1 rewrite: protected endpoints are called with an authenticated client; price- and
news-derived responses are tested with the gates open (explicit override) and with
the gates closed (503 / disabled states). No fallback values are expected anywhere.

Author: Tickflow Capital
Version: 1.1.0
"""

import json
import os
import pandas as pd
import numpy as np
import pytest
from datetime import timedelta, datetime
from unittest.mock import patch, MagicMock
from django.urls import reverse
from django.core.cache import cache
from django.utils import timezone
from django.test import Client, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    authenticate_api_client,
    UserFactory,
    PredictionFactory,
    SubscriptionFactory,
)
from stocks.models import Prediction, Subscription
from authentication.models import User

pytestmark = pytest.mark.django_db

# Gates opened explicitly for tests of price- or news-derived responses.
GATES_OPEN = dict(PRICE_DATA_PUBLIC_ACCESS=True, NEWS_PUBLIC_ACCESS=True)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    """Unauthenticated client."""
    return Client()


@pytest.fixture
def auth_client(user):
    """Authenticated DRF client. The API authenticates with JWT, so force_authenticate is used."""
    client = APIClient()
    authenticate_api_client(client, user)
    return client


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def another_user():
    return UserFactory()


@pytest.fixture
def prediction(user):
    return PredictionFactory(user=user)


@pytest.fixture
def predictions_for_user(user):
    """Create 10 predictions for a user."""
    predictions = []
    for i in range(10):
        pred = PredictionFactory(
            user=user,
            stock_symbol="AAPL",
            created_at=timezone.now() - timedelta(days=i),
            is_correct=True if i % 2 == 0 else False,
        )
        predictions.append(pred)
    return predictions


# ============================================================================
# 1. Stock Analysis Endpoint
# ============================================================================

class TestStockAnalysis:
    def test_analysis_requires_symbol(self, api_client):
        """GET without symbol returns 400."""
        url = reverse("stock-analysis")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "error" in data

    @override_settings(**GATES_OPEN)
    def test_analysis_no_data_reports_unavailable_without_fallback(self, api_client):
        """With gates open but no provider data and no stored prediction, nothing is invented."""
        url = reverse("stock-analysis")
        with patch("stocks.views.get_technical_indicators", return_value=None), \
             patch("stocks.views.get_sentiment_summary", return_value={
                 "overall": "Neutral", "score": 0.0, "recent_articles": 0,
                 "source_stats": {}, "history": []}):
            response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]
        assert data["symbol"] == "AAPL"
        assert data["lstm_prediction"]["direction"] is None
        assert data["recommendation"] is None
        assert data["dataStatus"]["technicals"] == "unavailable"
        assert data["dataStatus"]["prediction"] == "unavailable"
        assert "UNAVAILABLE" not in response.content.decode()

    @override_settings(**GATES_OPEN)
    def test_analysis_caching_skips_provider_on_second_call(self, api_client):
        """A complete response is cached; the second call does not recompute technicals."""
        url = reverse("stock-analysis")
        with patch("stocks.views.get_technical_indicators", return_value={"current_price": 104.0}) as tech, \
             patch("stocks.views.get_sentiment_summary", return_value={
                 "overall": "Neutral", "score": 0.0, "recent_articles": 0,
                 "source_stats": {}, "history": []}):
            first = api_client.get(url, {"symbol": "AAPL"})
            second = api_client.get(url, {"symbol": "AAPL"})
        assert first.status_code == 200
        assert second.status_code == 200
        assert tech.call_count == 1

    def test_analysis_closed_gates_disable_price_and_news(self, api_client):
        """Gates closed (default): technicals and news are disabled and nothing is cached."""
        url = reverse("stock-analysis")
        with patch("stocks.views.get_technical_indicators") as tech, \
             patch("stocks.views.get_sentiment_summary", return_value={
                 "overall": "Bullish", "score": 0.9, "recent_articles": 12,
                 "source_stats": {}, "history": []}):
            response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]
        assert data["dataStatus"]["technicals"] == "disabled"
        assert data["dataStatus"]["news"] == "disabled"
        assert data["sentiment"]["recent_articles"] == 0
        assert data["sentiment"]["overall"] is None
        tech.assert_not_called()

    @override_settings(**GATES_OPEN)
    def test_analysis_provider_error_returns_500_not_fallback(self, api_client):
        """If the analysis build fails, the endpoint reports an error rather than fallback data."""
        url = reverse("stock-analysis")
        with patch("stocks.views.get_technical_indicators", side_effect=Exception("API error")):
            response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "UNAVAILABLE" not in response.content.decode()


# ============================================================================
# 2. Technical Indicators Endpoint
# ============================================================================

class TestTechnicalIndicators:
    def test_technical_requires_symbol(self, api_client):
        url = reverse("technical-indicators")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(**GATES_OPEN)
    def test_technical_valid_symbol(self, api_client):
        """Valid symbol returns technical data produced by the provider chain."""
        url = reverse("technical-indicators")
        with patch("stocks.views.get_technical_indicators",
                   return_value={"current_price": 104.0, "sma_50": 102.0}):
            response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]
        assert data["status"] == "live"
        assert data["technical"]["current_price"] == 104.0

    @override_settings(**GATES_OPEN)
    def test_technical_no_live_data_is_unavailable_not_fabricated(self, api_client):
        """When the provider chain has no data, the response carries no technical values."""
        url = reverse("technical-indicators")
        with patch("stocks.views.get_technical_indicators", return_value=None):
            response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]
        assert data["technical"] is None
        assert data["status"] == "unavailable"

    def test_technical_closed_gate_returns_503(self, api_client):
        """Price gate closed: no provider call and a 503 with code 5031."""
        url = reverse("technical-indicators")
        with patch("stocks.views.get_technical_indicators") as tech:
            response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.json()["code"] == 5031
        tech.assert_not_called()


# ============================================================================
# 3. Prediction History (Paginated) - authenticated, price gate open
# ============================================================================

class TestPredictionHistory:
    def test_history_requires_authentication(self, api_client):
        """Prediction history is account-scoped and rejects anonymous callers."""
        url = reverse("prediction-history")
        response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    @override_settings(**GATES_OPEN)
    def test_history_returns_predictions(self, auth_client, user, predictions_for_user):
        url = reverse("prediction-history")
        response = auth_client.get(url, {"symbol": "AAPL", "limit": 5})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] >= len(predictions_for_user)
        assert len(data["results"]) <= 5

    @override_settings(**GATES_OPEN)
    def test_history_filters_by_symbol(self, auth_client, user):
        PredictionFactory(user=user, stock_symbol="AAPL")
        PredictionFactory(user=user, stock_symbol="MSFT")
        url = reverse("prediction-history")
        response = auth_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == 200
        data = response.json()
        results = data["results"]
        assert all(item["stock_symbol"] == "AAPL" for item in results)

    @override_settings(**GATES_OPEN)
    def test_history_pagination(self, auth_client, user, predictions_for_user):
        url = reverse("prediction-history")
        response = auth_client.get(url, {"symbol": "AAPL", "limit": 3, "offset": 0})
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 3
        assert data["count"] == len(predictions_for_user)
        assert data["next"] == 3

    def test_history_closed_gate_returns_503_for_authenticated_user(self, auth_client, user):
        response = auth_client.get(reverse("prediction-history"), {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


# ============================================================================
# 4. Symbols List
# ============================================================================

class TestSymbolsList:
    def test_symbols_list(self, api_client):
        url = reverse("symbols")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["symbol"] == "AAPL"
        assert data[0]["name"] == "Apple Inc."

    def test_symbols_list_cached(self, api_client):
        url = reverse("symbols")
        response1 = api_client.get(url)
        assert response1.status_code == 200
        response2 = api_client.get(url)
        assert response2.status_code == 200


# ============================================================================
# 5. Subscription
# ============================================================================

class TestSubscription:
    def test_subscribe_valid_email(self, api_client):
        url = reverse("subscribe")
        data = {"email": "test@example.com"}
        response = api_client.post(url, data, content_type="application/json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Subscription.objects.filter(email="test@example.com", is_active=True).exists()

    def test_subscribe_duplicate_active(self, api_client):
        Subscription.objects.create(email="test@example.com", is_active=True)
        url = reverse("subscribe")
        data = {"email": "test@example.com"}
        response = api_client.post(url, data, content_type="application/json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # The ModelSerializer uniqueness validation returns "Validation failed"
        error_msg = response.json()["error"]
        # It might be a string or dict; we check the common error message
        assert "Validation failed" in error_msg or "already subscribed" in error_msg

    def test_subscribe_reactivate_inactive(self, api_client):
        """An inactive subscriber who re-subscribes is reactivated (view contract)."""
        Subscription.objects.create(email="test@example.com", is_active=False)
        url = reverse("subscribe")
        data = {"email": "test@example.com"}
        response = api_client.post(url, data, content_type="application/json")
        assert response.status_code == status.HTTP_200_OK
        assert Subscription.objects.get(email="test@example.com").is_active is True

    def test_subscribe_invalid_email(self, api_client):
        url = reverse("subscribe")
        data = {"email": "not-an-email"}
        response = api_client.post(url, data, content_type="application/json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = response.json().get("errors", {})
        assert "email" in errors


# ============================================================================
# 6. LSTM Prediction - reads stored predictions, price gate applies
# ============================================================================

class TestLSTMPrediction:
    def test_lstm_requires_symbol(self, api_client):
        url = reverse("lstm-predict")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(**GATES_OPEN)
    def test_lstm_returns_stored_prediction(self, api_client):
        Prediction.objects.create(
            date=timezone.now().date(), stock_symbol="AAPL", headline="h",
            sentiment_score=0.3, predicted_movement="up", confidence=0.75, source="lstm",
        )
        url = reverse("lstm-predict")
        response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]
        assert data["prediction"] == "UP"
        assert data["confidence"] == 75.0

    @override_settings(**GATES_OPEN)
    def test_lstm_without_stored_prediction_is_unavailable_not_hold(self, api_client):
        """No stored prediction: unavailable status with no prediction value (no HOLD fallback)."""
        url = reverse("lstm-predict")
        response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()["data"]
        assert data["status"] == "unavailable"
        assert data["prediction"] is None
        assert "HOLD" not in response.content.decode()

    def test_lstm_closed_gate_returns_503(self, api_client):
        Prediction.objects.create(
            date=timezone.now().date(), stock_symbol="AAPL", headline="h",
            sentiment_score=0.3, predicted_movement="up", confidence=0.75, source="lstm",
        )
        response = api_client.get(reverse("lstm-predict"), {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "UP" not in response.content.decode()


# ============================================================================
# 7. Sentiment Analysis - news gate applies
# ============================================================================

class TestSentimentAnalysis:
    def test_sentiment_requires_symbol(self, api_client):
        url = reverse("sentiment-analysis")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(**GATES_OPEN)
    @patch("stocks.views.get_sentiment_summary")
    def test_sentiment_valid_symbol(self, mock_sentiment, api_client):
        mock_sentiment.return_value = {
            "overall": "Bullish",
            "score": 0.65,
            "recent_articles": 10,
            "source_stats": {"tier1_count": 3, "reliability_sum": 9.0, "tier1_sources": ["Reuters"]},
            "history": [{"date": "2026-07-14T00:00:00Z", "score": 0.6}]
        }
        url = reverse("sentiment-analysis")
        response = api_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["sentiment"]["label"] == "Bullish"
        assert data["data"]["news_count"] == 10

    @override_settings(**GATES_OPEN)
    def test_sentiment_no_articles_is_neutral_and_zero(self, api_client):
        url = reverse("sentiment-analysis")
        response = api_client.get(url, {"symbol": "INVALID"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["sentiment"]["label"] == "Neutral"
        assert data["data"]["news_count"] == 0

    def test_sentiment_closed_gate_returns_503(self, api_client):
        with patch("stocks.views.get_sentiment_summary") as mock_sentiment:
            response = api_client.get(reverse("sentiment-analysis"), {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.json()["code"] == 5030
        mock_sentiment.assert_not_called()


# ============================================================================
# 8. Prediction CRUD (Predictions List and Detail) - authenticated
# ============================================================================

class TestPredictionCRUD:
    @override_settings(**GATES_OPEN)
    def test_predictions_list_filtering(self, auth_client, user):
        PredictionFactory(user=user, stock_symbol="AAPL")
        PredictionFactory(user=user, stock_symbol="MSFT")
        url = reverse("predictions")
        response = auth_client.get(url, {"symbol": "AAPL"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["results"][0]["stock_symbol"] == "AAPL"

    @override_settings(**GATES_OPEN)
    def test_predictions_list_dates(self, auth_client, user):
        PredictionFactory(user=user, date=datetime(2026, 7, 10))
        url = reverse("predictions")
        response = auth_client.get(url, {"date_from": "2026-07-09"})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    @override_settings(**GATES_OPEN)
    def test_performance_summary(self, api_client, user):
        # Performance aggregates use system-generated (user NULL) predictions only.
        PredictionFactory(user=None, is_correct=True, resolution_date=timezone.now() - timedelta(days=1))
        PredictionFactory(user=None, is_correct=False, resolution_date=timezone.now() - timedelta(days=2))
        url = reverse("performance")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "overall" in data
        assert "accuracy" in data["overall"]

    def test_performance_closed_gate_returns_503(self, api_client):
        assert api_client.get(reverse("performance")).status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    @override_settings(**GATES_OPEN)
    def test_drift_detection(self, auth_client):
        url = reverse("drift")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "drift_detected" in data

    def test_drift_requires_authentication(self, api_client):
        response = api_client.get(reverse("drift"))
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    @override_settings(**GATES_OPEN)
    def test_shap_explanation(self, auth_client, user, prediction):
        url = reverse("shap", args=[prediction.id])
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == prediction.id
        assert data["stock_symbol"] == prediction.stock_symbol

    @override_settings(**GATES_OPEN)
    def test_shap_not_found(self, auth_client):
        url = reverse("shap", args=[99999])
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ============================================================================
# 9. Cron Endpoint - deprecated; must do nothing
# ============================================================================

class TestCronEndpoint:
    def test_cron_is_gone_regardless_of_secret(self, api_client, prediction):
        before = Prediction.objects.count()
        with patch.dict(os.environ, {"CRON_SECRET": "valid-secret"}):
            for params in ({}, {"secret": "wrong"}, {"secret": "valid-secret"}):
                response = api_client.get(reverse("cron_resolve"), params)
                assert response.status_code == status.HTTP_410_GONE
        assert Prediction.objects.count() == before

    def test_cron_post_is_gone(self, api_client):
        response = api_client.post(reverse("cron_resolve"), {}, content_type="application/json")
        assert response.status_code == status.HTTP_410_GONE
