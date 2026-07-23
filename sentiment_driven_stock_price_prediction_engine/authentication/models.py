"""
Custom user model and related models for Tickflow Sentiment.

This module defines:
- User: Extends Django's AbstractUser with persona, tier, email verification,
        preferences, onboarding flag, username/email change tracking, and 
        account deletion scheduling.
- UserPreferences: Investment goals, risk tolerance, watchlist, and notification settings.
- UserAPIKey: Hashed API keys for external access (multiple per user).
- AuditLog: For tracking sensitive user actions.
- SymbolUsage: For tracking symbol analysis frequency.

All models include proper constraints, indexing, and string representations.
"""

import secrets
import logging
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import make_password, check_password
from django.core.validators import MinValueValidator, MaxValueValidator

logger = logging.getLogger(__name__)


# ============================================================================
# CONSTANTS & CHOICES
# ============================================================================

class PersonaChoices:
    TRADER = 'trader'
    RESEARCHER = 'researcher'
    DEVELOPER = 'developer'
    ANALYST = 'analyst'
    STUDENT = 'student'
    
    CHOICES = (
        (TRADER, 'Trader'),
        (RESEARCHER, 'Quant Researcher'),
        (DEVELOPER, 'Developer'),
        (ANALYST, 'Financial Analyst'),
        (STUDENT, 'Student'),
    )


class TierChoices:
    FREE = 'free'
    PRO = 'pro'
    ENTERPRISE = 'enterprise'
    
    CHOICES = (
        (FREE, 'Free'),
        (PRO, 'Pro'),
        (ENTERPRISE, 'Enterprise'),
    )


class InvestmentGoalChoices:
    GROWTH = 'growth'
    INCOME = 'income'
    VALUE = 'value'
    TRADING = 'trading'
    RETIREMENT = 'retirement'
    
    CHOICES = (
        (GROWTH, 'Growth'),
        (INCOME, 'Income'),
        (VALUE, 'Value'),
        (TRADING, 'Trading'),
        (RETIREMENT, 'Retirement'),
    )


class RiskToleranceChoices:
    CONSERVATIVE = 'conservative'
    MODERATE = 'moderate'
    AGGRESSIVE = 'aggressive'
    
    CHOICES = (
        (CONSERVATIVE, 'Conservative'),
        (MODERATE, 'Moderate'),
        (AGGRESSIVE, 'Aggressive'),
    )


class ExperienceLevelChoices:
    BEGINNER = 'beginner'
    INTERMEDIATE = 'intermediate'
    ADVANCED = 'advanced'
    
    CHOICES = (
        (BEGINNER, 'Beginner'),
        (INTERMEDIATE, 'Intermediate'),
        (ADVANCED, 'Advanced'),
    )


class AuditLogActions:
    ACCOUNT_CREATED = 'ACCOUNT_CREATED'
    LOGIN_SUCCESS = 'LOGIN_SUCCESS'
    LOGIN_FAILED = 'LOGIN_FAILED'
    EMAIL_VERIFIED = 'EMAIL_VERIFIED'
    VERIFICATION_RESENT = 'VERIFICATION_RESENT'
    PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED'
    PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED'
    PASSWORD_CHANGED = 'PASSWORD_CHANGED'
    EMAIL_CHANGE_REQUESTED = 'EMAIL_CHANGE_REQUESTED'
    EMAIL_CHANGED = 'EMAIL_CHANGED'
    USERNAME_CHANGED = 'USERNAME_CHANGED'
    PROFILE_UPDATED = 'PROFILE_UPDATED'
    API_KEY_CREATED = 'API_KEY_CREATED'
    API_KEY_REVOKED = 'API_KEY_REVOKED'
    ACCOUNT_DELETION_REQUESTED = 'ACCOUNT_DELETION_REQUESTED'
    ACCOUNT_DELETION_CANCELLED = 'ACCOUNT_DELETION_CANCELLED'
    WATCHLIST_ADDED = 'WATCHLIST_ADDED'
    WATCHLIST_REMOVED = 'WATCHLIST_REMOVED'


# ============================================================================
# USER MODEL (CORE)
# ============================================================================

