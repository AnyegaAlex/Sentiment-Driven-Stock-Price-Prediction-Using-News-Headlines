"""
Tier 12: End-to-End Journeys

Tests complete user flows with mocks for external dependencies.
All tests reflect the intended behavior after fixing email-sending transaction bug.
"""
import pandas as pd
import json
import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.test import APIClient

from authentication.models import User

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_data():
    return {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "SecurePass123!",
        "password2": "SecurePass123!",
        "first_name": "Test",
        "last_name": "User",
    }


@pytest.fixture
def registered_user(user_data):
    user = User.objects.create_user(
        username=user_data["username"],
        email=user_data["email"],
        password=user_data["password"],
        first_name=user_data["first_name"],
        last_name=user_data["last_name"],
        email_verified=False,
    )
    return user


class TestFullUserJourney:
    @patch("authentication.views.send_verification_email", return_value=True)
    def test_registration_success(self, mock_send_email, api_client, user_data):
        """Even if email sends, user is created."""
        register_url = reverse("register")
        response = api_client.post(
            register_url,
            data=json.dumps(user_data),
            content_type="application/json"
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]

        user = User.objects.get(email=user_data["email"])
        assert user.email_verified is False

    @patch("authentication.views.send_verification_email", return_value=False)
    def test_registration_with_email_failure(self, mock_send_email, api_client, user_data):
        """Even if email sending fails, user is still created."""
        register_url = reverse("register")
        response = api_client.post(
            register_url,
            data=json.dumps(user_data),
            content_type="application/json"
        )
        assert response.status_code == 201
        user = User.objects.get(email=user_data["email"])
        assert user is not None

    def test_email_verification(self, api_client, user_data):
        """Verify email via token."""
        register_url = reverse("register")
        response = api_client.post(
            register_url,
            data=json.dumps(user_data),
            content_type="application/json"
        )
        assert response.status_code == 201
        user = User.objects.get(email=user_data["email"])

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        verify_url = reverse("verify-email")
        response = api_client.get(verify_url, {"token": token, "uid": uid})
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["message"] == "Email verified successfully"
        user.refresh_from_db()
        assert user.email_verified is True

    @patch("authentication.views.send_verification_email", return_value=True)
    @patch("stocks.lstm_predictor.LSTMPredictor")  # patch the class, not the function
    @patch("yfinance.Ticker")
    @patch("yfinance.download")
    def test_full_journey(self, mock_download, mock_ticker, mock_lstm_class, mock_send_email, api_client, user_data):
        """
        Complete flow: register, verify, login, stock analysis, prediction history.
        """
        # Mock yfinance to return dummy data (just in case)
        mock_ticker.return_value.history.return_value = pd.DataFrame({
            "Close": [100] * 250,
            "High": [101] * 250,
            "Low": [99] * 250,
            "Volume": [1000] * 250
        })
        mock_download.return_value = pd.DataFrame({
            "Close": [100] * 250,
            "Volume": [1000] * 250
        })

        # Create a mock predictor instance that will be returned when the class is instantiated
        mock_predictor = MagicMock()
        mock_predictor.predict.return_value = {
            "prediction": "UP",
            "confidence": 80,
            "success": True,
            "sentiment_score": 0.3,
            "close_price": 116,
            "fallback": False,
            "message": "LSTM prediction successful"
        }
        # When LSTMPredictor() is called (by get_lstm_predictor), return this mock
        mock_lstm_class.return_value = mock_predictor

        # Register
        register_url = reverse("register")
        response = api_client.post(
            register_url,
            data=json.dumps(user_data),
            content_type="application/json"
        )
        assert response.status_code == 201
        user = User.objects.get(email=user_data["email"])

        # Verify
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        verify_url = reverse("verify-email")
        response = api_client.get(verify_url, {"token": token, "uid": uid})
        assert response.status_code == 200

        # Login
        login_url = reverse("login")
        login_data = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        response = api_client.post(
            login_url,
            data=json.dumps(login_data),
            content_type="application/json"
        )
        assert response.status_code == 200
        access_token = response.json()["data"]["access"]

        # Stock Analysis (other mocks)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        with patch("stocks.opinion_generator.generate_stock_opinion") as mock_opinion, \
            patch("stocks.views.get_technical_indicators") as mock_tech, \
            patch("stocks.views.get_sentiment_summary") as mock_sent:

            mock_opinion.return_value = {
                "company": "Apple Inc.",
                "analysis": {"recommendation": "BUY", "confidence": 85}
            }
            mock_tech.return_value = {
                "current_price": 116.16,
                "sma_50": 114.84,
                "sma_200": 111.81,
                "rsi": 70.8,
                "support": 110.35,
                "resistance": 121.97,
                "volume": 12424000,
            }
            mock_sent.return_value = {
                "overall": "Bullish",
                "score": 0.65,
                "recent_articles": 10,
                "source_stats": {},
                "history": []
            }

            analysis_url = reverse("stock-analysis")
            response = api_client.get(analysis_url, {"symbol": "AAPL"})
            assert response.status_code == 200

            from stocks.models import Prediction
            predictions = Prediction.objects.filter(stock_symbol="AAPL")  # not filtering by user
            assert predictions.count() == 1
            prediction = predictions.first()
            assert prediction.predicted_movement == "up"
            assert prediction.confidence == 0.8

            # Prediction history
            history_url = reverse("prediction-history")
            response = api_client.get(history_url, {"symbol": "AAPL", "limit": 10})
            assert response.status_code == 200
            data = response.json()
            found = any(item["id"] == prediction.id for item in data["results"])
            assert found is True

    @patch("authentication.utils.send_email_async", return_value=True)
    @patch("authentication.views.send_verification_email", return_value=True)
    def test_password_reset_flow(self, mock_send_verification, mock_send_email, api_client, registered_user):
        """
        Password reset: request → confirm (uid in body and query) → login with new password.
        """
        user = registered_user
        user.email_verified = True
        user.save()

        # Request reset
        reset_request_url = reverse("password-reset")
        response = api_client.post(
            reset_request_url,
            data=json.dumps({"email": user.email}),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.json()
        assert "Password reset email sent" in data["message"]

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Confirm reset: uid is required in body (serializer) and in query (view).
        reset_confirm_url = reverse("reset-password-confirm") + f"?uid={uid}"
        new_password = "NewSecurePass456!"
        response = api_client.post(
            reset_confirm_url,
            data=json.dumps({
                "uid": uid,  # include in body for serializer
                "token": token,
                "password": new_password,
                "password2": new_password,
            }),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Password reset successfully"

        # Login with new password
        login_url = reverse("login")
        login_data = {
            "username": user.username,
            "password": new_password
        }
        response = api_client.post(
            login_url,
            data=json.dumps(login_data),
            content_type="application/json"
        )
        assert response.status_code == 200
        assert "access" in response.json()["data"]

    @patch("authentication.views.send_account_deletion_confirmation", return_value=True)
    def test_account_deletion_flow(self, mock_send_deletion, api_client, user_data):
        """
        Account deletion: request → cancel (with blacklisted token → 401).
        """
        # Register and verify
        register_url = reverse("register")
        response = api_client.post(
            register_url,
            data=json.dumps(user_data),
            content_type="application/json"
        )
        assert response.status_code == 201
        user = User.objects.get(email=user_data["email"])

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        verify_url = reverse("verify-email")
        api_client.get(verify_url, {"token": token, "uid": uid})

        # Login
        login_url = reverse("login")
        login_data = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        response = api_client.post(
            login_url,
            data=json.dumps(login_data),
            content_type="application/json"
        )
        assert response.status_code == 200
        access_token = response.json()["data"]["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Request deletion
        delete_url = reverse("delete-account")
        response = api_client.post(
            delete_url,
            data=json.dumps({"password": user_data["password"], "confirm": "DELETE"}),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Account deletion scheduled"
        user.refresh_from_db()
        assert user.is_active is False

        # Cancel deletion – token is blacklisted, so 401 is correct
        cancel_url = reverse("cancel-deletion")
        response = api_client.post(cancel_url, content_type="application/json")
        assert response.status_code == 401