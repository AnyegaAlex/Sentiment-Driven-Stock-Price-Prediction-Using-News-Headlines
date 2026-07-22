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

All serializers include thorough validation, password confirmation checks,
field-level validation, and proper error messages.
"""

import re
import logging
from typing import Dict, Any, Optional

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.validators import EmailValidator, ValidationError, RegexValidator
from django.utils import timezone
from rest_framework import serializers

from .models import User, UserPreferences, UserAPIKey

logger = logging.getLogger(__name__)

# Constants
USERNAME_REGEX = r'^[a-zA-Z0-9_]{3,30}$'
USERNAME_HELP_TEXT = "3-30 characters, letters, numbers, and underscores only."


# ============================================================================
# CUSTOM VALIDATORS
# ============================================================================

def validate_email_domain(email: str) -> str:
    """
    Validate email domain is not disposable or temporary.
    
    This is a basic check – consider using a service like:
    - https://github.com/martenson/disposable-email-domains
    - Or a commercial API like Kickbox, Hunter, or ZeroBounce
    """
    # Common disposable email domains to block
    disposable_domains = [
        'tempmail.com', '10minutemail.com', 'guerrillamail.com',
        'throwaway.com', 'mailinator.com', 'trashmail.com',
    ]
    
    domain = email.split('@')[-1].lower()
    if domain in disposable_domains:
        raise serializers.ValidationError(
            "Please use a permanent email address. Temporary email services are not allowed."
        )
    
    return email


def validate_symbol_list(value: list) -> list:
    """Validate that watchlist contains valid stock symbols."""
    if not value:
        return value
    
    valid_symbols = []
    for symbol in value:
        symbol = symbol.upper().strip()
        # Basic validation: alphanumeric, 1-10 characters
        if not symbol or len(symbol) > 10 or not re.match(r'^[A-Z0-9.]{1,10}$', symbol):
            raise serializers.ValidationError(
                f"Invalid symbol '{symbol}'. Symbols must be 1-10 alphanumeric characters."
            )
        valid_symbols.append(symbol)
    
    # Remove duplicates
    return list(dict.fromkeys(valid_symbols))


def validate_timezone(value: str) -> str:
    """Validate that timezone is valid."""
    import pytz
    if value not in pytz.all_timezones:
        raise serializers.ValidationError(f"Invalid timezone: {value}")
    return value


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
        style={'input_type': 'password'},
        help_text="Password (min 8 characters, not too common)"
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Confirm password"
    )
    
    # Custom email field with additional validation
    email = serializers.EmailField(
        required=True,
        validators=[validate_email_domain],
        help_text="Valid email address (no temporary email services)"
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False, 'help_text': "First name (optional)"},
            'last_name': {'required': False, 'help_text': "Last name (optional)"},
            'username': {
                'help_text': USERNAME_HELP_TEXT,
                'validators': [
                    RegexValidator(  
                        regex=USERNAME_REGEX,
                        message=USERNAME_HELP_TEXT
                    )
                ]
            }
        }

    def validate(self, attrs: Dict) -> Dict:
        """Ensure passwords match."""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def validate_username(self, value: str) -> str:
        """Validate username is not already taken (case-insensitive)."""
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value: str) -> str:
        """Normalize email to lowercase."""
        return value.lower()

    def create(self, validated_data: Dict) -> User:
        """Create user with hashed password."""
        # Normalize email
        validated_data['email'] = validated_data['email'].lower()
        
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        user.set_password(validated_data['password'])
        user.save()
        
        logger.info(f"User created via registration: {user.email}")
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login.

    Accepts username (or email) and password.
    """
    username = serializers.CharField(
        required=True,
        help_text="Username or email address"
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Password"
    )

    def validate_username(self, value: str) -> str:
        """Trim whitespace from username/email."""
        return value.strip()


# ============================================================================
# EMAIL VERIFICATION
# ============================================================================

