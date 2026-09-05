"""
Global pytest fixtures.

Provides reusable clients, users, and mocked external services.

Author: Tickflow Capital
Version: 2.0.0
"""

import pytest
import pandas as pd
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock

from tests.factories import (
    UserFactory,
    UnverifiedUserFactory,
    InactiveUserFactory,
    AdminUserFactory,
    DeletionPendingUserFactory,
    PredictionFactory,
    ProcessedNewsFactory,
)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear Django cache before each test."""
    cache.clear()
    yield


@pytest.fixture
def api_client():
    """Return an unauthenticated DRF API client."""
    return APIClient()


@pytest.fixture
def auth_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """Return an admin API client using JWT."""
    url = reverse("token_obtain_pair")
    response = api_client.post(url, {
        "username": admin_user.username,
        "password": "testpass123"
    })
    assert response.status_code == 200
    token = response.data["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


# ----- User fixtures -----
@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def unverified_user():
    return UnverifiedUserFactory()


@pytest.fixture
def inactive_user():
    return InactiveUserFactory()


@pytest.fixture
def admin_user():
    return AdminUserFactory()


@pytest.fixture
def deletion_pending_user():
    return DeletionPendingUserFactory()

@pytest.fixture
def foreign_user():
    return UserFactory()

# ----- Model fixtures -----
@pytest.fixture
def prediction(user):
    return PredictionFactory(user=user)


@pytest.fixture
def resolved_prediction(user):
    return PredictionFactory(user=user, resolved_correct=True)


@pytest.fixture
def news_article():
    return ProcessedNewsFactory()


# ============================================================================
# MOCKS FOR EXTERNAL SERVICES
# ============================================================================

@pytest.fixture(autouse=True)
def mock_yfinance():
    """Mock yfinance to avoid live API calls."""
    with patch("yfinance.Ticker") as mock:
        mock_instance = MagicMock()
        # Sample price history
        dates = pd.date_range(start="2024-01-01", periods=5, freq="D")
        mock_instance.history.return_value = pd.DataFrame({
            "Close": [100, 101, 102, 103, 104],
            "High": [101, 102, 103, 104, 105],
            "Low": [99, 100, 101, 102, 103],
            "Volume": [1000, 1100, 1200, 1300, 1400]
        }, index=dates)
        mock.return_value = mock_instance
        yield mock


@pytest.fixture(autouse=True)
def mock_finnhub():
    """Mock Finnhub API calls."""
    with patch("requests.get") as mock_get:
        def side_effect(url, **kwargs):
            if "finnhub.io" in url:
                # Sample candle response
                return MockResponse(200, {
                    "c": [100, 101, 102, 103, 104],
                    "h": [101, 102, 103, 104, 105],
                    "l": [99, 100, 101, 102, 103],
                    "o": [99, 100, 101, 102, 103],
                    "v": [1000, 1100, 1200, 1300, 1400],
                    "t": [1609459200, 1609545600, 1609632000, 1609718400, 1609804800]
                })
            return MockResponse(404, {})
        mock_get.side_effect = side_effect
        yield mock_get


@pytest.fixture(autouse=True)
def mock_sendgrid():
    """Mock SendGrid email sending to avoid network calls."""
    with patch("authentication.utils.send_email_async") as mock_send:
        mock_send.return_value = True
        yield mock_send


class MockResponse:
    """Helper class for mocking requests.Response."""
    def __init__(self, status_code, json_data):
        self.status_code = status_code
        self.json_data = json_data

    def json(self):
        return self.json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception("HTTP error")
