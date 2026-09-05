"""
Tests for authentication/serializers.py.

Covers:
- RegisterSerializer: validation, uniqueness, password confirmation, email domain.
- LoginSerializer: field validation.
- UserProfileSerializer: field inclusion, computed fields.
- UpdateProfileSerializer: partial updates, username validation, persona validation.
- Password reset serializers: request & confirm.
- ChangePasswordSerializer, ChangeEmailSerializer, ChangeUsernameSerializer: validation.
- UserPreferencesSerializer: field validation, watchlist, theme, language.
- UserAPIKeySerializer: read-only, key_preview.
"""

import pytest
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta

from authentication.models import User, UserPreferences, UserAPIKey
from authentication.serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    UpdateProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    ChangeEmailSerializer,
    ChangeUsernameSerializer,
    UserPreferencesSerializer,
    UserAPIKeySerializer,
)

pytestmark = pytest.mark.django_db


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        email_verified=True,
        is_active=True,
    )


@pytest.fixture
def test_user2(db):
    return User.objects.create_user(
        username='another',
        email='another@example.com',
        password='testpass123',
        email_verified=True,
        is_active=True,
    )


# ============================================================================
# Test: RegisterSerializer
# ============================================================================

class TestRegisterSerializer:

    def test_valid_register(self):
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
            'first_name': 'New',
            'last_name': 'User',
        }
        serializer = RegisterSerializer(data=data)
        assert serializer.is_valid()
        user = serializer.save()
        assert user.username == 'newuser'
        assert user.email == 'new@example.com'
        assert user.check_password('StrongPass123!')
        assert user.first_name == 'New'

    def test_password_mismatch(self):
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'StrongPass123!',
            'password2': 'DifferentPass123!',
        }
        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors

    def test_duplicate_username(self, test_user):
        data = {
            'username': 'testuser',  # already exists
            'email': 'new@example.com',
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
        }
        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert 'username' in serializer.errors

    def test_duplicate_email(self, test_user):
        data = {
            'username': 'newuser',
            'email': 'test@example.com',  # already exists
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
        }
        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors

    def test_disposable_email(self):
        data = {
            'username': 'newuser',
            'email': 'user@mailinator.com',  # disposable domain
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
        }
        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors
        assert 'permanent email' in str(serializer.errors['email'])

    def test_invalid_username_format(self):
        data = {
            'username': 'invalid!@#',  # invalid chars
            'email': 'new@example.com',
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
        }
        serializer = RegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert 'username' in serializer.errors


# ============================================================================
# Test: LoginSerializer
# ============================================================================

class TestLoginSerializer:

    def test_valid_login(self):
        data = {'username': 'testuser', 'password': 'testpass123'}
        serializer = LoginSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data['username'] == 'testuser'

    def test_missing_username(self):
        data = {'password': 'testpass123'}
        serializer = LoginSerializer(data=data)
        assert not serializer.is_valid()
        assert 'username' in serializer.errors

    def test_missing_password(self):
        data = {'username': 'testuser'}
        serializer = LoginSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors


# ============================================================================
# Test: UserProfileSerializer
# ============================================================================

class TestUserProfileSerializer:

    def test_serialize_user(self, test_user):
        serializer = UserProfileSerializer(instance=test_user)
        data = serializer.data
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'
        assert data['id'] == test_user.id
        assert 'email_verified' in data
        assert 'tier' in data
        assert 'created_at' in data
        # Computed fields (from preferences)
        assert data['watchlist'] == []
        assert data['investment_goal'] is None  # no preferences yet

    def test_with_preferences(self, test_user):
        UserPreferences.objects.create(
            user=test_user,
            investment_goal='growth',
            risk_tolerance='moderate',
            watchlist=['AAPL', 'MSFT']
        )
        serializer = UserProfileSerializer(instance=test_user)
        data = serializer.data
        assert data['watchlist'] == ['AAPL', 'MSFT']
        assert data['investment_goal'] == 'growth'
        assert data['risk_tolerance'] == 'moderate'

    def test_read_only_fields(self, test_user):
        serializer = UserProfileSerializer(instance=test_user)
        data = serializer.data
        # These should be read-only
        assert 'id' in data
        assert 'email' in data
        assert 'email_verified' in data
        assert 'tier' in data
        assert 'created_at' in data
        assert 'updated_at' in data

    def test_username_update_allowed(self, test_user):
        # Username is not read-only in the serializer
        data = UserProfileSerializer(instance=test_user).data
        data['username'] = 'newusername'
        serializer = UserProfileSerializer(instance=test_user, data=data, partial=True)
        assert serializer.is_valid()
        user = serializer.save()
        assert user.username == 'newusername'


