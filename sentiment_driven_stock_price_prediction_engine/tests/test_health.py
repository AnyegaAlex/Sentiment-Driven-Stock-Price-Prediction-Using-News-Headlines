"""
Tier 16: Health Checks (Liveness & Readiness)

Tests:
- /api/v1/health/ (HealthCheckView) returns 200 with all checks healthy.
- /api/v1/health/readiness/ returns 200 when DB & Redis are available.
- Degraded statuses return 503 with appropriate check details.
"""

import pytest
from unittest.mock import patch
from django.urls import reverse
from django.db import connection
from django.core.cache import cache
from django.conf import settings
from django.test import override_settings

pytestmark = pytest.mark.django_db


def _redis_down_side_effect(key, *args, **kwargs):
    """Raise Exception only for Redis health check keys, not for throttling."""
    if key.startswith('throttle_'):
        return  # do nothing (throttling continues normally)
    else:
        raise Exception("Redis down")


class TestHealthCheckView:
    def test_health_healthy(self, api_client):
        connection.ensure_connection()
        cache.set("health_test", "ok", 1)

        url = reverse("health")
        response = api_client.get(url)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["checks"]["database"]["status"] == "healthy"
        assert data["checks"]["redis"]["status"] in ("healthy", "not_configured")
        assert "response_time_ms" in data["checks"]
        assert "version" in data["checks"]

    @patch("django.db.connection.cursor")
    def test_health_db_down(self, mock_cursor, api_client):
        mock_cursor.side_effect = Exception("DB connection failed")

        url = reverse("health")
        response = api_client.get(url)

        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["database"]["status"] == "unhealthy"

    @patch("django.core.cache.cache.set", side_effect=_redis_down_side_effect)
    def test_health_redis_down(self, mock_cache_set, api_client):
        """Redis failure → status unhealthy, 503 (throttling not affected)."""
        if not getattr(settings, "REDIS_URL", None):
            pytest.skip("Redis not configured")

        url = reverse("health")
        response = api_client.get(url)

        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["redis"]["status"] == "unhealthy"

    @patch("psutil.virtual_memory")
    def test_health_memory_high(self, mock_memory, api_client):
        mock_memory.return_value.percent = 95

        url = reverse("health")
        response = api_client.get(url)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["checks"]["memory"]["status"] == "degraded"
        assert data["checks"]["memory"]["usage_percent"] == 95

    def test_health_providers_configured(self, api_client, settings):
        settings.FINNHUB_API_KEY = "fake_key"
        settings.ALPHA_VANTAGE_KEY = "fake_alpha"
        url = reverse("health")
        response = api_client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data["checks"]
        assert "finnhub" in data["checks"]["providers"]
        assert "alpha_vantage" in data["checks"]["providers"]


class TestReadinessView:
    def test_readiness_ready(self, api_client):
        connection.ensure_connection()
        if getattr(settings, "REDIS_URL", None):
            cache.set("readiness_test", "ok", 1)

        url = reverse("readiness")
        response = api_client.get(url)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["issues"] == []

    @patch("django.db.connection.cursor")
    def test_readiness_db_down(self, mock_cursor, api_client):
        mock_cursor.side_effect = Exception("DB down")

        url = reverse("readiness")
        response = api_client.get(url)

        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert any("Database" in issue for issue in data["issues"])

    @patch("django.core.cache.cache.set", side_effect=_redis_down_side_effect)
    def test_readiness_redis_down(self, mock_cache_set, api_client):
        """Redis failure → 503 (if Redis is configured), throttling ignored."""
        if not getattr(settings, "REDIS_URL", None):
            pytest.skip("Redis not configured")

        url = reverse("readiness")
        response = api_client.get(url)

        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert any("Redis" in issue for issue in data["issues"])