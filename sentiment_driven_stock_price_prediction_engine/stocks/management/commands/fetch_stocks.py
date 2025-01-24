from django.core.management.base import BaseCommand
from stocks.tasks import fetch_stock_data

class Command(BaseCommand):
    help = "Fetch stock data for a specific symbol"

    def add_arguments(self, parser):
        parser.add_argument('symbol', type=str, help='Stock symbol to fetch data for')

    def handle(self, *args, **kwargs):
        symbol = kwargs['symbol']
        fetch_stock_data.delay(symbol)  # Call Celery task
        self.stdout.write(self.style.SUCCESS(f"Stock fetching task triggered for {symbol}."))


@shared_task
def fetch_stock_data(symbol):
    """Fetch stock data for a specific symbol and calculate sentiment score."""
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={api_key}"
    
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        time_series = data.get("Time Series (Daily)", {})
        
        for date, metrics in time_series.items():
            # Calculate sentiment score for the stock
            articles = NewsArticle.objects.filter(created_at__date=date)
            sentiment_score = sum(
                1 if article.sentiment == 'positive' else -1 if article.sentiment == 'negative' else 0 
                for article in articles
            )
            
            StockData.objects.get_or_create(
                symbol=symbol,
                date=datetime.strptime(date, "%Y-%m-%d"),
                open_price=metrics['1. open'],
                close_price=metrics['4. close'],
                sentiment_score=sentiment_score,
            )
    else:
        raise Exception(f"Failed to fetch stock data: {response.status_code}")
