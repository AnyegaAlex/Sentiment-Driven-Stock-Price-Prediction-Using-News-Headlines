"""
P0 remediation tests: prediction integrity, account isolation, licensed-news gate,
and the single email sender for the weekly digest. Each class covers failure cases.
"""
from datetime import date
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from django.urls import reverse

from stocks.lstm_predictor import _lstm_unavailable
from stocks.models import Prediction

from tests.factories import authenticate_api_client

pytestmark = pytest.mark.django_db


def make_pred(**overrides):
    fields = dict(
        date=date.today(),
        stock_symbol="AAPL",
        headline="headline",
        sentiment_score=0.1,
        predicted_movement="up",
        confidence=0.6,
        source="lstm",
    )
    fields.update(overrides)
    return Prediction.objects.create(**fields)


class TestPredictionIntegrity:
    def test_unavailable_result_is_not_success_and_has_no_values(self):
        r = _lstm_unavailable("Model not loaded")
        assert r["success"] is False
        assert r["prediction"] is None
        assert r["confidence"] is None
        assert r["unavailable"] is True

    @override_settings(PREDICTION_GENERATION_ENABLED=True)
    def test_generate_predictions_never_saves_sentiment_fallback(self):
        fallback = {
            "success": True,
            "fallback": True,
            "prediction": "HOLD",
            "confidence": 50.0,
            "sentiment_score": 0.0,
            "message": "Using sentiment-based fallback",
        }
        with patch("stocks.management.commands.generate_predictions.get_lstm_predictor") as gp:
            gp.return_value.predict.return_value = fallback
            call_command("generate_predictions")
        assert not Prediction.objects.filter(source="lstm").exists()

    @override_settings(PREDICTION_GENERATION_ENABLED=True)
    def test_generate_predictions_saves_genuine_lstm_result(self):
        genuine = {
            "success": True,
            "fallback": False,
            "prediction": "UP",
            "confidence": 71.2,
            "sentiment_score": 0.2,
            "close_price": 190.5,
        }
        with patch("stocks.management.commands.generate_predictions.get_lstm_predictor") as gp:
            gp.return_value.predict.return_value = genuine
            call_command("generate_predictions")
        assert Prediction.objects.filter(source="lstm", predicted_movement="up").exists()


class TestPredictionAuthorization:
    def test_history_rejects_anonymous(self, api_client):
        r = api_client.get(reverse("prediction-history"))
        assert r.status_code in (401, 403)

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=True)
    def test_history_hides_other_users_predictions(self, auth_client, user, foreign_user):
        make_pred(user=foreign_user, headline="foreign-private")
        make_pred(user=None, headline="system-row")
        r = auth_client.get(reverse("prediction-history"))
        assert r.status_code == 200
        headlines = [row["headline"] if "headline" in row else "" for row in r.json()["results"]]
        assert "foreign-private" not in str(r.json())
        assert "system-row" in str(r.json())

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=True)
    def test_history_cache_is_per_user(self, api_client, user, foreign_user):
        make_pred(user=foreign_user, headline="foreign-private")
        authenticate_api_client(api_client, foreign_user)
        api_client.get(reverse("prediction-history"))  # warms cache for foreign_user
        authenticate_api_client(api_client, user)
        r = api_client.get(reverse("prediction-history"))
        assert "foreign-private" not in str(r.json())

    def test_shap_rejects_anonymous(self, api_client):
        pred = make_pred(user=None)
        r = api_client.get(reverse("shap", args=[pred.id]))
        assert r.status_code in (401, 403)

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=True)
    def test_shap_404_for_other_users_prediction(self, api_client, user, foreign_user):
        pred = make_pred(user=foreign_user)
        authenticate_api_client(api_client, user)
        r = api_client.get(reverse("shap", args=[pred.id]))
        assert r.status_code == 404

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=True)
    def test_shap_owner_can_read_own_prediction(self, api_client, foreign_user):
        pred = make_pred(user=foreign_user)
        authenticate_api_client(api_client, foreign_user)
        r = api_client.get(reverse("shap", args=[pred.id]))
        assert r.status_code == 200

    def test_drift_rejects_anonymous(self, api_client):
        r = api_client.get(reverse("drift"))
        assert r.status_code in (401, 403)

    def test_predictions_list_rejects_anonymous(self, api_client):
        r = api_client.get(reverse("predictions"))
        assert r.status_code in (401, 403)


