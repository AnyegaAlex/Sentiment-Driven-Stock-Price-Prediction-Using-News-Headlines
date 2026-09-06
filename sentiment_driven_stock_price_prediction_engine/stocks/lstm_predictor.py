"""
LSTM‑based stock movement predictor with sentiment fallback.

This module:
- Loads a trained PyTorch LSTM model (stock_prediction_model.pth).
- Computes 7 technical features from yfinance (MA7, MA21, STD21, RSI14, UpperBB, LowerBB, Close).
- Incorporates FinBERT sentiment from the `news.utils` module.
- When price data is insufficient or the model fails, it falls back to a direction
  derived from recent news sentiment, ensuring a prediction is always available.

Performance:
- Technical features are cached for 5 minutes per symbol to reduce yfinance calls.
- Model is loaded once (singleton) to avoid repeated disk I/O.

Author: Tickflow Capital
Version: 1.1.0
"""

import os
import logging
from datetime import timedelta
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

# Import FinBERT sentiment (must be available in news.utils)
from news.utils import analyze_sentiment

logger = logging.getLogger(__name__)

# ============================================================================
# Constants
# ============================================================================

MODEL_INPUT_SIZE = 7      # sentiment + 6 technicals
MODEL_HIDDEN_SIZE = 32    # as in training
MODEL_OUTPUT_SIZE = 1     # probability of UP

# Cache timeout for technical features (5 minutes)
TECH_CACHE_TIMEOUT = 300

# Fallback sentiment threshold
SENTIMENT_THRESHOLD = 0.2

# ============================================================================
# 1. LSTM Model Architecture (must match training script)
# ============================================================================

def _create_lstm_model(input_size, hidden_size, output_size):
    """
    Factory function that imports torch and defines the LSTM model.
    Called only when the model is actually loaded.
    """
    import torch
    import torch.nn as nn

    class LSTMModel(nn.Module):
        def __init__(self, input_size, hidden_size, output_size):
            super(LSTMModel, self).__init__()
            self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
            self.fc = nn.Linear(hidden_size, output_size)

        def forward(self, x):
            _, (hidden, _) = self.lstm(x)
            return self.fc(hidden[-1])

    return LSTMModel(input_size, hidden_size, output_size)


# ============================================================================
# 2. Feature Engineering (lazy imports)
# ============================================================================

def compute_lstm_features(symbol: str) -> dict:
    """
    Download historical price data and compute the 7 features.
    """
    cache_key = f"lstm_features_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        import yfinance as yf
        import numpy as np
        data = yf.download(symbol, period="2y", progress=False, auto_adjust=True)
        if data.empty or len(data) < 200:
            return None

        df = data[['Close']].copy()
        df['MA7'] = df['Close'].rolling(window=7).mean()
        df['MA21'] = df['Close'].rolling(window=21).mean()
        df['STD21'] = df['Close'].rolling(window=21).std()
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI14'] = 100 - (100 / (1 + rs))
        df['UpperBB'] = df['MA21'] + (df['STD21'] * 2)
        df['LowerBB'] = df['MA21'] - (df['STD21'] * 2)
        df.dropna(inplace=True)
        if df.empty:
            return None

        latest = df.iloc[-1]
        result = {
            'MA7': float(latest['MA7']),
            'MA21': float(latest['MA21']),
            'STD21': float(latest['STD21']),
            'RSI14': float(latest['RSI14']),
            'UpperBB': float(latest['UpperBB']),
            'LowerBB': float(latest['LowerBB']),
            'Close': float(latest['Close']),
        }
        cache.set(cache_key, result, TECH_CACHE_TIMEOUT)
        return result
    except Exception as e:
        logger.error(f"Error computing LSTM features for {symbol}: {e}")
        return None


# ============================================================================
# 3. Sentiment Fallback
# ============================================================================

