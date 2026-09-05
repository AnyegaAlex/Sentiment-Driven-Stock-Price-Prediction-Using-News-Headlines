"""
Management command to wait for database to be available.

Used in startup scripts to ensure DB is ready before running migrations or other commands.

Usage:
    python manage.py wait_for_db [--timeout N] [--quiet]

Author: Tickflow Capital
Version: 1.1.0
"""

import time
import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import connections
from django.db.utils import OperationalError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Wait for database to be available'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=30,
            help='Maximum seconds to wait (default: 30)',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Suppress output (only errors)',
        )

    def handle(self, *args, **options):
        timeout = options.get('timeout', 30)
        quiet = options.get('quiet', False)

        if not quiet:
            self.stdout.write(f'Waiting for database (timeout: {timeout}s)...')

        start = time.time()
        attempt = 0
        while time.time() - start < timeout:
            try:
                connections['default'].cursor()
                if not quiet:
                    self.stdout.write(self.style.SUCCESS('Database available'))
                return
            except OperationalError:
                attempt += 1
                if not quiet:
                    self.stdout.write(
                        f'Database unavailable, waiting 1 second... (attempt {attempt})'
                    )
                time.sleep(1)

        # Timeout reached
        logger.error(f"Database connection failed after {timeout}s")
        self.stderr.write(
            self.style.ERROR(f'Database connection timeout after {timeout}s')
        )
        raise CommandError('Database not available')