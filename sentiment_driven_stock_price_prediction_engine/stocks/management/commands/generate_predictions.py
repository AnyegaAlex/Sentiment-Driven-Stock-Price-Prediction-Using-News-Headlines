# stocks/management/commands/generate_predictions.py
from django.core.management.base import BaseCommand
from stocks.lstm_predictor import get_lstm_predictor
from stocks.utils import save_prediction
from news.models import StockSymbol, ProcessedNews
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Generate LSTM predictions and save to DB'

    def handle(self, *args, **kwargs):
        # Get active symbols from the news app's StockSymbol table
        symbols = list(StockSymbol.objects.filter(is_active=True).values_list('symbol', flat=True))
        if not symbols:
            symbols = ["AAPL", "MSFT", "TSLA", "NVDA", "GOOGL"] # Fallback
        
        predictor = get_lstm_predictor()
        
        for symbol in symbols:
            try:
                # Get recent news text for this symbol to feed the LSTM
                recent_news = ProcessedNews.objects.filter(symbol=symbol).order_by('-published_at').first()
                news_text = recent_news.title if recent_news else ""
                
                # Run the heavy PyTorch model
                result = predictor.predict(symbol, news_text=news_text)
                
                if result.get('success'):
                    save_prediction(
                        symbol=symbol,
                        movement=result['prediction'].lower(),
                        confidence=result['confidence'] / 100.0,
                        sentiment_score=result.get('sentiment_score', 0.0),
                        headline=news_text,
                        source='lstm',
                        price_at_prediction=result.get('close_price')
                    )
                    self.stdout.write(self.style.SUCCESS(f"{symbol}: {result['prediction']} ({result['confidence']}%)"))
                else:
                    self.stdout.write(self.style.WARNING(f"{symbol}: Fallback used - {result.get('message')}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"{symbol}: Failed - {e}"))