def get_sentiment_fallback(symbol: str, news_text: str = "", request_id: str = "") -> dict:
    """
    Generate a directional prediction based on recent news sentiment.

    This is used when the LSTM model cannot produce a prediction (e.g.,
    insufficient price history, model not loaded, feature errors).

    Args:
        symbol (str): Stock ticker.
        news_text (str): Optional news headline provided in the request.
        request_id (str): Optional request ID for logging context.

    Returns:
        dict: {
            'prediction': 'UP' / 'DOWN' / 'HOLD',
            'confidence': float (0-100),
            'success': bool,
            'sentiment_score': float,
            'fallback': True,
            'message': str,
            'error': str (only if success=False)
        }
    """
    try:
        sentiment_score = 0.0

        if news_text:
            # Use provided news text
            result = analyze_sentiment(news_text)
            label = result.get('label', 'neutral')
            score = result.get('score', 0.0)
            sentiment_score = score if label == 'positive' else -score if label == 'negative' else 0.0
        else:
            # Query recent news from the database (last 7 days)
            try:
                from news.models import ProcessedNews
                cutoff = timezone.now() - timedelta(days=7)
                news = ProcessedNews.objects.filter(
                    symbol=symbol.upper(),
                    published_at__gte=cutoff
                )
                if not news.exists():
                    return _fallback_result('HOLD', 0.0, 0.0, 'No recent news found')
                scores = [n.sentiment_score for n in news if n.sentiment_score is not None]
                if not scores:
                    return _fallback_result('HOLD', 0.0, 0.0, 'No sentiment scores available')
                sentiment_score = sum(scores) / len(scores)
            except ImportError:
                logger.warning("ProcessedNews model not available; cannot fetch news")
                return _fallback_result('HOLD', 0.0, 0.0, 'News model unavailable')

        # Map sentiment to direction and confidence
        if sentiment_score > SENTIMENT_THRESHOLD:
            direction = 'UP'
            confidence = min(abs(sentiment_score) * 100, 90) + 10
        elif sentiment_score < -SENTIMENT_THRESHOLD:
            direction = 'DOWN'
            confidence = min(abs(sentiment_score) * 100, 90) + 10
        else:
            direction = 'HOLD'
            confidence = 50.0

        return _fallback_result(direction, round(confidence, 1), round(sentiment_score, 3),
                                'Using sentiment-based fallback')

    except Exception as e:
        logger.error(f"Sentiment fallback failed for {symbol}: {e}")
        return _fallback_result('HOLD', 0.0, 0.0, f'Fallback error: {str(e)}', success=False)


def _fallback_result(prediction: str, confidence: float, sentiment_score: float,
                     message: str, success: bool = True) -> dict:
    """Build a consistent fallback result dictionary."""
    result = {
        'prediction': prediction,
        'confidence': confidence,
        'success': success,
        'sentiment_score': sentiment_score,
        'fallback': True,
        'message': message,
    }
    if not success:
        result['error'] = message
    return result


# ============================================================================
# 4. Predictor Class
# ============================================================================