class User(AbstractUser):
    """
    Custom user model for Tickflow Sentiment.

    Extends Django's AbstractUser with additional fields for:
        - Persona (trader, researcher, etc.)
        - Subscription tier (free, pro, enterprise)
        - Email verification flag
        - JSON preferences store
        - Onboarding completion flag
        - Timestamps for creation and updates
        - Username change tracking (yearly limit: 2 changes)
        - Email change tracking (cooldown: 6 months)
        - Account deletion scheduling (30-day grace period)

    NOTE: The legacy api_key field is deprecated. Use UserAPIKey model instead.
    """

    # ----- Persona & Tier -----
    persona = models.CharField(
        max_length=20,
        choices=PersonaChoices.CHOICES,
        blank=True,
        null=True,
        help_text="User's primary role or interest."
    )

    tier = models.CharField(
        max_length=20,
        choices=TierChoices.CHOICES,
        default=TierChoices.FREE,
        help_text="Subscription level."
    )

    # ----- API Key (Deprecated) & Email Verification -----
    api_key = models.CharField(
        max_length=64,
        unique=True,
        blank=True,
        null=True,
        help_text="DEPRECATED: Auto-generated API key. Use UserAPIKey model instead."
    )
    email_verified = models.BooleanField(
        default=False,
        help_text="Whether the user has verified their email address."
    )

    # ----- Preferences & Onboarding -----
    preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="User preferences (theme, notification settings, etc.)."
    )
    onboarded = models.BooleanField(
        default=False,
        help_text="Whether the user has completed the onboarding flow."
    )

    # ----- Timestamps -----
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Account creation timestamp."
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last update timestamp."
    )

    # ----- Username & Email Change Tracking -----
    username_change_year = models.IntegerField(
        default=0,
        help_text="Year of the first username change in the current cycle."
    )
    username_change_count_year = models.IntegerField(
        default=0,
        help_text="Number of username changes made this year (max 2)."
    )
    last_username_change = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the last username change."
    )
    last_email_change = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the last email change (cooldown: 6 months)."
    )

    # ----- Account Deletion (30-day grace) -----
    deletion_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when deletion was requested."
    )
    deletion_scheduled_for = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date when the account will be permanently deleted."
    )

    # ============================================================
    #  Usage Statistics
    # ============================================================
    analyses_count = models.PositiveIntegerField(
        default=0,
        help_text="Total number of stock analyses performed."
    )
    predictions_count = models.PositiveIntegerField(
        default=0,
        help_text="Total number of LSTM predictions generated."
    )
    news_read_count = models.PositiveIntegerField(
        default=0,
        help_text="Total number of news articles viewed."
    )

    # ============================================================
    # Cached Prediction Accuracy (new)
    # ============================================================
    prediction_accuracy = models.FloatField(
        default=0.0,
        help_text="Cached average prediction accuracy as percentage (0-100)."
    )

    nickname = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="User's preferred nickname (optional)."
    )
    bio = models.TextField(
        blank=True,
        null=True,
        help_text="Short biography about the user (optional)."
    )

    class Meta:
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['api_key']),
            models.Index(fields=['onboarded']),
            models.Index(fields=['tier']),
            models.Index(fields=['-created_at']),
        ]
        ordering = ['-created_at']
        verbose_name = "User"
        verbose_name_plural = "Users"

    def save(self, *args, **kwargs):
        """Auto-generate deprecated API key if not present."""
        if not self.api_key:
            self.api_key = self.generate_api_key()
        super().save(*args, **kwargs)

    @classmethod
    def generate_api_key(cls):
        """
        DEPRECATED: Generate a legacy API key.
        Use UserAPIKey.create_key() instead.
        """
        return f"ts_{secrets.token_urlsafe(32)}"

    def __str__(self):
        return self.username


# ============================================================================
# USER PREFERENCES
# ============================================================================

