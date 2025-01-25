from django.core.management.base import BaseCommand
from stocks.tasks import fetch_stock_data  # Import the task from tasks.py

class Command(BaseCommand):
    help = "Fetch stock data for a specific symbol"

    def add_arguments(self, parser):
        parser.add_argument('symbol', type=str, help='Stock symbol to fetch data for')

    def handle(self, *args, **kwargs):
        symbol = kwargs['symbol']
        fetch_stock_data.delay(symbol)  # Call Celery task
        self.stdout.write(self.style.SUCCESS(f"Stock fetching task triggered for {symbol}."))