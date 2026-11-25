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
    def test_password_change_creates_audit_log(self, mock_alert, auth_client, user):
        change_url = reverse("change-password")
        data = {
            "old_password": "testpass123",
            "new_password": "NewPass456!",
            "new_password2": "NewPass456!"
        }
        response = auth_client.post(
            change_url,
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 200
        logs = AuditLog.objects.filter(user=user, action="PASSWORD_CHANGED")
        assert logs.count() == 1

    def test_watchlist_add_creates_audit_log(self, auth_client, user):
        watchlist_url = reverse("user-watchlist")
        data = {"symbol": "AAPL"}
        response = auth_client.post(
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

    def test_request_logging_contains_basic_info(self, api_client):
        url = reverse("login")
        with patch("authentication.middleware.logger.warning") as mock_warning:
            response = api_client.get(url)

        assert response.status_code == 405
        messages = [str(call.args[0]) for call in mock_warning.call_args_list]
        assert any("Request error" in message and "/api/v1/auth/login/" in message for message in messages)

    def test_request_logging_includes_user_for_authenticated_requests(self, auth_client, user):
        url = reverse("profile")
        with patch("authentication.middleware.logger.info") as mock_info:
            response = auth_client.get(url)

        assert response.status_code == 200
        messages = [str(call.args[0]) for call in mock_info.call_args_list]
        assert any(str(user.id) in message and user.username in message for message in messages)

    def test_request_logging_includes_api_key_info(self, api_client, user):
        from authentication.models import UserAPIKey

        key_obj, raw_key = UserAPIKey.create_key(user, "Logging Test Key")
        url = reverse("stock-analysis") + "?symbol=AAPL"
        with patch("authentication.middleware.logger.info") as mock_info:
            response = api_client.get(url, HTTP_X_API_KEY=raw_key)

        assert response.status_code == 200
        messages = [str(call.args[0]) for call in mock_info.call_args_list]
        assert any(key_obj.name in message and str(key_obj.id) in message for message in messages)
# ============================================================================
# 3. SYMBOL USAGE TRACKING
# ============================================================================

class TestSymbolUsage:
    def test_symbol_usage_increments_for_authenticated_user(self, auth_client, user):
        symbol = "AAPL"
        usage, created = SymbolUsage.objects.get_or_create(
            user=user, symbol=symbol, defaults={"count": 0}
        )
        initial_count = usage.count
        response = auth_client.get(reverse("stock-analysis"), {"symbol": symbol})

        assert response.status_code == 200
        usage.refresh_from_db()
        assert usage.count == initial_count + 1

    def test_symbol_usage_caches_for_anonymous(self, api_client):
        response = api_client.get(reverse("stock-analysis"), {"symbol": "AAPL"})

        assert response.status_code == 200
        assert cache.get("symbol_usage_anon_AAPL") == 1

    def test_symbol_usage_view(self, auth_client, user):
        for symbol in ["AAPL", "MSFT", "AAPL", "GOOGL", "AAPL"]:
            SymbolUsage.record_usage(user, symbol)
        response = auth_client.get(reverse("top-symbols"))

        assert response.status_code == 200
        data = response.json()
        assert data[0]["symbol"] == "AAPL"
        assert data[0]["count"] == 3
        assert len(data) <= 5
# ============================================================================
# 4. USAGE STATS
# ============================================================================

class TestUsageStats:
    def test_usage_stats_view_returns_data(self, auth_client):
        # Since we can't easily patch date.today in the view, we'll test the response structure
        url = reverse("usage-stats")
        response = auth_client.get(url)
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
    def test_404_logs_warning(self, api_client, user):
        from authentication.models import UserAPIKey

        _, raw_key = UserAPIKey.create_key(user, "404 Logging Test")
        api_client.credentials(HTTP_X_API_KEY=raw_key)
        with patch("authentication.middleware.logger.warning") as mock_warning:
            response = api_client.get("/api/v1/auth/nonexistent/")

        assert response.status_code == 404
        messages = [str(call.args[0]) for call in mock_warning.call_args_list]
        assert any("Request error" in message and "404" in message for message in messages)

    def test_500_logs_error(self, user):
        from authentication.models import UserAPIKey

        client = APIClient(raise_request_exception=False)
        _, raw_key = UserAPIKey.create_key(user, "500 Logging Test")
        client.credentials(HTTP_X_API_KEY=raw_key)
        with patch("authentication.views.ProfileView.get_object", side_effect=Exception("Test error")):
            with patch("authentication.middleware.logger.error") as mock_error:
                response = client.get(reverse("profile"))

        assert response.status_code == 500
        messages = [str(call.args[0]) for call in mock_error.call_args_list]
        assert any("Request failed" in message and "500" in message for message in messages)
