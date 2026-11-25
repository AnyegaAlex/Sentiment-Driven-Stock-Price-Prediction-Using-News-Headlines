# authentication/tests/test_api_keys.py
import hashlib
import pytest
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIRequestFactory
from rest_framework.exceptions import AuthenticationFailed
from authentication.authentication import APIKeyAuthentication
from authentication.models import User, UserAPIKey

@pytest.fixture
def test_user(db):
    user = User.objects.create_user(username="testuser", email="test@example.com", password="password123")
    TermsAcceptance.objects.create(user=user, version=TERMS.version, content_hash=TERMS.sha256)
    PrivacyNoticeAcknowledgement.objects.create(user=user, version=PRIVACY_NOTICE.version, content_hash=PRIVACY_NOTICE.sha256)
    return user

@pytest.mark.django_db
class TestAPIKeys:

    def test_model_create_key_uses_sha256(self, test_user):
        key_obj, raw_key = UserAPIKey.create_key(test_user, "Test Key")
        
        expected_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        assert key_obj.key_hash == expected_hash
        assert len(key_obj.key_hash) == 64 # SHA-256 length

    def test_management_command_uses_sha256(self, test_user):
        """Test that the CLI command generates a valid SHA-256 hash."""
        call_command('generate_apikey', 'testuser', name='CLI Key', quiet=True)
        
        key_obj = UserAPIKey.objects.get(user=test_user, name="CLI Key")
        
        # The hash should be exactly 64 chars (SHA-256), NOT starting with 'pbkdf2_sha256'
        assert len(key_obj.key_hash) == 64
        assert not key_obj.key_hash.startswith("pbkdf2_sha256")

    def test_authentication_accepts_model_generated_key(self, test_user):
        key_obj, raw_key = UserAPIKey.create_key(test_user, "Authentication Test")
        request = APIRequestFactory().get("/api/test/", HTTP_X_API_KEY=raw_key)

        user, auth = APIKeyAuthentication().authenticate(request)

        assert user == test_user
        assert auth is None
        assert request.api_key_obj.pk == key_obj.pk

    def test_authentication_rejects_unknown_key(self):
        request = APIRequestFactory().get(
            "/api/test/", HTTP_X_API_KEY="ts_not-a-real-key"
        )

        with pytest.raises(AuthenticationFailed, match="Invalid API key"):
            APIKeyAuthentication().authenticate(request)

    def test_authentication_reports_revoked_key_even_after_cache_hit(self, test_user):
        key_obj, raw_key = UserAPIKey.create_key(test_user, "Revoked Test")
        auth = APIKeyAuthentication()
        request = APIRequestFactory().get("/api/test/", HTTP_X_API_KEY=raw_key)

        # First request populates the positive cache.
        assert auth.authenticate(request)[0] == test_user
        key_obj.revoke()

        # A cached key ID must not allow a revoked key to remain usable.
        request_after_revoke = APIRequestFactory().get(
            "/api/test/", HTTP_X_API_KEY=raw_key
        )
        with pytest.raises(AuthenticationFailed, match="deactivated"):
            auth.authenticate(request_after_revoke)

    def test_authentication_reports_expired_key(self, test_user):
        key_obj, raw_key = UserAPIKey.create_key(
            test_user,
            "Expired Test",
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        request = APIRequestFactory().get("/api/test/", HTTP_X_API_KEY=raw_key)

        with pytest.raises(AuthenticationFailed, match="expired"):
            APIKeyAuthentication().authenticate(request)
