"""
Tier 17: API Versioning

Tests:
- v1 endpoints work as expected.
- v2 endpoints are not yet implemented (404).
- No deprecation headers are sent while v1 is current.

Author: Tickflow Capital
Version: 1.0
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


class TestAPIVersioning:
    """
    Placeholder for API versioning tests.
    Current API is v1 only.
    """

    def test_v1_endpoint_accessible(self, api_client):
        """Test that a known v1 endpoint returns 200."""
        url = reverse("login")  # e.g., /api/v1/auth/login/
        response = api_client.get(url)
        # GET on login may return 405 (Method Not Allowed) or 200 if it's allowed.
        # We'll accept 200, 405, or 401 since we're not authenticating.
        # The key is that it's a valid v1 route.
        assert response.status_code in [200, 401, 405], f"Unexpected status: {response.status_code}"

    def test_v2_endpoint_returns_404(self, api_client):
        """Currently no v2 endpoints exist; expect 404."""
        # Try a v2 version of the login endpoint.
        # Since we don't have a URL pattern for v2, we'll construct it manually.
        # Using a reverse lookup for a v2 URL would raise NoReverseMatch; we'll use a direct GET.
        url = "/api/v2/auth/login/"
        response = api_client.get(url)
        assert response.status_code == 404

    def test_no_deprecation_headers_for_v1(self, api_client):
        """
        v1 is the current version, so deprecation headers should NOT be present.
        If the API adds deprecation headers for older versions, this test will need updating.
        """
        url = reverse("login")
        response = api_client.get(url)
        # Check common deprecation headers are absent
        assert "Deprecation" not in response.headers
        assert "API-Version" not in response.headers  # or whatever header you use
        assert "Sunset" not in response.headers

    # Future test placeholder - uncomment and update when v2 is introduced
    # def test_v2_response_format(self, api_client):
    #     """Test that v2 returns expected field changes."""
    #     pass