class TestLicensedNewsGate:
    @override_settings(NEWS_PUBLIC_ACCESS=False)
    def test_anonymous_news_is_unavailable_when_gate_closed(self, api_client):
        r = api_client.get(reverse("get-news"), {"symbol": "AAPL"})
        assert r.status_code == 503

    @override_settings(NEWS_PUBLIC_ACCESS=True)
    def test_anonymous_news_served_when_gate_open(self, api_client):
        r = api_client.get(reverse("get-news"), {"symbol": "AAPL"})
        assert r.status_code == 200

    @override_settings(NEWS_PUBLIC_ACCESS=False, FINNHUB_API_KEY="test-key")
    def test_symbol_search_makes_no_provider_call_for_public_user(self, api_client):
        with patch("news.views.requests.get") as get:
            api_client.get(reverse("symbol-search"), {"q": "apple"})
        get.assert_not_called()

    @override_settings(NEWS_INGESTION_ENABLED=False)
    def test_fetch_news_is_a_noop_when_ingestion_disabled(self):
        with patch("news.management.commands.fetch_news.ProviderManager") as pm:
            call_command("fetch_news")
        pm.assert_not_called()


class TestDigestSender:
    def test_digest_uses_single_sync_sender(self):
        import stocks.management.commands.send_weekly_digest as digest
        assert hasattr(digest, "send_email_sync")
        assert not hasattr(digest, "send_email_async")


class TestPriceDataGate:
    @override_settings(PRICE_DATA_PUBLIC_ACCESS=False)
    def test_technical_indicators_closed_to_public_without_provider_call(self, api_client):
        with patch("stocks.views.get_technical_indicators") as get_tech:
            r = api_client.get(reverse("technical-indicators"), {"symbol": "AAPL"})
        assert r.status_code == 503
        get_tech.assert_not_called()

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=False)
    def test_stock_analysis_never_serves_cached_technicals_to_public(self, api_client):
        from django.core.cache import cache
        cache.set("stock_analysis_AAPL_medium_medium-term",
                  {"technicalIndicators": {"currentPrice": 123.4}, "dataStatus": {"technicals": "live"}},
                  timeout=60)
        with patch("stocks.views.get_technical_indicators") as get_tech:
            r = api_client.get(reverse("stock-analysis"), {"symbol": "AAPL"})
        assert r.status_code == 200
        get_tech.assert_not_called()
        assert "123.4" not in r.content.decode()
        assert "disabled" in r.content.decode()

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=False)
    def test_staff_still_reaches_technicals_when_gate_closed(self, api_client, admin_user):
        authenticate_api_client(api_client, admin_user)
        with patch("stocks.views.get_technical_indicators", return_value={"current_price": 1.0}) as get_tech:
            r = api_client.get(reverse("technical-indicators"), {"symbol": "AAPL"})
        assert r.status_code == 200
        get_tech.assert_called_once()

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=True)
    def test_public_reaches_technicals_when_gate_open(self, api_client):
        with patch("stocks.views.get_technical_indicators", return_value=None) as get_tech:
            r = api_client.get(reverse("technical-indicators"), {"symbol": "AAPL"})
        assert r.status_code == 200
        get_tech.assert_called_once()


class TestDerivedNewsAndPriceExposure:
    @override_settings(NEWS_PUBLIC_ACCESS=False, PRICE_DATA_PUBLIC_ACCESS=False)
    def test_sentiment_endpoint_closed_to_public_when_news_gate_closed(self, api_client):
        r = api_client.get(reverse("sentiment-analysis"), {"symbol": "AAPL"})
        assert r.status_code == 503

    @override_settings(NEWS_PUBLIC_ACCESS=False, PRICE_DATA_PUBLIC_ACCESS=True)
    def test_stock_analysis_reports_news_disabled_for_public(self, api_client):
        from news.models import ProcessedNews  # noqa: F401  (ensures model import)
        with patch("stocks.views.get_technical_indicators", return_value=None):
            r = api_client.get(reverse("stock-analysis"), {"symbol": "AAPL"})
        assert r.status_code == 200
        assert '"news": "disabled"' in r.content.decode().replace(" ", "") or '"news":"disabled"' in r.content.decode().replace(" ", "")

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=False, NEWS_PUBLIC_ACCESS=True)
    def test_stock_opinion_hides_price_from_public_when_price_gate_closed(self, api_client):
        make_pred(user=None, price_at_prediction=190.5, source="lstm")
        r = api_client.get(reverse("stock-opinion"), {"symbol": "AAPL"})
        assert r.status_code == 200
        assert "190.5" not in r.content.decode()


def _payload(response):
    body = response.json()
    return body.get("data", body) if isinstance(body, dict) else body