class UserPreferences(models.Model):
    """
    User investment preferences and watchlist.

    This model stores a user's investment goals, risk tolerance,
    experience level, notification settings, and watchlist.

    It is linked to the User model via a OneToOneField.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='user_preferences',
        help_text="The user these preferences belong to."
    )

    investment_goal = models.CharField(
        max_length=20,
        choices=InvestmentGoalChoices.CHOICES,
        default=InvestmentGoalChoices.GROWTH,
        help_text="Primary investment goal."
    )

    risk_tolerance = models.CharField(
        max_length=20,
        choices=RiskToleranceChoices.CHOICES,
        default=RiskToleranceChoices.MODERATE,
        help_text="Risk tolerance level."
    )

    experience_level = models.CharField(
        max_length=20,
        choices=ExperienceLevelChoices.CHOICES,
        default=ExperienceLevelChoices.BEGINNER,
        help_text="Trading experience level."
    )

    # Watchlist – stored as a list of symbol strings
    watchlist = models.JSONField(
        default=list,
        blank=True,
        help_text="List of stock symbols the user wants to track."
    )

    # Notification preferences
    email_notifications = models.BooleanField(
        default=True,
        help_text="Whether to send email notifications."
    )
    price_alerts = models.BooleanField(
        default=True,
        help_text="Whether to send price alert notifications."
    )
    news_alerts = models.BooleanField(
        default=True,
        help_text="Whether to send news alert notifications."
    )

    # Theme preference
    theme = models.CharField(
        max_length=20,
        default='light',
        help_text="UI theme preference (light/dark)."
    )

    language = models.CharField(
        max_length=10,
        default='en',
        help_text="User's preferred language (ISO 639-1)."
    )
    
    timezone = models.CharField(
        max_length=50,
        default='UTC',
        help_text="User's preferred timezone."
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the preferences were first created."
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the preferences were last updated."
    )

    class Meta:
        verbose_name = "User Preferences"
        verbose_name_plural = "User Preferences"
        indexes = [
            models.Index(fields=['user']),
        ]

    def clean(self):
        """Validate preferences data."""
        # Validate theme
        if self.theme not in ['light', 'dark']:
            raise models.ValidationError({'theme': 'Theme must be "light" or "dark".'})
        
        # Validate language (basic)
        if self.language and not isinstance(self.language, str):
            raise models.ValidationError({'language': 'Language must be a string.'})
        
        # Validate watchlist symbols (basic)
        if self.watchlist:
            for symbol in self.watchlist:
                if not symbol or not isinstance(symbol, str) or len(symbol) > 10:
                    raise models.ValidationError(
                        {'watchlist': f'Invalid symbol: {symbol}'}
                    )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username}'s preferences"


# ============================================================================
# USER API KEY (Hashed)
# ============================================================================

class UserAPIKey(models.Model):
    """
    Hashed API key for external access.

    Supports multiple keys per user with proper hashing.
    Each key can be individually revoked.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='api_keys',
        help_text="The user who owns this API key."
    )
    name = models.CharField(
        max_length=100,
        help_text="Human-readable name (e.g., 'Production Frontend')"
    )
    key_hash = models.CharField(
        max_length=128,
        unique=True,
        editable=False,
        help_text="Hashed version of the API key (never exposed)."
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the key was created."
    )
    last_used = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this key was used."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the key is active (deactivated keys are rejected)."
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional expiry date. If null, the key never expires."
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['key_hash']),
            models.Index(fields=['last_used']),
            models.Index(fields=['created_at']),
        ]
        unique_together = [['user', 'name']]
        verbose_name = "User API Key"
        verbose_name_plural = "User API Keys"

    def __str__(self):
        return f"{self.user.username} – {self.name}"

    @classmethod
    def generate_raw_key(cls) -> str:
        """Generate a raw API key with 'ts_' prefix."""
        return f"ts_{secrets.token_urlsafe(32)}"

    @classmethod
    def create_key(cls, user, name: str, expires_at=None):
        """
        Create a new API key for a user.
        
        Args:
            user: User instance
            name: Human-readable key name
            expires_at: Optional expiry date
        
        Returns:
            tuple: (UserAPIKey instance, raw_key_string)
        """
        raw = cls.generate_raw_key()
        hashed = make_password(raw)
        
        key_obj = cls.objects.create(
            user=user,
            name=name,
            key_hash=hashed,
            expires_at=expires_at,
            is_active=True,
        )
        
        logger.info(f"API key created for user {user.id}: {name}")
        return key_obj, raw

    def validate_key(self, raw_key: str) -> bool:
        """Validate a raw key against the stored hash."""
        if not self.is_active:
            return False
        
        if self.expires_at and self.expires_at < timezone.now():
            return False
        
        return check_password(raw_key, self.key_hash)

    def revoke(self):
        """Revoke this API key."""
        self.is_active = False
        self.save()
        logger.info(f"API key revoked: {self.user.id} - {self.name}")


# ============================================================================
# AUDIT LOG MODEL
# ============================================================================

class AuditLog(models.Model):
    """
    Audit trail for sensitive user actions.

    Used to log events such as account deletion requests, password changes,
    email changes, and other security-relevant actions.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text="The user who performed the action (or null if deleted)."
    )
    action = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Action identifier (e.g., 'ACCOUNT_DELETION_REQUESTED')."
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context (IP address, scheduled date, etc.)."
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the action was recorded."
    )

    class Meta:
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
        ordering = ['-timestamp']
        verbose_name = "Audit Log Entry"
        verbose_name_plural = "Audit Log Entries"

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"


# ============================================================================
# SYMBOL USAGE MODEL
# ============================================================================

class SymbolUsage(models.Model):
    """
    Tracks how often users analyze specific symbols.
    
    Used for analytics and to show popular symbols.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="The user who analyzed this symbol (null for anonymous)."
    )
    symbol = models.CharField(
        max_length=10,
        db_index=True,
        help_text="Stock symbol (e.g., 'AAPL')."
    )
    count = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Number of times this symbol was analyzed."
    )
    last_updated = models.DateTimeField(
        auto_now=True,
        db_index=True,
        help_text="Last time this symbol was analyzed."
    )

    class Meta:
        unique_together = ('user', 'symbol')
        indexes = [
            models.Index(fields=['user', 'symbol']),
            models.Index(fields=['-last_updated']),
            models.Index(fields=['-count']),
        ]
        ordering = ['-count']
        verbose_name = "Symbol Usage"
        verbose_name_plural = "Symbol Usage"

    def __str__(self):
        user_label = self.user.username if self.user else 'Anonymous'
        return f"{user_label} – {self.symbol} ({self.count})"

    @classmethod
    def record_usage(cls, user, symbol: str):
        """Record a symbol analysis by a user."""
        symbol = symbol.upper()
        obj, created = cls.objects.get_or_create(
            user=user,
            symbol=symbol,
            defaults={'count': 0}
        )
        obj.count += 1
        obj.save(update_fields=['count', 'last_updated'])
        return obj


# ============================================================================
# DEPRECATED: Legacy APIKey Model (Keep for migration compatibility)
# ============================================================================

# class APIKey(models.Model):
#     """
#     DEPRECATED: Legacy API key model. Use UserAPIKey instead.
#     This model is kept only for migration compatibility.
#     """
#     ...  # Remove this model in a future migration