# ============================================================================
# Test: UpdateProfileSerializer
# ============================================================================

class TestUpdateProfileSerializer:

    def test_partial_update(self, test_user):
        data = {'first_name': 'Updated', 'last_name': 'Name'}
        serializer = UpdateProfileSerializer(instance=test_user, data=data, partial=True)
        assert serializer.is_valid()
        user = serializer.save()
        assert user.first_name == 'Updated'
        assert user.last_name == 'Name'

    def test_username_update(self, test_user):
        data = {'username': 'newusername'}
        serializer = UpdateProfileSerializer(instance=test_user, data=data, partial=True)
        assert serializer.is_valid()
        user = serializer.save()
        assert user.username == 'newusername'

    def test_username_duplicate(self, test_user, test_user2):
        data = {'username': 'another'}  # already taken by test_user2
        serializer = UpdateProfileSerializer(instance=test_user, data=data, partial=True)
        assert not serializer.is_valid()
        assert 'username' in serializer.errors
        assert 'already taken' in str(serializer.errors['username'])

    def test_invalid_persona(self, test_user):
        data = {'persona': 'invalid'}
        serializer = UpdateProfileSerializer(instance=test_user, data=data, partial=True)
        assert not serializer.is_valid()
        assert 'persona' in serializer.errors

    def test_bio_max_length(self, test_user):
        data = {'bio': 'a' * 600}  # max 500
        serializer = UpdateProfileSerializer(instance=test_user, data=data, partial=True)
        assert not serializer.is_valid()
        assert 'bio' in serializer.errors


# ============================================================================
# Test: PasswordResetRequestSerializer
# ============================================================================

