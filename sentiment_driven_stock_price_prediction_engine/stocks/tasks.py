from celery import shared_task
from stocks.models import StockData
import requests
import os
from datetime import datetime

@shared_task
def fetch_stock_data(symbol):
    """Fetch stock data for a specific symbol from Alpha Vantage."""
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        raise Exception("ALPHA_VANTAGE_API_KEY not set in environment variables.")

    url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={api_key}"
    
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        time_series = data.get("Time Series (Daily)", {})
        
        for date, metrics in time_series.items():
            # Fetch volume from the API response
            volume = int(metrics.get('5. volume', 0))  # Ensure volume is fetched

            # Save to database
            StockData.objects.get_or_create(
                symbol=symbol,
                date=datetime.strptime(date, "%Y-%m-%d"),
                open_price=float(metrics['1. open']),
                close_price=float(metrics['4. close']),
                volume=volume,  # Save the volume
                sentiment_score=0.0,  # Placeholder for now (update this later)
            )
    else:
        raise Exception(f"Failed to fetch stock data: {response.status_code}")