"""
Management command to clean up expired sessions and JWT tokens.

Runs daily at 2:30 AM for security and performance.
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.sessions.models import Session
from django.db import transaction

from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Remove expired Django sessions and old blacklisted tokens.
    """
    help = 'Clean up expired sessions and JWT tokens'

    def add_arguments(self, parser):
        parser.add_argument(
            '--token-retention-days',
            type=int,
            default=30,
            help='Days to retain blacklisted tokens (default: 30)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cleaned without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        token_retention_days = options.get('token_retention_days', 30)
        now = timezone.now()

        # Clean expired sessions
        expired_sessions = Session.objects.filter(expire_date__lte=now)
        session_count = expired_sessions.count()

        self.stdout.write(f'Found {session_count} expired session(s)')

        # Clean old blacklisted tokens
        cutoff = now - timedelta(days=token_retention_days)
        old_tokens = BlacklistedToken.objects.filter(blacklisted_at__lte=cutoff)
        token_count = old_tokens.count()

        self.stdout.write(f'Found {token_count} blacklisted token(s) older than {token_retention_days} days')

        if dry_run:
            self.stdout.write('Dry-run mode – no changes made')
            return

        with transaction.atomic():
            # Delete sessions
            session_deleted = expired_sessions.delete()[0]
            # Delete tokens
            token_deleted = old_tokens.delete()[0]

            self.stdout.write(
                self.style.SUCCESS(
                    f'Cleaned up {session_deleted} sessions and {token_deleted} tokens'
                )
            )

        logger.info(
            f'Cleaned up {session_deleted} sessions and {token_deleted} tokens '
            f'(retention days: {token_retention_days})'
        )