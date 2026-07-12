"""
LSTM-based stock movement predictor.
Loads the .pth model from training pipeline and computes features on the fly.
"""
import os
import logging
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import yfinance as yf
from django.conf import settings
from django.core.cache import cache
from news.utils import analyze_sentiment  # FinBERT sentiment

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# 1. Model Architecture (must match training script)
# ---------------------------------------------------------------------

class LSTMModel(nn.Module):
    def __init__(self, input_size: int, hidden_size: int, output_size: int):
        super(LSTMModel, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        # x shape: (batch, seq_len, input_size)
        _, (hidden, _) = self.lstm(x)
        # hidden[-1] is the final hidden state from the last layer
        return self.fc(hidden[-1])

# ---------------------------------------------------------------------
# 2. Feature Engineering (same as training script)
# ---------------------------------------------------------------------

def compute_lstm_features(symbol: str) -> dict:
    """
    Fetch historical data for symbol and compute the 7 features
    required by the LSTM model:
    MA7, MA21, STD21, RSI14, UpperBB, LowerBB (sentiment added later)

    Returns a dict with the latest feature values, or None if data insufficient.
    """
    try:
        # Download 2 years of daily data (enough for all indicators)
        data = yf.download(symbol, period="2y", progress=False, auto_adjust=True)
        if data.empty or len(data) < 200:
            logger.warning(f"Insufficient data for {symbol} to compute LSTM features")
            return None

        # Compute indicators
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

        # Drop rows with NaN
        df.dropna(inplace=True)
        if df.empty:
            return None

        # Get the latest row
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

# ---------------------------------------------------------------------
# 3. Predictor Class
# ---------------------------------------------------------------------

class LSTMPredictor:
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
        if self.model is None:
            return self._fallback_prediction("Model not loaded")

        # Compute technical features
        tech_features = compute_lstm_features(symbol)
        if tech_features is None:
            return self._fallback_prediction("Insufficient price data")

        # Ensure all required keys exist and are numeric
        required_keys = ['MA7', 'MA21', 'STD21', 'RSI14', 'UpperBB', 'LowerBB', 'Close']
        for key in required_keys:
            if key not in tech_features or tech_features[key] is None:
                return self._fallback_prediction(f"Missing feature: {key}")

        # Compute sentiment score
        sentiment_result = analyze_sentiment(news_text) if news_text else {'label': 'neutral', 'score': 0.0}
        label = sentiment_result.get('label', 'neutral')
        score = sentiment_result.get('score', 0.0)
        sentiment_score = score if label == 'positive' else -score if label == 'negative' else 0.0

        # Build feature vector – ensure all values are floats
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
            return self._fallback_prediction(f"Feature conversion error: {e}")

        # Check for NaN or Inf
        if not np.isfinite(features).all():
            return self._fallback_prediction("Invalid features (NaN or Inf)")

        # Convert to tensor and add sequence dimension (batch, seq_len, features)
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
        }

    def _fallback_prediction(self, reason: str) -> dict:
        logger.warning(f"LSTM prediction fallback: {reason}")
        return {
            'prediction': 'HOLD',
            'confidence': 0.0,
            'success': False,
            'error': reason
        }

# ---------------------------------------------------------------------
# 4. Singleton instance for easy import
# ---------------------------------------------------------------------

_predictor_instance = None

def get_lstm_predictor() -> LSTMPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = LSTMPredictor()
    return _predictor_instance