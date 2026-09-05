"""
Management command to pre-cache popular stock data.

Runs daily at 6:00 AM to improve performance for first users.

Usage:
    python manage.py refresh_stock_cache [--symbols AAPL MSFT ...] [--force] [--quiet]

Author: Tickflow Capital
Version: 1.1.0
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from django.db import connection

from stocks.views import get_fallback_analysis, get_fallback_technical

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Refresh cache for popular stock symbols'

    def add_arguments(self, parser):
        parser.add_argument(
            '--symbols',
            nargs='+',
            default=['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'IBM'],
            help='List of symbols to cache',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force refresh even if cache exists',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Suppress detailed output (only errors)',
        )

    def handle(self, *args, **options):
        symbols = options.get('symbols', [])
        force = options.get('force', False)
        quiet = options.get('quiet', False)

        if not quiet:
            self.stdout.write(f'Warming cache for {len(symbols)} symbol(s)')

        try:
            connection.close_if_unusable_or_obsolete()

            cached_count = 0
            for symbol in symbols:
                cache_key = f"stock_analysis_{symbol}_medium_medium-term"
                cache_key_tech = f"technical_{symbol}_1d"

                if not force and cache.get(cache_key):
                    if not quiet:
                        self.stdout.write(f'  - {symbol}: already cached, skipping')
                    continue

                try:
                    # Use fallback to avoid external API calls during caching
                    data = get_fallback_analysis(symbol, risk_type='medium', hold_time='medium-term')
                    cache.set(cache_key, data, timeout=600)  # 10 minutes

                    # Also warm technical indicators
                    tech = get_fallback_technical(symbol)
                    cache.set(cache_key_tech, tech, timeout=300)

                    cached_count += 1
                    if not quiet:
                        self.stdout.write(f'  - {symbol}: cached successfully')
                except Exception as e:
                    logger.warning(f'Failed to cache {symbol}: {e}')
                    if not quiet:
                        self.stdout.write(self.style.WARNING(f'  - {symbol}: failed - {e}'))

            if not quiet:
                self.stdout.write(
                    self.style.SUCCESS(f'Cache warming complete (cached {cached_count} symbol(s))')
                )

            logger.info(f'Warmed cache for symbols: {", ".join(symbols)} (cached {cached_count})')

            connection.close()

        except Exception as e:
            logger.error(f"Refresh cache failed: {e}", exc_info=True)
            self.stderr.write(self.style.ERROR(f"Fatal error: {e}"))
            raise CommandError(f"Command failed: {e}")

        if not quiet:
            self.stdout.write(self.style.SUCCESS("Done."))