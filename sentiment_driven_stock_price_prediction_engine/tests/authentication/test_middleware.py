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
        """A public path must not make similarly prefixed paths public."""
        from authentication.middleware import APIKeyMiddleware

        middleware = APIKeyMiddleware(lambda request: None)
        assert middleware._is_public_path('/api/v1/auth/login/') is True
        assert middleware._is_public_path('/api/v1/auth/login-bypass/') is False

        # The lookalike URL is not routed, so URL resolution correctly returns 404.
        response = api_client.get('/api/v1/auth/login-bypass/')
        assert response.status_code == 404


    def test_cached_key_hash_is_rechecked_after_rotation(self, db, user_with_key):
        """A cached row ID must not keep a rotated credential valid."""
        import hashlib
        from django.core.cache import cache
        from authentication.middleware import APIKeyMiddleware

        user, old_raw_key = user_with_key
        key_obj = UserAPIKey.objects.get(user=user)
        cache_key = f"api_key_lookup_{hashlib.sha256(old_raw_key.encode()).hexdigest()}"
        cache.set(cache_key, key_obj.id, timeout=300)
        key_obj.key_hash = hashlib.sha256(b"ts_rotated_key").hexdigest()
        key_obj.save(update_fields=["key_hash"])

        middleware = APIKeyMiddleware(lambda request: None)
        assert middleware._validate_api_key(old_raw_key) is None
        assert cache.get(cache_key) is None

    def test_expired_key_is_rejected_even_when_cached(self, db, user_with_key):
        """An expiry change must invalidate a positive cache entry immediately."""
        import hashlib
        from datetime import timedelta
        from django.core.cache import cache
        from django.utils import timezone
        from authentication.middleware import APIKeyMiddleware

        user, raw_key = user_with_key
        key_obj = UserAPIKey.objects.get(user=user)
        key_obj.expires_at = timezone.now() - timedelta(seconds=1)
        key_obj.save(update_fields=["expires_at"])
        cache_key = f"api_key_lookup_{hashlib.sha256(raw_key.encode()).hexdigest()}"
        cache.set(cache_key, key_obj.id, timeout=300)

        middleware = APIKeyMiddleware(lambda request: None)
        assert middleware._validate_api_key(raw_key) is None
        assert cache.get(cache_key) is None

    def test_expired_key_is_rejected_on_cache_miss(self, db, user_with_key):
        """The indexed database lookup must exclude expired keys too."""
        from datetime import timedelta
        from django.utils import timezone
        from authentication.middleware import APIKeyMiddleware

        user, raw_key = user_with_key
        UserAPIKey.objects.filter(user=user).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        assert APIKeyMiddleware(lambda request: None)._validate_api_key(raw_key) is None