class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for verifying email via token (GET request).
    """
    token = serializers.CharField(
        required=True,
        help_text="Verification token from email link"
    )
    uid = serializers.CharField(
        required=True,
        help_text="Base64-encoded user ID"
    )


class EmailVerificationCodeSerializer(serializers.Serializer):
    """
    Serializer for verifying email via 6-digit code (POST request).
    """
    code = serializers.CharField(
        required=True,
        min_length=6,
        max_length=6,
        validators=[
            RegexValidator(  
                regex=r'^[0-9]{6}$',
                message="Verification code must be exactly 6 digits."
            )
        ],
        help_text="6-digit verification code sent via email"
    )


# ============================================================================
# PASSWORD RESET
# ============================================================================

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a password reset email.
    """
    email = serializers.EmailField(
        required=True,
        help_text="Email address associated with the account"
    )

    def validate_email(self, value: str) -> str:
        """Normalize email to lowercase."""
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset with token.

    Requires password confirmation (password2).
    """
    token = serializers.CharField(
        required=True,
        help_text="Password reset token"
    )
    uid = serializers.CharField(
        required=True,
        help_text="Base64-encoded user ID"
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        help_text="New password (min 8 characters, not too common)"
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Confirm new password"
    )

    def validate(self, attrs: Dict) -> Dict:
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

    Read-only fields: id, email, email_verified, tier, created_at, updated_at.
    Writable fields: first_name, last_name, persona, preferences, onboarded, username.
    
    NOTE: api_key is intentionally excluded for security.
    """
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'persona', 'tier', 'email_verified',
            'onboarded', 'preferences', 'created_at', 'updated_at'
        )
        read_only_fields = (
            'id', 'email', 'email_verified',
            'tier', 'created_at', 'updated_at'
        )
        extra_kwargs = {
            'username': {'help_text': USERNAME_HELP_TEXT},
            'persona': {'help_text': "User persona: trader, researcher, developer, analyst, student"},
            'preferences': {'help_text': "User preferences (theme, notification settings, etc.)"},
            'onboarded': {'help_text': "Whether the user has completed onboarding"},
        }


class UpdateProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for partial profile updates.

    Allows updating first_name, last_name, persona, preferences, username, and onboarded.
    All fields are optional.
    """
    username = serializers.CharField(
        required=False,
        validators=[
            RegexValidator(  
                regex=USERNAME_REGEX,
                message=USERNAME_HELP_TEXT
            )
        ],
        help_text=USERNAME_HELP_TEXT
    )

    class Meta:
        model = User
        fields = (
            'first_name', 'last_name', 'persona', 'preferences',
            'username', 'onboarded',
        )
        extra_kwargs = {
            'first_name': {'required': False, 'help_text': "First name (optional)"},
            'last_name': {'required': False, 'help_text': "Last name (optional)"},
            'persona': {'required': False, 'help_text': "User persona"},
            'preferences': {'required': False, 'help_text': "User preferences"},
            'username': {'required': False, 'help_text': USERNAME_HELP_TEXT},
            'onboarded': {'required': False, 'help_text': "Onboarding completion status"},
        }

    def validate_username(self, value: str) -> str:
        """Validate username is not already taken (case-insensitive)."""
        user = self.instance
        if User.objects.filter(username__iexact=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing password.

    Requires old_password and new_password with confirmation.
    """
    old_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Current password"
    )
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        help_text="New password (min 8 characters, not too common)"
    )
    new_password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Confirm new password"
    )

    def validate(self, attrs: Dict) -> Dict:
        """Ensure new passwords match."""
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return attrs


class ChangeEmailSerializer(serializers.Serializer):
    """
    Serializer for requesting an email change.

    Requires new_email and password for confirmation.
    Password validation is performed in the view, but we validate here too.
    """
    new_email = serializers.EmailField(
        required=True,
        help_text="New email address"
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Current password for confirmation"
    )

    def validate_new_email(self, value: str) -> str:
        """Validate new email is not already taken (case-insensitive)."""
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_password(self, value: str) -> str:
        """Validate password is provided (actual check done in view)."""
        if not value:
            raise serializers.ValidationError("Password is required.")
        return value


class ChangeUsernameSerializer(serializers.Serializer):
    """
    Serializer for changing username.

    Requires new_username (3-30 chars, alphanumeric + underscore) and password.
    """
    new_username = serializers.CharField(
        required=True,
        min_length=3,
        max_length=30,
        validators=[
            RegexValidator(  
                regex=USERNAME_REGEX,
                message=USERNAME_HELP_TEXT
            )
        ],
        help_text=USERNAME_HELP_TEXT
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Current password for confirmation"
    )

    def validate_new_username(self, value: str) -> str:
        """Validate username format and uniqueness (case-insensitive)."""
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value: str) -> str:
        """Validate password is provided (actual check done in view)."""
        if not value:
            raise serializers.ValidationError("Password is required.")
        return value


