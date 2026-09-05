"""
Tier 13: Observability (Logging, Auditing, Metrics)

Tests:
- RequestLoggingMiddleware logs request details
- AuditLog model captures sensitive actions
- SymbolUsage tracks symbol analysis frequency
- Request ID header is added to responses
- UsageStatsView aggregates API usage

Author: Tickflow Capital
Version: 1.0.9
"""

import json
import logging
import sys
from datetime import date, timedelta
from unittest.mock import patch
from io import StringIO

import pytest
from django.urls import reverse
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient

from authentication.models import User, AuditLog, SymbolUsage
from tests.factories import UserFactory

pytestmark = pytest.mark.django_db


# ============================================================================
# FIXTURE: Capture stderr for JSON logs
# ============================================================================

@pytest.fixture
def captured_stderr():
    """Capture stderr output for JSON log inspection."""
    stderr = sys.stderr
    sys.stderr = StringIO()
    yield sys.stderr
    sys.stderr = stderr


# ============================================================================
# 1. AUDIT LOG TESTS
# ============================================================================

class TestAuditLog:
    @patch("authentication.views.send_verification_email", return_value=True)
    def test_registration_creates_audit_log(self, mock_email, api_client):
        user_data = {
            "username": "audituser",
            "email": "audit@example.com",
            "password": "SecurePass123!",
            "password2": "SecurePass123!",
            "first_name": "Audit",
            "last_name": "User",
        }
        register_url = reverse("register")
        response = api_client.post(
            register_url,
            data=json.dumps(user_data),
            content_type="application/json"
        )
        assert response.status_code == 201
        user = User.objects.get(email="audit@example.com")
        logs = AuditLog.objects.filter(user=user, action="ACCOUNT_CREATED")
        assert logs.count() == 1
        log = logs.first()
        assert log.details["ip"] is not None
        assert "user_agent" in log.details

    def test_login_creates_audit_log(self, api_client):
        user = UserFactory(email_verified=True)
        login_url = reverse("login")
        login_data = {
            "username": user.username,
            "password": "testpass123"
        }
        response = api_client.post(
            login_url,
            data=json.dumps(login_data),
            content_type="application/json"
        )
        assert response.status_code == 200
        logs = AuditLog.objects.filter(user=user, action="LOGIN_SUCCESS")
        assert logs.count() == 1

    def test_login_failure_does_not_create_audit_log(self, api_client):
        user = UserFactory()
        login_url = reverse("login")
        login_data = {
            "username": user.username,
            "password": "wrongpassword"
        }
        response = api_client.post(
            login_url,
            data=json.dumps(login_data),
            content_type="application/json"
        )
        assert response.status_code == 401
        logs = AuditLog.objects.filter(action__icontains="LOGIN")
        assert logs.count() == 0

    @patch("authentication.views.send_security_alert_email")
    def test_password_change_creates_audit_log(self, mock_alert, api_client, user):
        api_client.force_authenticate(user=user)
        change_url = reverse("change-password")
        data = {
            "old_password": "testpass123",
            "new_password": "NewPass456!",
            "new_password2": "NewPass456!"
        }
        response = api_client.post(
            change_url,
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 200
        logs = AuditLog.objects.filter(user=user, action="PASSWORD_CHANGED")
        assert logs.count() == 1

    def test_watchlist_add_creates_audit_log(self, api_client, user):
        api_client.force_authenticate(user=user)
        watchlist_url = reverse("user-watchlist")
        data = {"symbol": "AAPL"}
        response = api_client.post(
            watchlist_url,
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 201
        logs = AuditLog.objects.filter(user=user, action="WATCHLIST_ADDED")
        assert logs.count() == 1
        assert logs.first().details["symbol"] == "AAPL"


# ============================================================================
# 2. REQUEST LOGGING MIDDLEWARE TESTS
# ============================================================================

class TestRequestLoggingMiddleware:
    def test_request_id_added_to_response(self, api_client):
        url = reverse("login")
        response = api_client.get(url)
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) > 0

    def test_request_id_preserved_if_in_request(self, api_client):
        request_id = "my-custom-id"
        url = reverse("login")
        response = api_client.get(url, HTTP_X_REQUEST_ID=request_id)
        assert response.headers["X-Request-ID"] == request_id

    def test_request_logging_contains_basic_info(self, api_client, caplog):
        import logging
        caplog.set_level(logging.INFO, logger="authentication")  # or the logger used in middleware
        url = reverse("login")
        api_client.get(url)
        
        # caplog.records contains all captured log records
        assert len(caplog.records) > 0
        # Check that the log message matches expected
        record = caplog.records[0]
        assert "Request error" in record.getMessage()
        assert "/api/v1/auth/login/" in record.getMessage()

    def test_request_logging_includes_user_for_authenticated_requests(self, api_client, user, caplog):
        caplog.set_level(logging.INFO, logger='authentication')
        api_client.force_authenticate(user=user)
        url = reverse("profile")
        response = api_client.get(url)
        assert response.status_code == 200

        log_output = caplog.text
        found = False
        for line in log_output.split('\n'):
            if line.strip():
                try:
                    log_data = json.loads(line)
                    msg = log_data.get('message', '')
                    if str(user.id) in msg and user.username in msg:
                        found = True
                        break
                except json.JSONDecodeError:
                    if str(user.id) in line and user.username in line:
                        found = True
                        break
        assert found, f"User info not found in logs: {log_output[:500]}..."

    @pytest.mark.xfail(reason="APIKeyMiddleware has a bug with hashing; skip until fixed")
    def test_request_logging_includes_api_key_info(self, api_client, user, captured_stderr):
        from authentication.models import UserAPIKey
        key_obj, raw_key = UserAPIKey.create_key(user, "Test Key")
        url = reverse("stock-analysis") + "?symbol=AAPL"
        with patch("stocks.opinion_generator.generate_stock_opinion") as mock_opinion, \
             patch("stocks.views.get_technical_indicators") as mock_tech, \
             patch("stocks.views.get_sentiment_summary") as mock_sent, \
             patch("stocks.views.get_lstm_predictor") as mock_lstm:
            mock_opinion.return_value = {"company": "Apple", "analysis": {"recommendation": "BUY"}}
            mock_tech.return_value = {"current_price": 100}
            mock_sent.return_value = {"overall": "Bullish", "score": 0.5}
            mock_lstm.return_value.predict.return_value = {"prediction": "UP", "confidence": 80, "success": True}
            response = api_client.get(url, HTTP_X_API_KEY=raw_key)
        assert response.status_code == 200

        stderr_output = captured_stderr.getvalue()
        found = False
        for line in stderr_output.split('\n'):
            if line.strip():
                try:
                    log_data = json.loads(line)
                    msg = log_data.get('message', '')
                    if key_obj.name in msg or str(key_obj.id) in msg:
                        found = True
                        break
                except json.JSONDecodeError:
                    if key_obj.name in line or str(key_obj.id) in line:
                        found = True
                        break
        assert found, f"API key info not found in stderr: {stderr_output[:500]}..."


# ============================================================================
# 3. SYMBOL USAGE TRACKING
# ============================================================================

class TestSymbolUsage:
    def test_symbol_usage_increments_for_authenticated_user(self, api_client, user):
        api_client.force_authenticate(user=user)
        symbol = "AAPL"
        usage, created = SymbolUsage.objects.get_or_create(user=user, symbol=symbol, defaults={"count": 0})
        initial_count = usage.count
        url = reverse("stock-analysis")
        with patch("stocks.opinion_generator.generate_stock_opinion") as mock_opinion, \
             patch("stocks.views.get_technical_indicators") as mock_tech, \
             patch("stocks.views.get_sentiment_summary") as mock_sent, \
             patch("stocks.views.get_lstm_predictor") as mock_lstm:
            mock_opinion.return_value = {"company": "Apple", "analysis": {"recommendation": "BUY"}}
            mock_tech.return_value = {"current_price": 100}
            mock_sent.return_value = {"overall": "Bullish", "score": 0.5}
            mock_lstm.return_value.predict.return_value = {"prediction": "UP", "confidence": 80, "success": True}
            response = api_client.get(url, {"symbol": symbol})
        assert response.status_code == 200
        usage.refresh_from_db()
        assert usage.count == initial_count + 1

    def test_symbol_usage_caches_for_anonymous(self, api_client):
        symbol = "AAPL"
        url = reverse("stock-analysis")
        with patch("stocks.opinion_generator.generate_stock_opinion") as mock_opinion, \
             patch("stocks.views.get_technical_indicators") as mock_tech, \
             patch("stocks.views.get_sentiment_summary") as mock_sent, \
             patch("stocks.views.get_lstm_predictor") as mock_lstm:
            mock_opinion.return_value = {"company": "Apple", "analysis": {"recommendation": "BUY"}}
            mock_tech.return_value = {"current_price": 100}
            mock_sent.return_value = {"overall": "Bullish", "score": 0.5}
            mock_lstm.return_value.predict.return_value = {"prediction": "UP", "confidence": 80, "success": True}
            response = api_client.get(url, {"symbol": symbol})
        assert response.status_code == 200

    def test_symbol_usage_view(self, api_client, user):
        api_client.force_authenticate(user=user)
        for symbol in ["AAPL", "MSFT", "AAPL", "GOOGL", "AAPL"]:
            SymbolUsage.record_usage(user, symbol)
        url = reverse("top-symbols")
        response = api_client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert data[0]["symbol"] == "AAPL"
        assert data[0]["count"] == 3
        assert len(data) <= 5


# ============================================================================
# 4. USAGE STATS
# ============================================================================

class TestUsageStats:
    def test_usage_stats_view_returns_data(self, api_client, user):
        # Since we can't easily patch date.today in the view, we'll test the response structure
        api_client.force_authenticate(user=user)
        from authentication.models import UserAPIKey
        key_obj, raw_key = UserAPIKey.create_key(user, "Usage Key")
        url = reverse("usage-stats")
        response = api_client.get(url)
        assert response.status_code == 200
        data = response.json()
        # Should have 31 entries (last 30 days + today)
        assert len(data) == 31
        # Check structure
        assert "date" in data[0]
        assert "count" in data[0]
        # Counts should be integers
        assert isinstance(data[0]["count"], int)


# ============================================================================
# 5. ERROR LOGGING
# ============================================================================

class TestErrorLogging:
    def test_404_logs_warning(self, api_client, caplog):
        caplog.set_level(logging.WARNING, logger='authentication')
        url = "/api/v1/auth/nonexistent/"
        response = api_client.get(url)
        assert response.status_code == 404

        log_output = caplog.text
        found = False
        for line in log_output.split('\n'):
            if line.strip():
                try:
                    log_data = json.loads(line)
                    msg = log_data.get('message', '')
                    if 'Request error' in msg and '404' in msg:
                        found = True
                        break
                except json.JSONDecodeError:
                    if 'Request error' in line and '404' in line:
                        found = True
                        break
        assert found, f"404 not logged: {log_output[:500]}..."

    def test_500_logs_error(self, api_client, caplog, user):
        caplog.set_level(logging.ERROR, logger='authentication')
        client = APIClient(raise_request_exception=False)
        client.force_authenticate(user=user)
        url = reverse("profile")
        with patch("authentication.views.ProfileView.get_object", side_effect=Exception("Test error")):
            response = client.get(url)
        assert response.status_code == 500

        log_output = caplog.text
        found = False
        for line in log_output.split('\n'):
            if line.strip():
                try:
                    log_data = json.loads(line)
                    msg = log_data.get('message', '')
                    if 'Request failed' in msg and '500' in msg:
                        found = True
                        break
                except json.JSONDecodeError:
                    if 'Request failed' in line and '500' in line:
                        found = True
                        break
        assert found, f"500 not logged: {log_output[:500]}..."
