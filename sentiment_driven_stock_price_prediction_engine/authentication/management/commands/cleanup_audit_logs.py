"""
Management command to remove old audit logs.

Runs weekly on Sunday at 4:00 AM to prevent database bloat.
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from authentication.models import AuditLog

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Delete audit logs older than 90 days.
    """
    help = 'Remove audit logs older than 90 days'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days to retain (default: 90)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without making changes',
        )

    def handle(self, *args, **options):
        retention_days = options.get('days', 90)
        dry_run = options.get('dry_run', False)

        cutoff = timezone.now() - timedelta(days=retention_days)

        # Find logs to delete
        old_logs = AuditLog.objects.filter(timestamp__lte=cutoff)

        count = old_logs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No audit logs older than retention period'))
            return

        self.stdout.write(f'Found {count} audit log(s) older than {retention_days} days')

        if dry_run:
            # Show sample of what would be deleted
            sample = old_logs[:10]
            for log in sample:
                self.stdout.write(f'  - {log.user} / {log.action} / {log.timestamp}')
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more')
            return

        # Perform deletion
        with transaction.atomic():
            deleted = old_logs.delete()[0]
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {deleted} audit log(s)')
            )

        logger.info(f'Deleted {deleted} audit logs older than {retention_days} days')