class TestDerivedOutputGate:
    @pytest.fixture(autouse=True)
    def _gates_closed(self, settings):
        settings.PRICE_DATA_PUBLIC_ACCESS = False
        settings.NEWS_PUBLIC_ACCESS = False

    def test_lstm_predict_blocked_for_anonymous_when_price_closed(self, api_client):
        make_pred(user=None, predicted_movement="up")
        r = api_client.get(reverse("lstm-predict"), {"symbol": "AAPL"})
        assert r.status_code == 503
        assert "UP" not in r.content.decode()

    def test_lstm_predict_ignores_cached_prediction_when_price_closed(self, api_client):
        cache.set("lstm_AAPL", {"symbol": "AAPL", "prediction": "UP", "success": True}, timeout=300)
        try:
            r = api_client.get(reverse("lstm-predict"), {"symbol": "AAPL"})
            assert r.status_code == 503
            assert "UP" not in r.content.decode()
        finally:
            cache.delete("lstm_AAPL")

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=True)
    def test_lstm_predict_served_when_price_open(self, api_client):
        make_pred(user=None, predicted_movement="up")
        r = api_client.get(reverse("lstm-predict"), {"symbol": "AAPL"})
        assert r.status_code == 200
        assert _payload(r)["prediction"] == "UP"

    def test_authenticated_non_staff_blocked_when_price_closed(self, auth_client):
        make_pred(user=None)
        assert auth_client.get(reverse("predictions")).status_code == 503
        assert auth_client.get(reverse("drift")).status_code == 503
        assert auth_client.get(reverse("prediction-history")).status_code == 503

    def test_shap_blocked_for_non_staff_owner_when_price_closed(self, api_client, foreign_user):
        pred = make_pred(user=foreign_user)
        authenticate_api_client(api_client, foreign_user)
        assert api_client.get(reverse("shap", args=[pred.id])).status_code == 503

    def test_staff_bypass_is_served_when_price_closed(self, api_client, admin_user):
        make_pred(user=None, predicted_movement="up")
        authenticate_api_client(api_client, admin_user)
        r = api_client.get(reverse("lstm-predict"), {"symbol": "AAPL"})
        assert r.status_code == 200

    def test_performance_blocked_for_anonymous_when_price_closed(self, api_client):
        assert api_client.get(reverse("performance")).status_code == 503

    @override_settings(PRICE_DATA_PUBLIC_ACCESS=True)
    def test_performance_served_when_price_open(self, api_client):
        assert api_client.get(reverse("performance")).status_code == 200

    def test_legacy_stock_opinion_hides_prediction_when_price_closed(self, api_client):
        make_pred(user=None, predicted_movement="up", confidence=0.7)
        r = api_client.get(reverse("stock-opinion"), {"symbol": "AAPL"})
        assert r.status_code == 200
        analysis = r.json()["analysis"]
        assert analysis["recommendation"] is None
        assert analysis["confidence"] is None
        assert analysis["current_price"] is None

    @override_settings(NEWS_PUBLIC_ACCESS=False)
    def test_stock_analysis_hides_lstm_block_when_price_closed(self, api_client):
        make_pred(user=None, predicted_movement="up", confidence=0.7)
        r = api_client.get(reverse("stock-analysis"), {"symbol": "AAPL"})
        assert r.status_code == 200
        data = _payload(r)
        assert data["recommendation"] is None
        assert data["confidence"] is None
        assert data["dataStatus"]["prediction"] == "disabled"
        assert data["lstm_prediction"]["direction"] is None

    @override_settings(NEWS_PUBLIC_ACCESS=False)
    def test_stock_analysis_cache_not_served_when_price_closed(self, api_client):
        cache.set("stock_analysis_AAPL_medium_medium-term", {"recommendation": "BUY"}, timeout=300)
        try:
            r = api_client.get(reverse("stock-analysis"), {"symbol": "AAPL"})
            assert "BUY" not in r.content.decode()
        finally:
            cache.delete("stock_analysis_AAPL_medium_medium-term")


class TestCIPredictionGuard:
    @override_settings(PREDICTION_GENERATION_ENABLED=False)
    def test_generate_predictions_is_noop_by_default(self):
        with patch("stocks.management.commands.generate_predictions.get_lstm_predictor") as gp:
            call_command("generate_predictions")
        gp.assert_not_called()
        assert not Prediction.objects.filter(source="lstm").exists()

    def test_prediction_workflow_job_is_gated_off_by_default(self):
        from pathlib import Path

        wf = Path(__file__).resolve().parents[2] / ".github" / "workflows" / "prediction_pipeline.yml"
        text = wf.read_text()
        assert "vars.PREDICTION_PIPELINE_ENABLED == 'true'" in text
        assert "if: ${{ vars.PREDICTION_PIPELINE_ENABLED == 'true' }}" in text
