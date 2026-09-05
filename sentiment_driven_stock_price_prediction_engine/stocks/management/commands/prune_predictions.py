"""
Management command to prune old predictions per symbol.

Runs weekly on Monday at 3:00 AM to prevent database growth.
Keeps the most recent N predictions per symbol (default 500).

Usage:
    python manage.py prune_predictions [--max-per-symbol N] [--dry-run] [--quiet]

Author: Tickflow Capital
Version: 1.1.0
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from stocks.models import Prediction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Prune old predictions (keep last N per symbol)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-per-symbol',
            type=int,
            default=500,
            help='Maximum records to keep per symbol (default: 500)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be pruned without making changes',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Suppress detailed output (only errors)',
        )

    def handle(self, *args, **options):
        max_per_symbol = options.get('max_per_symbol', 500)
        dry_run = options.get('dry_run', False)
        quiet = options.get('quiet', False)

        if not quiet:
            self.stdout.write(f"Pruning predictions (max {max_per_symbol} per symbol)...")

        try:
            # Close stale connections
            connection.close_if_unusable_or_obsolete()

            if dry_run:
                # Simulate – count records that would be deleted
                from django.db.models import Count

                symbols = Prediction.objects.values('stock_symbol').annotate(
                    cnt=Count('id')
                ).filter(cnt__gt=max_per_symbol)

                total_to_delete = 0
                for item in symbols:
                    symbol = item['stock_symbol']
                    count = item['cnt']
                    to_delete = count - max_per_symbol
                    total_to_delete += to_delete
                    if not quiet:
                        self.stdout.write(f'  - {symbol}: {to_delete} record(s) to delete (keep {max_per_symbol})')

                if not quiet:
                    self.stdout.write(f'Total records to delete: {total_to_delete}')
                    self.stdout.write('Dry-run mode – no changes made')
                return

            # Actually prune
            deleted = Prediction.prune_old_records(max_per_symbol=max_per_symbol)

            if not quiet:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully pruned predictions (kept {max_per_symbol} per symbol)')
                )

            logger.info(f'Pruned predictions (max {max_per_symbol} per symbol), deleted {deleted} records')

            connection.close()

        except Exception as e:
            logger.error(f"Prune predictions failed: {e}", exc_info=True)
            self.stderr.write(self.style.ERROR(f"Fatal error: {e}"))
            raise CommandError(f"Command failed: {e}")

        if not quiet:
            self.stdout.write(self.style.SUCCESS("Done."))