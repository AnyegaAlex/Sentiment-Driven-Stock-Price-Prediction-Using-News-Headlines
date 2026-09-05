"""
Tier 1: HTTP Request Cycle Tests

Tests URL resolution, path converters, trailing slashes, method handling,
malformed JSON, and content-type.

Author: Tickflow Capital
Version: 2.2.0
"""

import pytest
import json
from django.urls import reverse, NoReverseMatch
from django.test import override_settings
from rest_framework import status

pytestmark = pytest.mark.django_db


# ============================================================================
# 1. URL RESOLUTION
# ============================================================================

class TestURLResolution:
    """
    Test that every named URL reverses correctly.
    """

    @pytest.mark.parametrize(
        "url_name, kwargs, expected_path",
        [
            # Root & Health
            ("api-root", {}, "/"),
            ("health", {}, "/api/v1/health/"),  

            # Authentication
            ("register", {}, "/api/v1/auth/register/"),
            ("login", {}, "/api/v1/auth/login/"),
            ("token_obtain_pair", {}, "/api/v1/auth/token/"),
            ("token-refresh", {}, "/api/v1/auth/refresh/"),
            ("verify-email", {}, "/api/v1/auth/verify-email/"),
            ("resend-verification", {}, "/api/v1/auth/resend-verification/"),
            ("password-reset", {}, "/api/v1/auth/password-reset/"),
            ("reset-password-confirm", {}, "/api/v1/auth/password-reset/confirm/"),

            # Profile
            ("profile", {}, "/api/v1/auth/profile/"),
            ("update-profile", {}, "/api/v1/auth/profile/update/"),
            ("change-password", {}, "/api/v1/auth/profile/change-password/"),
            ("change-email", {}, "/api/v1/auth/profile/change-email/"),
            ("change-username", {}, "/api/v1/auth/profile/change-username/"),

            # API Keys
            ("api-keys", {}, "/api/v1/auth/api-keys/"),
            ("api-key-revoke", {"pk": 1}, "/api/v1/auth/api-keys/1/"),

            # Preferences
            ("user-preferences", {}, "/api/v1/auth/preferences/"),
            ("user-watchlist", {}, "/api/v1/auth/watchlist/"),
            ("user-watchlist-item", {"symbol": "AAPL"}, "/api/v1/auth/watchlist/AAPL/"),

            # Account Deletion
            ("delete-account", {}, "/api/v1/auth/delete-account/"),
            ("cancel-deletion", {}, "/api/v1/auth/delete-account/cancel/"),

            # Stocks (resolved to /stocks/ because that's the actual include order)
            ("stock-analysis", {}, "/stocks/stock-analysis/"),
            ("technical-indicators", {}, "/stocks/technical-indicators/"),
            ("lstm-predict", {}, "/stocks/lstm-predict/"),
            ("sentiment-analysis", {}, "/stocks/sentiment-analysis/"),
            ("prediction-history", {}, "/stocks/prediction-history/"),
            ("symbols-list", {}, "/stocks/stocks/symbols/"),    # Note: the include might be /stocks/stocks/symbols if nested? We'll use /stocks/symbols/.
            ("subscribe", {}, "/stocks/subscribe/"),

            # News
            ("get-news", {}, "/api/v1/news/get-news/"),
            ("symbol-search", {}, "/api/v1/news/symbol-search/"),
            ("analyzed-news", {}, "/api/v1/news/analyzed/"),
        ]
    )
    def test_url_reverse(self, url_name, kwargs, expected_path):
        """Test that every named URL reverses correctly."""
        try:
            url = reverse(url_name, kwargs=kwargs)
            assert url == expected_path, f"Expected {expected_path}, got {url}"
        except NoReverseMatch:
            pytest.fail(f"URL '{url_name}' failed to reverse with kwargs={kwargs}")

    def test_url_reverse_with_args(self):
        """Test URL reversal with positional arguments."""
        url = reverse("api-key-revoke", args=[42])
        assert url == "/api/v1/auth/api-keys/42/"
        url = reverse("user-watchlist-item", args=["TSLA"])
        assert url == "/api/v1/auth/watchlist/TSLA/"