class DeleteAccountSerializer(serializers.Serializer):
    """
    Serializer for account deletion.

    Requires password and confirmation string ('DELETE').
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Current password for confirmation"
    )
    confirm = serializers.CharField(
        required=True,
        help_text='Type "DELETE" to confirm account deletion'
    )

    def validate_confirm(self, value: str) -> str:
        """Ensure the user typed the exact confirmation phrase."""
        if value != 'DELETE':
            raise serializers.ValidationError('Please type "DELETE" to confirm.')
        return value

    def validate_password(self, value: str) -> str:
        """Validate password is provided (actual check done in view)."""
        if not value:
            raise serializers.ValidationError("Password is required.")
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
    watchlist = serializers.ListField(
        required=False,
        default=list,
        child=serializers.CharField(max_length=10),
        validators=[validate_symbol_list],
        help_text="List of stock symbols to track"
    )
    
    timezone = serializers.CharField(
        required=False,
        default='UTC',
        validators=[validate_timezone],
        help_text="User's timezone (e.g., 'America/New_York')"
    )

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
        extra_kwargs = {
            'investment_goal': {'help_text': "Investment goal: growth, income, value, trading, retirement"},
            'risk_tolerance': {'help_text': "Risk tolerance: conservative, moderate, aggressive"},
            'experience_level': {'help_text': "Experience level: beginner, intermediate, advanced"},
            'email_notifications': {'help_text': "Enable email notifications"},
            'price_alerts': {'help_text': "Enable price alert notifications"},
            'news_alerts': {'help_text': "Enable news alert notifications"},
            'theme': {'help_text': "UI theme: light or dark"},
            'language': {'help_text': "Language code (e.g., 'en', 'fr', 'es')"},
        }

    def validate_language(self, value: str) -> str:
        """Validate language code."""
        # Basic check for ISO 639-1 format
        if not re.match(r'^[a-z]{2}$', value):
            raise serializers.ValidationError(
                "Language must be a 2-character ISO 639-1 code (e.g., 'en', 'fr', 'es')."
            )
        return value

    def validate_theme(self, value: str) -> str:
        """Validate theme is 'light' or 'dark'."""
        if value not in ['light', 'dark']:
            raise serializers.ValidationError("Theme must be 'light' or 'dark'.")
        return value

    def create(self, validated_data: Dict) -> UserPreferences:
        """Create user preferences with default values."""
        # Remove watchlist if empty
        if 'watchlist' in validated_data and not validated_data['watchlist']:
            validated_data['watchlist'] = []
        
        return super().create(validated_data)

    def update(self, instance: UserPreferences, validated_data: Dict) -> UserPreferences:
        """Update user preferences."""
        # Remove watchlist if empty
        if 'watchlist' in validated_data and not validated_data['watchlist']:
            validated_data['watchlist'] = []
        
        return super().update(instance, validated_data)


# ============================================================================
# USER API KEY SERIALIZER (Phase 2)
# ============================================================================

class UserAPIKeySerializer(serializers.ModelSerializer):
    """
    Serializer for user-owned API keys.

    We never expose the raw key – only the last 8 chars for display (key_preview).
    """
    key_preview = serializers.SerializerMethodField(
        help_text="Last 8 characters of the hashed key for identification"
    )
    
    is_active = serializers.BooleanField(
        read_only=True,
        help_text="Whether the key is active (deactivated keys are not usable)"
    )

    class Meta:
        model = UserAPIKey
        fields = ['id', 'name', 'key_preview', 'created_at', 'last_used', 'is_active']
        read_only_fields = ['id', 'created_at', 'last_used', 'key_preview', 'is_active']
        extra_kwargs = {
            'name': {'help_text': "Human-readable name for the API key"},
        }

    def get_key_preview(self, obj: UserAPIKey) -> Optional[str]:
        """Return last 8 characters of the hashed key for identification."""
        return obj.key_hash[-8:] if obj.key_hash else None