"""Run account deletion and audit-log retention maintenance."""

import logging

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Purge due accounts and remove audit logs older than 90 days'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--audit-retention-days', type=int, default=90)

    def handle(self, *args, **options):
        retention_days = options['audit_retention_days']
        if retention_days < 1:
            raise CommandError('--audit-retention-days must be at least 1')

        failures = []
        tasks = [
            ('purge_scheduled_accounts', {'dry_run': options['dry_run']}),
            ('cleanup_audit_logs', {
                'days': retention_days,
                'dry_run': options['dry_run'],
            }),
        ]

        for name, kwargs in tasks:
            try:
                call_command(name, stdout=self.stdout, stderr=self.stderr, **kwargs)
            except Exception as exc:
                failures.append(name)
                logger.exception('Retention task %s failed (%s)', name, type(exc).__name__)

        if failures:
            raise CommandError('Retention maintenance failed: ' + ', '.join(failures))

        self.stdout.write(self.style.SUCCESS('Retention maintenance completed.'))
