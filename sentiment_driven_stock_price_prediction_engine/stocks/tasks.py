from celery import shared_task
import requests
from .models import StockData
from prediction_model import predict_stock_trend  # Custom ML model

@shared_task
def fetch_stock_data():
    response = requests.get(f'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=MSFT&apikey={ALPHA_VANTAGE_API_KEY}')
    data = response.json().get('Time Series (Daily)', {})
    for date, values in data.items():
        prediction = predict_stock_trend(values)
        StockData.objects.create(symbol='MSFT', date=date, price=values['4. close'], prediction=prediction)