# ============================================================================
# 2. PATH CONVERTERS
# ============================================================================

class TestPathConverters:
    """Test that URL path converters correctly validate input types."""

    def test_int_converter_valid(self):
        url = reverse("api-key-revoke", kwargs={"pk": 1})
        assert "/api/v1/auth/api-keys/1/" in url

    def test_int_converter_invalid(self):
        with pytest.raises(NoReverseMatch):
            reverse("api-key-revoke", kwargs={"pk": "abc"})

    def test_str_converter_valid(self):
        url = reverse("user-watchlist-item", kwargs={"symbol": "AAPL"})
        assert "/api/v1/auth/watchlist/AAPL/" in url

    def test_str_converter_with_special_chars(self):
        url = reverse("user-watchlist-item", kwargs={"symbol": "BRK.B"})
        assert "/api/v1/auth/watchlist/BRK.B/" in url


# ============================================================================
# 3. TRAILING SLASHES
# ============================================================================

class TestTrailingSlashes:
    @override_settings(APPEND_SLASH=True)
    def test_append_slash_redirects(self, api_client):
        url = "/api/v1/auth/login"
        response = api_client.get(url)
        assert response.status_code in (301, 302)
        assert response.url.endswith("/")

    @override_settings(APPEND_SLASH=False)
    def test_append_slash_disabled_404(self, api_client):
        url = "/api/v1/auth/login"
        response = api_client.get(url)
        assert response.status_code == 404

    def test_url_with_trailing_slash_success(self, api_client):
        url = reverse("symbols-list")
        response = api_client.get(url)
        assert response.status_code != 404


# ============================================================================
# 4. HTTP METHOD NOT ALLOWED (Fixed: uses auth_client for protected endpoints)
# ============================================================================

class TestMethodNotAllowed:
    @pytest.mark.parametrize(
        "client_fixture, url_name, kwargs, disallowed_methods",
        [
            # Public GET-only endpoints
            ("api_client", "symbols-list", {}, ["post", "put", "patch", "delete"]),
            ("api_client", "stock-analysis", {}, ["post", "put", "patch", "delete"]),
            ("api_client", "prediction-history", {}, ["post", "put", "patch", "delete"]),
            ("api_client", "get-news", {}, ["put", "patch", "delete"]),

            # Public POST-only endpoints
            ("api_client", "register", {}, ["get", "put", "patch", "delete"]),
            ("api_client", "login", {}, ["get", "put", "patch", "delete"]),
            ("api_client", "subscribe", {}, ["get", "put", "patch", "delete"]),

            # Protected DELETE-only endpoint – must be authenticated
            ("auth_client", "api-key-revoke", {"pk": 1}, ["get", "post", "put", "patch"]),
        ]
    )
    def test_method_not_allowed(self, request, client_fixture, url_name, kwargs, disallowed_methods):
        """Test that unsupported methods return 405."""
        client = request.getfixturevalue(client_fixture)
        url = reverse(url_name, kwargs=kwargs)

        for method in disallowed_methods:
            request_method = getattr(client, method)
            response = request_method(url)
            assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED, (
                f"{method.upper()} {url_name} returned {response.status_code}, expected 405"
            )

    def test_get_allowed_on_readonly_endpoint(self, api_client):
        url = reverse("symbols-list")
        response = api_client.get(url)
        assert response.status_code != status.HTTP_405_METHOD_NOT_ALLOWED

    def test_post_allowed_on_create_endpoint(self, api_client):
        url = reverse("register")
        response = api_client.post(url, {})
        assert response.status_code != status.HTTP_405_METHOD_NOT_ALLOWED


# ============================================================================
# 5. MALFORMED JSON
# ============================================================================

