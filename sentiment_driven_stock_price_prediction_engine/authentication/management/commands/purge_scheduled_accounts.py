"""Permanently purge accounts whose 30-day deletion grace period has ended."""

import logging

from django.contrib.admin.models import LogEntry
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from authentication.models import AuditLog, User

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Permanently delete accounts whose scheduled deletion date has passed'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report eligible accounts without deleting anything',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Maximum number of accounts to process in one run (default: 100)',
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        if batch_size < 1 or batch_size > 1000:
            raise CommandError('--batch-size must be between 1 and 1000')

        now = timezone.now()
        eligible = User.objects.filter(
            is_active=False,
            deletion_requested_at__isnull=False,
            deletion_scheduled_for__lte=now,
        ).order_by('deletion_scheduled_for', 'pk')

        if options['dry_run']:
            count = eligible.count()
            self.stdout.write(f'{count} account(s) are eligible for permanent deletion.')
            return

        user_ids = list(eligible.values_list('pk', flat=True)[:batch_size])
        deleted = 0
        skipped = 0
        failed = 0

        for user_id in user_ids:
            try:
                with transaction.atomic():
                    # Re-check under a row lock so a cancellation that wins the
                    # race with this worker prevents the account from being purged.
                    user = User.objects.select_for_update().filter(pk=user_id).first()
                    if (
                        user is None
                        or user.is_active
                        or user.deletion_requested_at is None
                        or user.deletion_scheduled_for is None
                        or user.deletion_scheduled_for > timezone.now()
                    ):
                        skipped += 1
                        continue

                    # Audit details may contain IP addresses, email addresses or
                    # other identifiers. Remove user-linked logs with the account.
                    AuditLog.objects.filter(user_id=user_id).delete()
                    LogEntry.objects.filter(user_id=user_id).delete()

                    # Cascades remove preferences, API keys, symbol usage,
                    # predictions and other user-owned records. Legal acceptance
                    # evidence is deliberately SET_NULL and remains unlinked.
                    user.delete()
                    deleted += 1
            except Exception as exc:
                failed += 1
                logger.error(
                    'Scheduled account purge failed for user_id=%s (%s)',
                    user_id,
                    type(exc).__name__,
                    exc_info=True,
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Account purge complete: deleted={deleted}, skipped={skipped}, failed={failed}.'
            )
        )
        if failed:
            raise CommandError(f'{failed} account(s) could not be purged; inspect the service logs.')
