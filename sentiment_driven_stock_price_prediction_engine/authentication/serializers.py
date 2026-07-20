# authentication/serializers.py
"""
Serializers for authentication and account management.

This module defines serializers for:
- Registration, login, email verification (code & token)
- Password reset (request & confirm)
- Profile retrieval and update
- Password, email, and username changes
- Account deletion
- User preferences (investment goals, risk tolerance, watchlist)
- User API keys (management)

All serializers include validation, password confirmation checks,
and proper field‑level validation.
"""

import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.validators import EmailValidator
from .models import User, UserPreferences, UserAPIKey  # ✅ added UserAPIKey


# ============================================================================
# REGISTRATION & LOGIN
# ============================================================================

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.

    Requires password confirmation (password2). Password is validated
    against Django's password validators.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def validate(self, attrs):
        """Ensure passwords match."""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        """Create user with hashed password."""
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login.

    Accepts username (or email) and password.
    """
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})


# ============================================================================
# EMAIL VERIFICATION
# ============================================================================

class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for verifying email via token (GET request).
    """
    token = serializers.CharField(required=True)
    uid = serializers.CharField(required=True)


class EmailVerificationCodeSerializer(serializers.Serializer):
    """
    Serializer for verifying email via 6‑digit code (POST request).
    """
    code = serializers.CharField(
        required=True,
        min_length=6,
        max_length=6,
        help_text="6‑digit verification code sent via email."
    )


class VerifyEmailCodeSerializer(EmailVerificationCodeSerializer):
    """
    Alias for EmailVerificationCodeSerializer – kept for compatibility.
    """
    pass


# ============================================================================
# PASSWORD RESET
# ============================================================================

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a password reset email.
    """
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset with token.

    Requires password confirmation (password2).
    """
    token = serializers.CharField(required=True)
    uid = serializers.CharField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """Ensure passwords match."""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs


# ============================================================================
# PROFILE & ACCOUNT MANAGEMENT
# ============================================================================

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving and updating the authenticated user's profile.

    Read‑only fields: id, email, api_key, email_verified, tier, created_at, updated_at.
    Writable fields: first_name, last_name, persona, preferences, onboarded, username.
    """
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'persona', 'tier', 'api_key', 'email_verified',
            'onboarded', 'preferences', 'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'email', 'api_key', 'email_verified',
            'tier', 'created_at', 'updated_at'
        )


class UpdateProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for partial profile updates.

    Allows updating first_name, last_name, persona, preferences, username, and onboarded.
    All fields are optional.
    """
    class Meta:
        model = User
        fields = (
            'first_name', 'last_name', 'persona', 'preferences',
            'username', 'onboarded',
        )
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'persona': {'required': False},
            'preferences': {'required': False},
            'username': {'required': False},
            'onboarded': {'required': False},
        }


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing password.

    Requires old_password and new_password with confirmation.
    """
    old_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """Ensure new passwords match."""
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return attrs


class ChangeEmailSerializer(serializers.Serializer):
    """
    Serializer for requesting an email change.

    Requires new_email and password for confirmation.
    """
    new_email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    def validate_new_email(self, value):
        """Validate new email is not already taken."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value


class ChangeUsernameSerializer(serializers.Serializer):
    """
    Serializer for changing username.

    Requires new_username (3‑30 chars, alphanumeric + underscore) and password.
    """
    new_username = serializers.CharField(
        required=True,
        min_length=3,
        max_length=30
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    def validate_new_username(self, value):
        """Validate username format and uniqueness."""
        if not re.match(r'^[a-zA-Z0-9_]{3,30}$', value):
            raise serializers.ValidationError(
                "Username must be 3‑30 characters and contain only letters, numbers, and underscores."
            )
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value


class DeleteAccountSerializer(serializers.Serializer):
    """
    Serializer for account deletion.

    Requires password and confirmation string ('DELETE').
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    confirm = serializers.CharField(required=True)

    def validate_confirm(self, value):
        """Ensure the user typed the exact confirmation phrase."""
        if value != 'DELETE':
            raise serializers.ValidationError('Please type "DELETE" to confirm.')
        return value


# ============================================================================
# USER PREFERENCES SERIALIZER
# ============================================================================

class UserPreferencesSerializer(serializers.ModelSerializer):
    """
    Serializer for user investment preferences and watchlist.

    Used by UserPreferencesView to get/update preferences.
    All fields are optional on update (partial updates allowed).
    """
    class Meta:
        model = UserPreferences
        fields = (
            'investment_goal',
            'risk_tolerance',
            'experience_level',
            'watchlist',
            'email_notifications',
            'price_alerts',
            'news_alerts',
            'theme',
            'language',
            'timezone',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


# ============================================================================
# USER API KEY SERIALIZER (Phase 2)
# ============================================================================

class UserAPIKeySerializer(serializers.ModelSerializer):
    """
    Serializer for user‑owned API keys.

    We never expose the raw key – only the last 8 chars for display (key_preview).
    """
    key_preview = serializers.SerializerMethodField()

    class Meta:
        model = UserAPIKey
        fields = ['id', 'name', 'key_preview', 'created_at', 'last_used', 'is_active']
        read_only_fields = ['created_at', 'last_used', 'key_preview']

    def get_key_preview(self, obj):
        """Return last 8 characters of the hashed key for identification."""
        return obj.key_hash[-8:] if obj.key_hash else None