class LSTMPredictor:
    """
    Main predictor class. Loads the model on first call and provides a `predict` method.

    If the model file is missing or fails, predictions will fall back to sentiment.
    The model path is read from `settings.LSTM_MODEL_PATH`; defaults to
    `models/stock_prediction_model.pth` in the project root.

    Performance:
        - Model is loaded once and reused.
        - Feature computation is cached per symbol.
    """

    def __init__(self, model_path=None):
        import torch  # lazy import
        self.device = torch.device("cpu")
        self.model = None
        self.input_size = MODEL_INPUT_SIZE
        self.hidden_size = MODEL_HIDDEN_SIZE
        self.output_size = MODEL_OUTPUT_SIZE
        self.model_path = model_path or getattr(settings, 'LSTM_MODEL_PATH', None)
        if not self.model_path:
            base_dir = getattr(settings, 'BASE_DIR', os.getcwd())
            self.model_path = os.path.join(base_dir, 'models', 'stock_prediction_model.pth')
        self._load_model()

    def _load_model(self):
        import torch  # lazy import
        try:
            if not os.path.exists(self.model_path):
                logger.warning(f"LSTM model not found at {self.model_path}")
                return
            model = _create_lstm_model(self.input_size, self.hidden_size, self.output_size)
            try:
                state_dict = torch.load(self.model_path, map_location=self.device, weights_only=True)
            except TypeError:
                state_dict = torch.load(self.model_path, map_location=self.device)
            model.load_state_dict(state_dict)
            model.to(self.device)
            model.eval()
            self.model = model
            logger.info(f"LSTM model loaded from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load LSTM model: {e}", exc_info=True)
            self.model = None

    def predict(self, symbol, news_text="", request_id=""):
        """
        Generate a stock movement prediction for the given symbol.

        Args:
            symbol (str): Stock ticker (e.g., 'AAPL')
            news_text (str): Optional news headline to augment sentiment.
            request_id (str): Optional request ID for logging.

        Returns:
            dict: {
                'prediction': 'UP' / 'DOWN' / 'HOLD',
                'confidence': float (0-100),
                'success': bool,
                'sentiment_score': float,
                'fallback': bool,
                'message': str,
                'error': str (only if success=False)
            }
        """
        import torch  # lazy import
        import numpy as np

        ctx = f"symbol={symbol} request_id={request_id}"

        # --------------------------------------------------------------------
        # 1. If model is not loaded, fallback to sentiment
        # --------------------------------------------------------------------
        if self.model is None:
            logger.warning(f"Model not loaded – using fallback for {ctx}")
            result = get_sentiment_fallback(symbol, news_text, request_id)
            result['error'] = 'Model not loaded'
            return result

        # --------------------------------------------------------------------
        # 2. Compute technical features (cached)
        # --------------------------------------------------------------------
        tech_features = compute_lstm_features(symbol)
        if tech_features is None:
            logger.warning(f"Failed to compute features for {ctx} – using fallback")
            result = get_sentiment_fallback(symbol, news_text, request_id)
            result['error'] = 'Insufficient price data'
            return result

        # Validate required keys and types
        required_keys = ['MA7', 'MA21', 'STD21', 'RSI14', 'UpperBB', 'LowerBB', 'Close']
        for key in required_keys:
            value = tech_features.get(key)
            if value is None or not np.isfinite(value):
                logger.warning(f"Invalid feature {key} for {ctx} – using fallback")
                result = get_sentiment_fallback(symbol, news_text, request_id)
                result['error'] = f'Invalid feature: {key}'
                return result

        # --------------------------------------------------------------------
        # 3. Compute sentiment score from FinBERT
        # --------------------------------------------------------------------
        try:
            sentiment_result = analyze_sentiment(news_text) if news_text else {'label': 'neutral', 'score': 0.0}
            label = sentiment_result.get('label', 'neutral')
            score = sentiment_result.get('score', 0.0)
            sentiment_score = score if label == 'positive' else -score if label == 'negative' else 0.0
            if not np.isfinite(sentiment_score):
                sentiment_score = 0.0
        except Exception as e:
            logger.error(f"Sentiment analysis failed for {ctx}: {e}")
            sentiment_score = 0.0

        # Build feature vector (7 features)
        try:
            features = np.array([
                float(sentiment_score),
                float(tech_features['MA7']),
                float(tech_features['MA21']),
                float(tech_features['STD21']),
                float(tech_features['RSI14']),
                float(tech_features['UpperBB']),
                float(tech_features['LowerBB'])
            ], dtype=np.float32)
        except (TypeError, ValueError) as e:
            logger.warning(f"Feature conversion error for {ctx}: {e}")
            result = get_sentiment_fallback(symbol, news_text, request_id)
            result['error'] = f'Feature conversion error: {e}'
            return result

        # Check for NaN/Inf
        if not np.isfinite(features).all():
            logger.warning(f"Invalid features (NaN/Inf) for {ctx}")
            result = get_sentiment_fallback(symbol, news_text, request_id)
            result['error'] = 'Invalid features (NaN or Inf)'
            return result

        # --------------------------------------------------------------------
        # 4. Run LSTM model
        # --------------------------------------------------------------------
        try:
            input_tensor = torch.tensor(features, device=self.device).unsqueeze(0).unsqueeze(1)
            with torch.no_grad():
                output = self.model(input_tensor)
                prob = torch.sigmoid(output).item()
        except Exception as e:
            logger.error(f"Model inference error for {ctx}: {e}")
            result = get_sentiment_fallback(symbol, news_text, request_id)
            result['error'] = f'Inference error: {str(e)}'
            return result

        prediction = 'UP' if prob >= 0.5 else 'DOWN'
        confidence = round((prob if prob >= 0.5 else 1 - prob) * 100, 1)

        logger.info(f"LSTM prediction for {ctx}: {prediction} (conf={confidence})")
        return {
            'prediction': prediction,
            'confidence': confidence,
            'success': True,
            'sentiment_score': round(sentiment_score, 3),
            'close_price': float(tech_features['Close']),
            'fallback': False,
            'message': 'LSTM prediction successful'
        }


# ============================================================================
# 5. Singleton
# ============================================================================

_predictor_instance = None


def get_lstm_predictor() -> LSTMPredictor:
    """Return a singleton instance of LSTMPredictor."""
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = LSTMPredictor()
    return _predictor_instance