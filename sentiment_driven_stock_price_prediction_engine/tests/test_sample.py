"""
Sanity test to verify test environment is properly configured.
"""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

def test_factories_work(user, auth_client):
    assert user.username.startswith("testuser_")
    assert auth_client.handler is not None

def test_url_reverse():
    url = reverse("api-root")
    assert url == "/"  # Adjust to your root URL pattern