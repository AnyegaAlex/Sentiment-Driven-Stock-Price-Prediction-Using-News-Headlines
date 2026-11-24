# authentication/tests/test_middleware.py
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from authentication.models import User, UserAPIKey

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user_with_key(db):
    user = User.objects.create_user(username="apiuser", email="kamauanyega437@gmail.com", password="password123")
    key_obj, raw_key = UserAPIKey.create_key(user, "Middleware Test Key")
    return user, raw_key

@pytest.mark.django_db
class TestAPIKeyMiddleware:

    def test_public_path_does_not_require_auth(self, api_client):
        # Assuming /api/v1/symbols/ is public
        response = api_client.get('/api/v1/symbols/')
        assert response.status_code == 200

    def test_protected_path_blocks_without_key(self, api_client):
        # Assuming /api/v1/profile/ requires auth
        response = api_client.get('/api/v1/auth/profile/')
        assert response.status_code == 401
        assert response.json()['code'] == 'AUTH_API_KEY_REQUIRED'

    def test_protected_path_allows_valid_key(self, api_client, user_with_key):
        user, raw_key = user_with_key
        api_client.credentials(HTTP_X_API_KEY=raw_key)
        
        response = api_client.get('/api/v1/auth/profile/')
        assert response.status_code == 200
        assert response.json()['username'] == user.username

    def test_protected_path_blocks_invalid_key(self, api_client):
        api_client.credentials(HTTP_X_API_KEY="ts_invalid_key_here")
        
        response = api_client.get('/api/v1/auth/profile/')
        assert response.status_code == 401
        assert response.json()['code'] == 'AUTH_INVALID_API_KEY'

    def test_path_traversal_security_bypass(self, api_client):
        """Ensure appending paths to public paths doesn't bypass auth."""
        response = api_client.get('/api/v1/auth/login/../profile/')
        # Django normalizes paths, but if a route like /api/v1/auth/login-bypass/ existed:
        response = api_client.get('/api/v1/auth/login-bypass/')
        assert response.status_code == 401