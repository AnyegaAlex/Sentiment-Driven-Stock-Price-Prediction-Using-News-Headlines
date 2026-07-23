"""
Management command to prune old predictions per symbol.

Runs weekly on Monday at 3:00 AM to prevent database growth.
"""

import logging
from django.core.management.base import BaseCommand

from stocks.models import Prediction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Delete the oldest predictions for each symbol, keeping only the most recent N.
    """
    help = 'Prune old predictions (keep last 500 per symbol)'

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

    def handle(self, *args, **options):
        max_per_symbol = options.get('max_per_symbol', 500)
        dry_run = options.get('dry_run', False)

        # Use existing class method
        if dry_run:
            # Simulate – count records that would be deleted
            from django.db.models import Count, F, Window
            from django.db.models.functions import RowNumber

            # Identify symbols with more than max_per_symbol records
            symbols = Prediction.objects.values('stock_symbol').annotate(
                cnt=Count('id')
            ).filter(cnt__gt=max_per_symbol)

            total_to_delete = 0
            for item in symbols:
                symbol = item['stock_symbol']
                count = item['cnt']
                to_keep = max_per_symbol
                to_delete = count - to_keep
                total_to_delete += to_delete
                self.stdout.write(f'  - {symbol}: {to_delete} record(s) to delete (keep {to_keep})')

            self.stdout.write(f'Total records to delete: {total_to_delete}')
            self.stdout.write('Dry-run mode – no changes made')
            return

        # Actually prune
        deleted = Prediction.prune_old_records(max_per_symbol=max_per_symbol)

        self.stdout.write(
            self.style.SUCCESS(f'Successfully pruned predictions (kept {max_per_symbol} per symbol)')
        )

        logger.info(f'Pruned predictions (max {max_per_symbol} per symbol)')