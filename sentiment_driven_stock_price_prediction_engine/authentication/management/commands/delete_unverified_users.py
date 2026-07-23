"""
Management command to remove users who never verified their email.

Runs daily at 2:00 AM to prevent database clutter.
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from authentication.models import User

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Delete users who haven't verified their email within a grace period.
    """
    help = 'Delete unverified users older than N days'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Grace period in days (default: 7)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without making changes',
        )

    def handle(self, *args, **options):
        grace_days = options.get('days', 7)
        dry_run = options.get('dry_run', False)

        cutoff = timezone.now() - timedelta(days=grace_days)

        # Find unverified users older than cutoff
        users = User.objects.filter(
            email_verified=False,
            created_at__lte=cutoff,
            is_active=True  # Only active users; don't delete already deactivated
        )

        count = users.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No unverified users to delete'))
            return

        self.stdout.write(f'Found {count} unverified user(s) older than {grace_days} days')

        if dry_run:
            for user in users[:10]:
                self.stdout.write(f'  - {user.email} (created {user.created_at})')
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more')
            return

        # Delete users
        with transaction.atomic():
            deleted = users.delete()[0]
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {deleted} unverified user(s)')
            )

        logger.info(f'Deleted {deleted} unverified users (grace period: {grace_days} days)')