# lstm_predictor.py
"""
LSTM‑based stock movement predictor with sentiment fallback.

This module:
- Loads a trained PyTorch LSTM model (stock_prediction_model.pth).
- Computes 7 technical features from yfinance (MA7, MA21, STD21, RSI14, UpperBB, LowerBB, Close).
- Incorporates FinBERT sentiment from the `news.utils` module.
- When price data is insufficient or the model fails, it falls back to a direction
  derived from recent news sentiment, ensuring a prediction is always available.

Usage:
    from .lstm_predictor import get_lstm_predictor
    predictor = get_lstm_predictor()
    result = predictor.predict('AAPL', news_text='Apple releases new iPhone')
    # result: {'prediction': 'UP', 'confidence': 82.5, 'success': True, ...}
"""

import os
import logging
import torch
import torch.nn as nn
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
from django.conf import settings

# Import FinBERT sentiment (must be available in news.utils)
from news.utils import analyze_sentiment

logger = logging.getLogger(__name__)

# ============================================================================
# 1. LSTM Model Architecture (must match training script)
# ============================================================================

class LSTMModel(nn.Module):
    """
    Simple 1‑layer LSTM with a linear output head.
    Input size: 7 (sentiment + 6 technicals)
    Hidden size: 32 (as in training)
    Output: 1 (sigmoid for probability of UP)
    """
    def __init__(self, input_size: int, hidden_size: int, output_size: int):
        super(LSTMModel, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        _, (hidden, _) = self.lstm(x)
        return self.fc(hidden[-1])

# ============================================================================
# 2. Feature Engineering (same as training pipeline)
# ============================================================================

def compute_lstm_features(symbol: str) -> dict:
    """
    Download historical price data and compute the 7 features required by the model.

    Args:
        symbol (str): Stock ticker (e.g., 'AAPL')

    Returns:
        dict: Contains 'MA7', 'MA21', 'STD21', 'RSI14', 'UpperBB', 'LowerBB', 'Close'
        or None if insufficient data.
    """
    try:
        # Download 2 years of daily data (enough for all indicators)
        data = yf.download(symbol, period="2y", progress=False, auto_adjust=True)
        if data.empty or len(data) < 200:
            logger.warning(f"Insufficient data for {symbol} to compute LSTM features")
            return None

        df = data[['Close']].copy()
        df['MA7'] = df['Close'].rolling(window=7).mean()
        df['MA21'] = df['Close'].rolling(window=21).mean()
        df['STD21'] = df['Close'].rolling(window=21).std()

        # RSI 14
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI14'] = 100 - (100 / (1 + rs))

        # Bollinger Bands
        df['UpperBB'] = df['MA21'] + (df['STD21'] * 2)
        df['LowerBB'] = df['MA21'] - (df['STD21'] * 2)

        df.dropna(inplace=True)
        if df.empty:
            return None

        latest = df.iloc[-1]
        return {
            'MA7': latest['MA7'],
            'MA21': latest['MA21'],
            'STD21': latest['STD21'],
            'RSI14': latest['RSI14'],
            'UpperBB': latest['UpperBB'],
            'LowerBB': latest['LowerBB'],
            'Close': latest['Close'],
        }
    except Exception as e:
        logger.error(f"Error computing LSTM features for {symbol}: {e}")
        return None

# ============================================================================
# 3. Sentiment Fallback
# ============================================================================

def get_sentiment_fallback(symbol: str, news_text: str = "") -> dict:
    """
    Generate a directional prediction based on recent news sentiment.

    This is used when the LSTM model cannot produce a prediction (e.g.,
    insufficient price history, model not loaded, feature errors).

    Args:
        symbol (str): Stock ticker.
        news_text (str): Optional news headline provided in the request.

    Returns:
        dict: {
            'prediction': 'UP' / 'DOWN' / 'HOLD',
            'confidence': float (0-100),
            'success': bool,
            'sentiment_score': float,
            'fallback': True,
            'message': str
        }
    """
    try:
        # Use provided news_text if available, otherwise fetch recent news from DB
        if news_text:
            result = analyze_sentiment(news_text)
            label = result.get('label', 'neutral')
            score = result.get('score', 0.0)
            sentiment_score = score if label == 'positive' else -score if label == 'negative' else 0.0
        else:
            # Query recent news from the database (last 7 days)
            from news.models import ProcessedNews
            cutoff = datetime.now() - timedelta(days=7)
            news = ProcessedNews.objects.filter(symbol=symbol.upper(), published_at__gte=cutoff)
            if not news.exists():
                return {
                    'prediction': 'HOLD',
                    'confidence': 0.0,
                    'success': True,
                    'sentiment_score': 0.0,
                    'fallback': True,
                    'message': 'No recent news found'
                }
            scores = [n.sentiment_score for n in news if n.sentiment_score is not None]
            if not scores:
                return {
                    'prediction': 'HOLD',
                    'confidence': 0.0,
                    'success': True,
                    'sentiment_score': 0.0,
                    'fallback': True,
                    'message': 'No sentiment scores available'
                }
            avg_sentiment = sum(scores) / len(scores)
            sentiment_score = avg_sentiment

        # Map sentiment to direction and confidence
        if sentiment_score > 0.2:
            direction = 'UP'
            confidence = min(abs(sentiment_score) * 100, 90) + 10
        elif sentiment_score < -0.2:
            direction = 'DOWN'
            confidence = min(abs(sentiment_score) * 100, 90) + 10
        else:
            direction = 'HOLD'
            confidence = 50.0

        return {
            'prediction': direction,
            'confidence': round(confidence, 1),
            'success': True,
            'sentiment_score': round(sentiment_score, 3),
            'fallback': True,
            'message': 'Using sentiment-based fallback due to insufficient price history'
        }
    except Exception as e:
        logger.error(f"Sentiment fallback failed for {symbol}: {e}")
        return {
            'prediction': 'HOLD',
            'confidence': 0.0,
            'success': False,
            'error': str(e),
            'fallback': True
        }

# ============================================================================
# 4. Predictor Class
# ============================================================================

class LSTMPredictor:
    """
    Main predictor class. Loads the model on first call and provides a `predict` method.

    If the model file is missing or fails, predictions will fall back to sentiment.
    The model path is read from `settings.LSTM_MODEL_PATH`; defaults to
    `models/stock_prediction_model.pth` in the project root.
    """

    def __init__(self, model_path=None):
        self.model_path = model_path or getattr(settings, 'LSTM_MODEL_PATH', None)
        if not self.model_path:
            base_dir = getattr(settings, 'BASE_DIR', os.getcwd())
            self.model_path = os.path.join(base_dir, 'models', 'stock_prediction_model.pth')

        self.device = torch.device("cpu")
        self.model = None
        self.input_size = 7   # sentiment + 6 technicals
        self.hidden_size = 32
        self.output_size = 1

        self._load_model()

    def _load_model(self):
        """Load the .pth model file; gracefully handle missing or corrupt file."""
        try:
            if not os.path.exists(self.model_path):
                logger.warning(f"LSTM model not found at {self.model_path}")
                return

            model = LSTMModel(self.input_size, self.hidden_size, self.output_size)
            state_dict = torch.load(self.model_path, map_location=self.device)
            model.load_state_dict(state_dict)
            model.to(self.device)
            model.eval()
            self.model = model
            logger.info(f"LSTM model loaded from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load LSTM model: {e}")
            self.model = None

    def predict(self, symbol: str, news_text: str = "") -> dict:
        """
        Generate a stock movement prediction for the given symbol.

        Args:
            symbol (str): Stock ticker (e.g., 'AAPL')
            news_text (str): Optional news headline to augment sentiment.

        Returns:
            dict: {
                'prediction': 'UP' / 'DOWN' / 'HOLD',
                'confidence': float (0-100),
                'success': bool,
                'sentiment_score': float,
                'fallback': bool,
                'message': str,
                'error': str (only present if success=False)
            }
        """
        # --------------------------------------------------------------------
        # 1. If model is not loaded, fallback to sentiment
        # --------------------------------------------------------------------
        if self.model is None:
            result = get_sentiment_fallback(symbol, news_text)
            result['error'] = 'Model not loaded'
            return result

        # --------------------------------------------------------------------
        # 2. Compute technical features
        # --------------------------------------------------------------------
        tech_features = compute_lstm_features(symbol)
        if tech_features is None:
            result = get_sentiment_fallback(symbol, news_text)
            result['error'] = 'Insufficient price data'
            return result

        # Ensure all required keys exist and are numeric
        required_keys = ['MA7', 'MA21', 'STD21', 'RSI14', 'UpperBB', 'LowerBB', 'Close']
        for key in required_keys:
            if key not in tech_features or tech_features[key] is None:
                result = get_sentiment_fallback(symbol, news_text)
                result['error'] = f'Missing feature: {key}'
                return result

        # --------------------------------------------------------------------
        # 3. Compute sentiment score from FinBERT
        # --------------------------------------------------------------------
        sentiment_result = analyze_sentiment(news_text) if news_text else {'label': 'neutral', 'score': 0.0}
        label = sentiment_result.get('label', 'neutral')
        score = sentiment_result.get('score', 0.0)
        sentiment_score = score if label == 'positive' else -score if label == 'negative' else 0.0

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
            result = get_sentiment_fallback(symbol, news_text)
            result['error'] = f'Feature conversion error: {e}'
            return result

        # Check for NaN/Inf
        if not np.isfinite(features).all():
            result = get_sentiment_fallback(symbol, news_text)
            result['error'] = 'Invalid features (NaN or Inf)'
            return result

        # --------------------------------------------------------------------
        # 4. Run LSTM model
        # --------------------------------------------------------------------
        input_tensor = torch.tensor(features, device=self.device).unsqueeze(0).unsqueeze(1)

        with torch.no_grad():
            output = self.model(input_tensor)
            prob = torch.sigmoid(output).item()

        prediction = 'UP' if prob >= 0.5 else 'DOWN'
        confidence = round((prob if prob >= 0.5 else 1 - prob) * 100, 1)

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