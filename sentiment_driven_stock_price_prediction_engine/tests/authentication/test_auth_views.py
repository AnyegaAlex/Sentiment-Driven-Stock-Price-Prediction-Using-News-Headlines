# authentication/tests/test_auth_views.py
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient
from authentication.models import User
from unittest.mock import patch

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()

@pytest.mark.django_db
class TestAuthViews:

    @patch('authentication.views.send_verification_email')
    def test_registration_sends_email_sync(self, mock_send_email, api_client):
        mock_send_email.return_value = True
        
        payload = {
            "username": "newuser",
            "email": "new@example.com",
            "password": "StrongPassword123!",
            "password2": "StrongPassword123!"
        }
        response = api_client.post('/api/v1/auth/register/', payload)
        
        assert response.status_code == 201
        assert mock_send_email.called

    def test_email_verification_returns_onboarding_redirect(self, api_client, db):
        # Create an unverified user
        user = User.objects.create_user(
            username="unverified", 
            email="unverified@example.com", 
            password="password123",
            email_verified=False
        )
        
        # Manually generate a verification token
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Hit the GET verification endpoint
        response = api_client.get(f'/api/v1/auth/verify-email/?token={token}&uid={uid}')
        
        assert response.status_code == 200
        data = response.json()['data']
        
        # CRITICAL: Ensure onboarding redirect and tokens are present
        assert data['redirect'] == "/onboarding"
        assert 'access' in data
        assert 'refresh' in data
        
        user.refresh_from_db()
        assert user.email_verified is True

    def test_login_rate_limiting_atomic(self, api_client):
        payload = {"username": "fake", "password": "wrongpassword"}
        
        # Hit the login endpoint 11 times
        for _ in range(10):
            response = api_client.post('/api/v1/auth/login/', payload)
            assert response.status_code == 401
            
        # 11th request should be blocked by the atomic cache limit
        response = api_client.post('/api/v1/auth/login/', payload)
        assert response.status_code == 429
        assert response.json()['code'] == 'RATE_LIMIT_EXCEEDED'