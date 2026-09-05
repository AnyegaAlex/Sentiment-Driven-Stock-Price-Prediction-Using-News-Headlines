"""
Tier 11: Signals

Tests Django signals: post_save, pre_delete, m2m_changed, etc.
Currently, no signals are implemented in the codebase.
This file serves as a placeholder and test for any future signals.

Author: Tickflow Capital
Version: 1.0.0
"""

import pytest
from django.db.models.signals import post_save
from django.contrib.auth import get_user_model
from authentication.models import UserPreferences

User = get_user_model()
pytestmark = pytest.mark.django_db


class TestSignals:
    def test_no_duplicate_signals(self):
        """Ensure no duplicate signal connections that could cause double firing."""
        # This is a basic sanity check; we can inspect the receivers list
        receivers = post_save.receivers
        # No specific test, just a placeholder

    def test_user_preferences_creation_not_signal(self):
        """UserPreferences are created in RegisterView, not via signal."""
        # This test ensures that creating a user does not automatically create preferences via signal
        user = User.objects.create_user(username="testuser", email="test@example.com", password="pass")
        # Preferences should not be created automatically
        assert not UserPreferences.objects.filter(user=user).exists()