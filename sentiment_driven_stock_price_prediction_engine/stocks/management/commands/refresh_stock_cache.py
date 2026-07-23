"""
Management command to pre-cache popular stock data.

Runs daily at 6:00 AM to improve performance for first users.
"""

import logging
from django.core.management.base import BaseCommand
from django.core.cache import cache

from stocks.views import StockAnalysisView
from stocks.utils import get_fallback_technical

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Pre-cache popular stock symbols to reduce external API calls.
    """
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

    def handle(self, *args, **options):
        symbols = options.get('symbols', [])
        force = options.get('force', False)

        self.stdout.write(f'Warming cache for {len(symbols)} symbol(s)')

        for symbol in symbols:
            cache_key = f"stock_analysis_{symbol}_medium_medium-term"
            cache_key_tech = f"technical_{symbol}_1d"

            if not force and cache.get(cache_key):
                self.stdout.write(f'  - {symbol}: already cached, skipping')
                continue

            # Simulate fetching data to warm cache
            # We'll use the fallback to avoid external calls
            try:
                from stocks.views import get_fallback_analysis
                data = get_fallback_analysis(symbol, risk_type='medium', hold_time='medium-term')
                cache.set(cache_key, data, timeout=600)  # 10 minutes

                # Also warm technical indicators
                tech = get_fallback_technical(symbol)
                cache.set(cache_key_tech, tech, timeout=300)

                self.stdout.write(f'  - {symbol}: cached successfully')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  - {symbol}: failed - {e}'))

        self.stdout.write(self.style.SUCCESS('Cache warming complete'))
        logger.info(f'Warmed cache for symbols: {", ".join(symbols)}')