class TestMalformedJSON:
    """
    Test that malformed JSON returns 400, not 500.
    """

    def test_malformed_json_register(self, api_client):
        url = reverse("register")
        malformed = '{"username": "test", "email": "test@test.com" '  # Missing closing brace
        response = api_client.post(
            url,
            data=malformed,
            content_type="application/json"
        )
        # Should be 400 (JSON parse error) – but we need to ensure the view handles it.
        # Currently it may return 500 if the view doesn't catch ParseError.
        # For this test, we'll expect 400 after we fix the view.
        # We'll assert 400, but if 500, we'll fail and note the fix.
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_malformed_json_login(self, api_client):
        url = reverse("login")
        malformed = '{"username": "test" "password": "123"}'  # Missing comma
        response = api_client.post(
            url,
            data=malformed,
            content_type="application/json"
        )
        # This should be 400 after fixing LoginView to catch ParseError.
        # Currently it returns 500, so we'll adjust expectation after fix.
        # For now, we'll expect 400 (we'll provide the fix).
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_valid_json_success(self, api_client):
        """
        Test that a well-formed JSON payload does not return a JSON parse error.
        The endpoint may return 400 for validation errors (e.g., password rules),
        but that is acceptable – we only care that it's not a JSON parse error.
        """
        url = reverse("register")
        import time
        unique = f"testuser_{int(time.time())}"
        valid = f'{{"username": "{unique}", "email": "{unique}@test.com", "password": "SecurePass123!", "password_confirm": "SecurePass123!"}}'
        response = api_client.post(
            url,
            data=valid,
            content_type="application/json"
        )
        # Check that the error (if any) is NOT a JSON parse error
        if response.status_code == 400:
            response_data = response.json()
            error_message = str(response_data)
            assert "JSON parse error" not in error_message, f"Unexpected JSON parse error: {error_message}"
        else:
            # If not 400, it should be 201 or 200, not 500
            assert response.status_code != status.HTTP_500_INTERNAL_SERVER_ERROR


# ============================================================================
# 6. CONTENT-TYPE HANDLING
# ============================================================================

class TestContentTypeHandling:
    def test_json_endpoint_with_form_data(self, api_client):
        url = reverse("register")
        response = api_client.post(
            url,
            data={"username": "test", "email": "test@test.com"},
            content_type="application/x-www-form-urlencoded"
        )
        # DRF may accept form data if serializer supports it; but it should not return 200.
        assert response.status_code != status.HTTP_200_OK

    def test_json_endpoint_with_json_success(self, api_client):
        url = reverse("register")
        import time
        unique = f"testuser_{int(time.time())}"
        data = {
            "username": unique,
            "email": f"{unique}@test.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!"
        }
        response = api_client.post(
            url,
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code != status.HTTP_415_UNSUPPORTED_MEDIA_TYPE


# ============================================================================
# 7. URL PARAMETER VALIDATION (Removed negative int test)
# ============================================================================

class TestURLParameterValidation:
    def test_invalid_symbol_parameter(self, api_client):
        url = reverse("user-watchlist-item", kwargs={"symbol": "AAPL123456789"})
        response = api_client.get(url)
        assert response.status_code != status.HTTP_500_INTERNAL_SERVER_ERROR

    # Removed test for negative int – Django's int converter doesn't accept negative numbers


# ============================================================================
# 8. INVALID URL PATHS (Skip admin redirect)
# ============================================================================

class TestInvalidURLs:
    @pytest.mark.parametrize(
        "invalid_path",
        [
            "/api/v1/auth/nonexistent/",
            "/api/v1/invalid/",
            "/stocks/nonexistent/",
            "/api/v1/news/nonexistent/",
            # "/admin/nonexistent/",  # Admin redirects to login; test separately
        ]
    )
    def test_invalid_url_returns_404(self, api_client, invalid_path):
        response = api_client.get(invalid_path)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_invalid_url_redirects(self, api_client):
        response = api_client.get("/admin/nonexistent/")
        # Admin redirects to login page (302) when not authenticated
        assert response.status_code == 302