# authentication/tests/test_api_keys.py
import hashlib
import pytest
from django.core.management import call_command
from django.core.cache import cache
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory
from authentication.authentication import APIKeyAuthentication
from authentication.models import User, UserAPIKey

@pytest.fixture
def test_user(db):
    return User.objects.create_user(username="testuser", email="test@example.com", password="password123")

@pytest.mark.django_db
class TestAPIKeys:

    def test_model_create_key_uses_sha256(self, test_user):
        key_obj, raw_key = UserAPIKey.create_key(test_user, "Test Key")
        
        expected_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        assert key_obj.key_hash == expected_hash
        assert len(key_obj.key_hash) == 64 # SHA-256 length

    def test_management_command_uses_sha256(self, test_user):
        """Test that the CLI command generates a valid SHA-256 hash."""
        call_command('generate_apikey', 'testuser', '--name', 'CLI Key', '--quiet')
        
        key_obj = UserAPIKey.objects.get(user=test_user, name="CLI Key")
        
        # The hash should be exactly 64 chars (SHA-256), NOT starting with 'pbkdf2_sha256'
        assert len(key_obj.key_hash) == 64
        assert not key_obj.key_hash.startswith("pbkdf2_sha256")
    def test_api_key_authentication_uses_model_key_hash(self, test_user):
        cache.clear()
        key_obj, raw_key = UserAPIKey.create_key(test_user, 'DRF auth test')
        request = APIRequestFactory().get('/', HTTP_X_API_KEY=raw_key)

        result = APIKeyAuthentication().authenticate(request)

        assert result == (test_user, None)
        assert request.api_key_obj.pk == key_obj.pk

    def test_cached_key_hash_is_rechecked_after_rotation(self, test_user):
        """A cached row ID must not keep an old API key valid after rotation."""
        cache.clear()
        key_obj, old_raw_key = UserAPIKey.create_key(test_user, 'Rotated DRF key')
        old_hash = hashlib.sha256(old_raw_key.encode()).hexdigest()
        cache.set(f"api_key_lookup_{old_hash}", key_obj.id, timeout=300)
        key_obj.key_hash = hashlib.sha256(b"ts_new-rotated-key").hexdigest()
        key_obj.save(update_fields=["key_hash"])

        request = APIRequestFactory().get('/', HTTP_X_API_KEY=old_raw_key)
        with pytest.raises(AuthenticationFailed, match='Invalid API key'):
            APIKeyAuthentication().authenticate(request)

    def test_invalid_api_key_keeps_specific_authentication_error(self, test_user):
        cache.clear()
        request = APIRequestFactory().get('/', HTTP_X_API_KEY='ts_not-a-real-key')

        with pytest.raises(AuthenticationFailed, match='Invalid API key'):
            APIKeyAuthentication().authenticate(request)

    def test_missing_api_key_allows_other_authentication_classes(self):
        request = APIRequestFactory().get('/')

        assert APIKeyAuthentication().authenticate(request) is None
