"""
Management command to deactivate expired API keys.

Runs daily at 3:00 AM to ensure security compliance.
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from authentication.models import UserAPIKey

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Deactivate API keys that have passed their expiration date.
    """
    help = 'Deactivate expired API keys for security'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deactivated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        now = timezone.now()

        # Find expired keys that are still active
        expired_keys = UserAPIKey.objects.filter(
            expires_at__isnull=False,
            expires_at__lte=now,
            is_active=True
        )

        count = expired_keys.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No expired API keys found'))
            return

        self.stdout.write(f'Found {count} expired API key(s)')

        if dry_run:
            for key in expired_keys:
                self.stdout.write(f'  - {key.user.username} / {key.name} (expired {key.expires_at})')
            return

        # Perform deactivation
        with transaction.atomic():
            updated = expired_keys.update(is_active=False)
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deactivated {updated} API key(s)')
            )

        # Log completion
        logger.info(f'Deactivated {updated} expired API keys')