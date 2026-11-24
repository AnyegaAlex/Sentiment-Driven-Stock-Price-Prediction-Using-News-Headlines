# authentication/tests/test_api_keys.py
import hashlib
import pytest
from django.core.management import call_command
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
        call_command('generate_apikey', 'testuser', '--name="CLI Key"', '--quiet=True')
        
        key_obj = UserAPIKey.objects.get(user=test_user, name="CLI Key")
        
        # The hash should be exactly 64 chars (SHA-256), NOT starting with 'pbkdf2_sha256'
        assert len(key_obj.key_hash) == 64
        assert not key_obj.key_hash.startswith("pbkdf2_sha256")