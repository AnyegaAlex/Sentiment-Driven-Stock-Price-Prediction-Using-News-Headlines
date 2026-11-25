"""Run account/audit retention and database backup as one scheduled job."""

import logging

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run account deletion, audit-log cleanup and database backup'

    def handle(self, *args, **options):
        failures = []
        tasks = [
            'run_retention_maintenance',
            'backup_db',
        ]
        for name in tasks:
            try:
                call_command(name, stdout=self.stdout, stderr=self.stderr)
            except Exception as exc:
                failures.append(name)
                logger.exception('Daily maintenance task %s failed (%s)', name, type(exc).__name__)

        if failures:
            raise CommandError('Daily maintenance failed: ' + ', '.join(failures))

        self.stdout.write(self.style.SUCCESS('Daily retention and backup maintenance completed.'))
