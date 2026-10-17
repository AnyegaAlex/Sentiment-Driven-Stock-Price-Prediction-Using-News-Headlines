# news/management/commands/fetch_news.py
from django.core.management.base import BaseCommand
from news.services import ProviderManager, IngestionService
from news.models import StockSymbol
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Fetch news articles, analyze sentiment, and save to DB"

    def add_arguments(self, parser):
        parser.add_argument('--symbol', type=str, help='Specific symbol to fetch (e.g. AAPL)')

    def handle(self, *args, **options):
        symbol_arg = options.get('symbol')
        
        if symbol_arg:
            symbols = [symbol_arg.upper()]
        else:
            # Fetch all active symbols
            symbols = list(StockSymbol.objects.filter(is_active=True).values_list('symbol', flat=True))
            
        if not symbols:
            self.stdout.write(self.style.WARNING("No active symbols found in DB."))
            return

        manager = ProviderManager()
        
        for symbol in symbols:
            self.stdout.write(f"Processing {symbol}...")
            
            # 1. Fetch (Daisy-chained)
            raw_articles = manager.fetch(symbol)
            if not raw_articles:
                self.stdout.write(self.style.WARNING(f"No articles found for {symbol}"))
                continue
                
            # 2. Ingest & Save (Bulk)
            try:
                new_count, dup_count = IngestionService.process_and_save(symbol, raw_articles)
                self.stdout.write(
                    self.style.SUCCESS(f"  -> {symbol}: {new_count} new, {dup_count} duplicates.")
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  -> Failed to save {symbol}: {e}"))
                logger.exception(f"Pipeline error for {symbol}")