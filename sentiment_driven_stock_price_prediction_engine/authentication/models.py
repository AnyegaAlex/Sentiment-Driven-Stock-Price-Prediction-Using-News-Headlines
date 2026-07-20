# authentication/models.py
"""
Custom user model and related models for Tickflow Sentiment.

This module defines:
- User: Extends Django's AbstractUser with persona, tier, API key,
        email verification, preferences, onboarding flag, and
        username/email change tracking, plus account deletion scheduling.
- APIKey: For external API access (legacy/fallback).
- UserPreferences: Investment goals, risk tolerance, watchlist, and notification settings.
- AuditLog: For tracking sensitive user actions.

All models include proper constraints, indexing, and string representations.
"""

import secrets
import logging
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import make_password, check_password

logger = logging.getLogger(__name__)


# ============================================================================
# APIKey MODEL (Legacy / Fallback)
# ============================================================================

class APIKey(models.Model):
    """
    API key for external service access.

    Keys are generated automatically with a cryptographically secure token.
    They can be deactivated or set to expire.
    """
    key = models.CharField(
        max_length=64,
        unique=True,
        editable=False,
        help_text="Automatically generated secure token."
    )
    name = models.CharField(
        max_length=100,
        help_text="E.g., 'Production Frontend' or 'Third‑party Analytics'."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="If False, the key is rejected by the middleware."
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the key was created."
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional expiry date. If null, the key never expires."
    )

    class Meta:
        indexes = [
            models.Index(fields=['key']),
            models.Index(fields=['is_active', 'expires_at']),
        ]
        verbose_name = "API Key"
        verbose_name_plural = "API Keys"

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @classmethod
    def is_valid(cls, key):
        """
        Check if a given API key is valid (exists, active, and not expired).
        """
        try:
            obj = cls.objects.get(key=key, is_active=True)
            if obj.expires_at and obj.expires_at < timezone.now():
                return False
            return True
        except cls.DoesNotExist:
            logger.warning(f"API key validation failed: key not found or table missing")
            return False
        except Exception as e:
            logger.error(f"API key validation error: {e}")
            return False

    def __str__(self):
        return f"{self.name} - {self.key[:8]}..."


# ============================================================================
# USER MODEL (CORE)
# ============================================================================

class User(AbstractUser):
    """
    Custom user model for Tickflow Sentiment.

    Extends Django's AbstractUser with additional fields for:
        - Persona (trader, researcher, etc.)
        - Subscription tier (free, pro, enterprise)
        - API key for programmatic access (auto‑generated)
        - Email verification flag
        - JSON preferences store
        - Onboarding completion flag
        - Timestamps for creation and updates
        - Username change tracking (yearly limit: 2 changes)
        - Email change tracking (cooldown: 6 months)
        - Account deletion scheduling (30‑day grace period)

    The `api_key` is automatically generated on first save.
    """

    # ----- Persona & Tier -----
    PERSONA_CHOICES = (
        ('trader', 'Trader'),
        ('researcher', 'Quant Researcher'),
        ('developer', 'Developer'),
        ('analyst', 'Financial Analyst'),
        ('student', 'Student'),
    )
    persona = models.CharField(
        max_length=20,
        choices=PERSONA_CHOICES,
        blank=True,
        null=True,
        help_text="User's primary role or interest."
    )

    TIER_CHOICES = (
        ('free', 'Free'),
        ('pro', 'Pro'),
        ('enterprise', 'Enterprise'),
    )
    tier = models.CharField(
        max_length=20,
        choices=TIER_CHOICES,
        default='free',
        help_text="Subscription level."
    )

    # ----- API Key & Email Verification -----
    api_key = models.CharField(
        max_length=64,
        unique=True,
        blank=True,
        null=True,
        help_text="Auto‑generated API key for external access."
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

    # ----- Account Deletion (30‑day grace) -----
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

    class Meta:
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['api_key']),
            models.Index(fields=['onboarded']),
            models.Index(fields=['tier']),
        ]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def save(self, *args, **kwargs):
        """
        Auto‑generate an API key if one does not already exist.
        """
        if not self.api_key:
            self.api_key = self.generate_api_key()
        super().save(*args, **kwargs)

    @classmethod
    def generate_api_key(cls):
        """
        Generate a secure API key with a 'ts_' prefix.
        """
        return f"ts_{secrets.token_urlsafe(32)}"

    def __str__(self):
        return self.username


# ============================================================================
# USER PREFERENCES (NEW)
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

    INVESTMENT_GOAL_CHOICES = (
        ('growth', 'Growth'),
        ('income', 'Income'),
        ('value', 'Value'),
        ('trading', 'Trading'),
        ('retirement', 'Retirement'),
    )
    investment_goal = models.CharField(
        max_length=20,
        choices=INVESTMENT_GOAL_CHOICES,
        default='growth',
        help_text="Primary investment goal."
    )

    RISK_TOLERANCE_CHOICES = (
        ('conservative', 'Conservative'),
        ('moderate', 'Moderate'),
        ('aggressive', 'Aggressive'),
    )
    risk_tolerance = models.CharField(
        max_length=20,
        choices=RISK_TOLERANCE_CHOICES,
        default='moderate',
        help_text="Risk tolerance level."
    )

    EXPERIENCE_LEVEL_CHOICES = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    )
    experience_level = models.CharField(
        max_length=20,
        choices=EXPERIENCE_LEVEL_CHOICES,
        default='beginner',
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

    language = models.CharField(max_length=10, default='en', help_text="User's preferred language (ISO 639-1).")
    
    timezone = models.CharField(max_length=50, default='UTC', help_text="User's preferred timezone.")

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

    def __str__(self):
        return f"{self.user.username}'s preferences"


# ============================================================================
# AUDIT LOG MODEL
# ============================================================================

class AuditLog(models.Model):
    """
    Audit trail for sensitive user actions.

    Used to log events such as account deletion requests, password changes,
    email changes, and other security‑relevant actions.
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
        help_text="Action identifier (e.g., 'ACCOUNT_DELETION_REQUESTED')."
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context (IP address, scheduled date, etc.)."
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When the action was recorded."
    )

    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['action']),
            models.Index(fields=['-timestamp']),
        ]
        ordering = ['-timestamp']
        verbose_name = "Audit Log Entry"
        verbose_name_plural = "Audit Log Entries"

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
    


class UserAPIKey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100, help_text="E.g., 'Production Frontend'")
    key_hash = models.CharField(max_length=128, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['key_hash']),
        ]

    def __str__(self):
        return f"{self.user.username} – {self.name}"

    @classmethod
    def generate_raw_key(cls):
        return f"ts_{secrets.token_urlsafe(32)}"

    @classmethod
    def create_key(cls, user, name):
        raw = cls.generate_raw_key()
        hashed = make_password(raw)
        key_obj = cls.objects.create(user=user, name=name, key_hash=hashed)
        return key_obj, raw  # return both so we can show raw key once

    def validate_key(self, raw_key):
        return check_password(raw_key, self.key_hash)
    


class SymbolUsage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    symbol = models.CharField(max_length=10)
    count = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'symbol')
        indexes = [
            models.Index(fields=['user', 'symbol']),
        ]

    def __str__(self):
        return f"{self.user.username if self.user else 'Anonymous'} – {self.symbol} ({self.count})"