class TestPasswordResetRequestSerializer:

    def test_valid_email(self):
        data = {'email': 'test@example.com'}
        serializer = PasswordResetRequestSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data['email'] == 'test@example.com'

    def test_invalid_email(self):
        data = {'email': 'not-an-email'}
        serializer = PasswordResetRequestSerializer(data=data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors

    def test_missing_email(self):
        serializer = PasswordResetRequestSerializer(data={})
        assert not serializer.is_valid()
        assert 'email' in serializer.errors


# ============================================================================
# Test: PasswordResetConfirmSerializer
# ============================================================================

class TestPasswordResetConfirmSerializer:

    def test_valid(self):
        data = {
            'token': 'abc123',
            'uid': 'MQ==',
            'password': 'NewPass123!',
            'password2': 'NewPass123!',
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        assert serializer.is_valid()

    def test_password_mismatch(self):
        data = {
            'token': 'abc123',
            'uid': 'MQ==',
            'password': 'NewPass123!',
            'password2': 'DifferentPass123!',
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors

    def test_missing_token(self):
        data = {
            'uid': 'MQ==',
            'password': 'NewPass123!',
            'password2': 'NewPass123!',
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        assert not serializer.is_valid()
        assert 'token' in serializer.errors


# ============================================================================
# Test: ChangePasswordSerializer
# ============================================================================

class TestChangePasswordSerializer:

    def test_valid(self):
        data = {
            'old_password': 'oldpass',
            'new_password': 'NewPass123!',
            'new_password2': 'NewPass123!',
        }
        serializer = ChangePasswordSerializer(data=data)
        assert serializer.is_valid()

    def test_mismatch(self):
        data = {
            'old_password': 'oldpass',
            'new_password': 'NewPass123!',
            'new_password2': 'DifferentPass123!',
        }
        serializer = ChangePasswordSerializer(data=data)
        assert not serializer.is_valid()
        assert 'new_password' in serializer.errors

    def test_missing_fields(self):
        serializer = ChangePasswordSerializer(data={})
        assert not serializer.is_valid()
        assert 'old_password' in serializer.errors
        assert 'new_password' in serializer.errors


# ============================================================================
# Test: ChangeEmailSerializer
# ============================================================================

class TestChangeEmailSerializer:

    def test_valid(self, test_user):
        data = {'new_email': 'new@example.com', 'password': 'testpass123'}
        serializer = ChangeEmailSerializer(data=data)
        assert serializer.is_valid()

    def test_duplicate_email(self, test_user, test_user2):
        data = {'new_email': 'another@example.com', 'password': 'testpass123'}
        serializer = ChangeEmailSerializer(data=data)
        assert not serializer.is_valid()
        assert 'new_email' in serializer.errors
        assert 'already in use' in str(serializer.errors['new_email'])

    def test_missing_password(self):
        data = {'new_email': 'new@example.com'}
        serializer = ChangeEmailSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors

    def test_invalid_email(self):
        data = {'new_email': 'not-an-email', 'password': 'testpass123'}
        serializer = ChangeEmailSerializer(data=data)
        assert not serializer.is_valid()
        assert 'new_email' in serializer.errors


# ============================================================================
# Test: ChangeUsernameSerializer
# ============================================================================

class TestChangeUsernameSerializer:

    def test_valid(self):
        data = {'new_username': 'newuser', 'password': 'testpass123'}
        serializer = ChangeUsernameSerializer(data=data)
        assert serializer.is_valid()

    def test_duplicate_username(self, test_user, test_user2):
        data = {'new_username': 'another', 'password': 'testpass123'}
        serializer = ChangeUsernameSerializer(data=data)
        assert not serializer.is_valid()
        assert 'new_username' in serializer.errors

    def test_invalid_username_format(self):
        data = {'new_username': 'invalid!', 'password': 'testpass123'}
        serializer = ChangeUsernameSerializer(data=data)
        assert not serializer.is_valid()
        assert 'new_username' in serializer.errors

    def test_missing_password(self):
        data = {'new_username': 'newuser'}
        serializer = ChangeUsernameSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors


# ============================================================================
# Test: UserPreferencesSerializer
# ============================================================================

class TestUserPreferencesSerializer:

    def test_valid_preferences(self):
        data = {
            'investment_goal': 'growth',
            'risk_tolerance': 'moderate',
            'experience_level': 'intermediate',
            'watchlist': ['AAPL', 'MSFT'],
            'theme': 'dark',
            'language': 'en',
            'timezone': 'America/New_York',
        }
        serializer = UserPreferencesSerializer(data=data)
        assert serializer.is_valid()

    def test_invalid_investment_goal(self):
        data = {'investment_goal': 'invalid'}
        serializer = UserPreferencesSerializer(data=data)
        assert not serializer.is_valid()
        assert 'investment_goal' in serializer.errors

    def test_invalid_risk_tolerance(self):
        data = {'risk_tolerance': 'invalid'}
        serializer = UserPreferencesSerializer(data=data)
        assert not serializer.is_valid()
        assert 'risk_tolerance' in serializer.errors

    def test_invalid_theme(self):
        data = {'theme': 'invalid'}
        serializer = UserPreferencesSerializer(data=data)
        assert not serializer.is_valid()
        assert 'theme' in serializer.errors

    def test_invalid_language_format(self):
        data = {'language': 'english'}
        serializer = UserPreferencesSerializer(data=data)
        assert not serializer.is_valid()
        assert 'language' in serializer.errors

    def test_watchlist_invalid_symbol(self):
        data = {'watchlist': ['AAPL', '!@#$']}
        serializer = UserPreferencesSerializer(data=data)
        assert not serializer.is_valid()
        assert 'watchlist' in serializer.errors

    def test_watchlist_duplicates_removed(self):
        data = {'watchlist': ['AAPL', 'MSFT', 'AAPL']}
        serializer = UserPreferencesSerializer(data=data)
        assert serializer.is_valid()
        # The validator should remove duplicates (via list(dict.fromkeys()))
        # We'll check that the validated data has unique symbols
        validated = serializer.validated_data
        # The validator function returns a list with duplicates removed
        assert validated['watchlist'] == ['AAPL', 'MSFT']

    def test_timezone_invalid(self):
        data = {'timezone': 'Invalid/Timezone'}
        serializer = UserPreferencesSerializer(data=data)
        assert not serializer.is_valid()
        assert 'timezone' in serializer.errors


# ============================================================================
# Test: UserAPIKeySerializer
# ============================================================================

class TestUserAPIKeySerializer:

    def test_serialize_key(self, test_user):
        key_obj, _ = UserAPIKey.create_key(test_user, 'Test Key')
        serializer = UserAPIKeySerializer(instance=key_obj)
        data = serializer.data
        assert data['id'] == key_obj.id
        assert data['name'] == 'Test Key'
        assert data['is_active'] is True
        assert 'key_preview' in data
        assert data['key_preview'] == key_obj.key_hash[-8:]
        assert 'created_at' in data
        assert 'last_used' in data

    def test_read_only_fields(self, test_user):
        key_obj, _ = UserAPIKey.create_key(test_user, 'Test Key')
        serializer = UserAPIKeySerializer(instance=key_obj)
        data = serializer.data
        # All fields should be read-only
        assert 'id' in data
        assert 'name' in data
        assert 'key_preview' in data
        assert 'created_at' in data
        assert 'last_used' in data
        assert 'is_active' in data