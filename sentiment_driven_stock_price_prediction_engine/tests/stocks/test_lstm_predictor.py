"""
Tests for stocks/lstm_predictor.py.

Covers:
- LSTMModel architecture (forward pass)
- compute_lstm_features: caching, yfinance, insufficient data, errors
- get_sentiment_fallback: with/without news, DB queries, sentiment mapping
- _fallback_result: dict construction
- LSTMPredictor: initialization, model loading (success, missing, corrupt)
- predict: model not loaded, feature failures, invalid features, sentiment failure,
  inference success/errors, NaN/Inf handling
- get_lstm_predictor: singleton

All external dependencies (torch, yfinance, cache, analyze_sentiment, ProcessedNews) are mocked.
"""

import pytest
import os
import numpy as np
import torch
from unittest.mock import patch, MagicMock, Mock
from datetime import timedelta
from django.core.cache import cache
from django.utils import timezone

from stocks.lstm_predictor import (
    LSTMModel,
    compute_lstm_features,
    get_sentiment_fallback,
    _fallback_result,
    LSTMPredictor,
    get_lstm_predictor,
    MODEL_INPUT_SIZE,
    MODEL_HIDDEN_SIZE,
    MODEL_OUTPUT_SIZE,
    TECH_CACHE_TIMEOUT,
    SENTIMENT_THRESHOLD,
)

pytestmark = pytest.mark.django_db


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_yfinance_data():
    """Mock yfinance download data."""
    mock_df = MagicMock()
    mock_df.empty = False
    mock_df.__len__ = lambda self: 300
    mock_df.__getitem__ = lambda self, key: MagicMock()
    # Mock the 'Close' column
    close_mock = MagicMock()
    close_mock.copy = MagicMock(return_value=close_mock)
    close_mock.rolling.return_value.mean.return_value = MagicMock()
    close_mock.rolling.return_value.std.return_value = MagicMock()
    close_mock.diff.return_value = MagicMock()
    close_mock.iloc = {-1: 150.0}  # latest close
    mock_df.__getitem__.return_value = close_mock
    # Make iloc work
    mock_df.iloc = MagicMock()
    mock_df.iloc.__getitem__.return_value = {'MA7': 149.0, 'MA21': 148.0, 'STD21': 2.0,
                                             'RSI14': 55.0, 'UpperBB': 152.0, 'LowerBB': 144.0}
    # Make dropna return itself
    mock_df.dropna = MagicMock(return_value=mock_df)
    return mock_df


@pytest.fixture
def mock_pytorch_model():
    """Mock a PyTorch model for inference."""
    mock_model = MagicMock()
    mock_model.return_value = torch.tensor([[0.8]])  # probability 0.8 -> UP
    return mock_model


@pytest.fixture
def mock_lstm_predictor():
    """Create a LSTMPredictor with mocked model loading."""
    with patch('stocks.lstm_predictor.os.path.exists', return_value=True):
        with patch('stocks.lstm_predictor.torch.load') as mock_load:
            mock_load.return_value = {'state_dict': 'dummy'}
            with patch('stocks.lstm_predictor.LSTMModel') as mock_model_class:
                mock_model = MagicMock()
                mock_model.eval.return_value = mock_model
                mock_model.return_value = torch.tensor([[0.8]])
                mock_model_class.return_value = mock_model
                predictor = LSTMPredictor()
                yield predictor


# ============================================================================
# Test: LSTMModel
# ============================================================================

class TestLSTMModel:
    def test_lstm_forward(self):
        """Test forward pass of LSTMModel."""
        model = LSTMModel(input_size=MODEL_INPUT_SIZE, hidden_size=MODEL_HIDDEN_SIZE, output_size=MODEL_OUTPUT_SIZE)
        # Create dummy input: batch_size=1, seq_len=1, input_size
        x = torch.randn(1, 1, MODEL_INPUT_SIZE)
        with torch.no_grad():
            output = model(x)
        # Output shape should be (1, 1)
        assert output.shape == (1, MODEL_OUTPUT_SIZE)
        # Output should be a tensor
        assert isinstance(output, torch.Tensor)


# ============================================================================
# Test: compute_lstm_features
# ============================================================================

class TestComputeLSTMFeatures:
    def test_compute_features_cache_hit(self):
        """Return cached features if available."""
        cached = {'MA7': 149.0, 'MA21': 148.0, 'STD21': 2.0, 'RSI14': 55.0, 'UpperBB': 152.0, 'LowerBB': 144.0, 'Close': 150.0}
        with patch('stocks.lstm_predictor.cache.get', return_value=cached) as mock_cache:
            result = compute_lstm_features('AAPL')
            assert result == cached
            mock_cache.assert_called_once_with('lstm_features_AAPL')

    def test_compute_features_cache_miss_success(self, mock_yfinance_data):
        """Cache miss, yfinance provides data -> compute features and cache."""
        with patch('stocks.lstm_predictor.cache.get', return_value=None) as mock_cache_get:
            with patch('stocks.lstm_predictor.cache.set') as mock_cache_set:
                with patch('yfinance.download', return_value=mock_yfinance_data) as mock_download:
                    result = compute_lstm_features('AAPL')
                    assert result is not None
                    assert 'MA7' in result
                    assert 'Close' in result
                    mock_cache_set.assert_called_once_with('lstm_features_AAPL', result, TECH_CACHE_TIMEOUT)
                    mock_download.assert_called_once_with('AAPL', period='2y', progress=False, auto_adjust=True)

    def test_compute_features_insufficient_data(self):
        """Insufficient data (empty or <200 rows) returns None."""
        empty_df = MagicMock()
        empty_df.empty = True
        with patch('stocks.lstm_predictor.cache.get', return_value=None):
            with patch('yfinance.download', return_value=empty_df):
                result = compute_lstm_features('AAPL')
                assert result is None

    def test_compute_features_exception(self):
        """Exception in yfinance download -> return None."""
        with patch('stocks.lstm_predictor.cache.get', return_value=None):
            with patch('yfinance.download', side_effect=Exception('Network error')):
                result = compute_lstm_features('AAPL')
                assert result is None


# ============================================================================
# Test: get_sentiment_fallback
# ============================================================================

class TestGetSentimentFallback:
    def test_fallback_with_news_text_positive(self):
        """Positive sentiment from news text -> UP."""
        with patch('stocks.lstm_predictor.analyze_sentiment') as mock_sent:
            mock_sent.return_value = {'label': 'positive', 'score': 0.8}
            result = get_sentiment_fallback('AAPL', news_text='Great earnings')
            assert result['prediction'] == 'UP'
            assert result['confidence'] > 0
            assert result['success'] is True
            assert result['fallback'] is True
            assert 'sentiment-based fallback' in result['message']

    def test_fallback_with_news_text_negative(self):
        """Negative sentiment -> DOWN."""
        with patch('stocks.lstm_predictor.analyze_sentiment') as mock_sent:
            mock_sent.return_value = {'label': 'negative', 'score': 0.6}
            result = get_sentiment_fallback('AAPL', news_text='Bad news')
            assert result['prediction'] == 'DOWN'
            assert result['confidence'] > 0

    def test_fallback_with_news_text_neutral(self):
        """Neutral sentiment -> HOLD."""
        with patch('stocks.lstm_predictor.analyze_sentiment') as mock_sent:
            mock_sent.return_value = {'label': 'neutral', 'score': 0.0}
            result = get_sentiment_fallback('AAPL', news_text='Mixed')
            assert result['prediction'] == 'HOLD'
            assert result['confidence'] == 50.0

    def test_fallback_without_news_db_has_news(self):
        """No news text, but DB has recent news -> average sentiment."""
        mock_news_qs = MagicMock()
        mock_news_qs.exists.return_value = True
        mock_news_qs.__iter__.return_value = [
            MagicMock(sentiment_score=0.5),
            MagicMock(sentiment_score=-0.3),
            MagicMock(sentiment_score=0.2),
        ]
        with patch('stocks.lstm_predictor.ProcessedNews') as mock_model:
            mock_model.objects.filter.return_value = mock_news_qs
            result = get_sentiment_fallback('AAPL')
            # Average sentiment = (0.5-0.3+0.2)/3 ≈ 0.133 → above threshold? 0.133 < 0.2 -> HOLD
            assert result['prediction'] == 'HOLD'
            assert result['sentiment_score'] == round(0.133, 3)

    def test_fallback_without_news_no_news(self):
        """No news in DB -> HOLD with 0.0 confidence."""
        mock_news_qs = MagicMock()
        mock_news_qs.exists.return_value = False
        with patch('stocks.lstm_predictor.ProcessedNews') as mock_model:
            mock_model.objects.filter.return_value = mock_news_qs
            result = get_sentiment_fallback('AAPL')
            assert result['prediction'] == 'HOLD'
            assert result['confidence'] == 0.0
            assert result['message'] == 'No recent news found'

    def test_fallback_import_error(self):
        """ProcessedNews import fails -> HOLD with error message."""
        with patch('stocks.lstm_predictor.ProcessedNews', side_effect=ImportError):
            result = get_sentiment_fallback('AAPL')
            assert result['prediction'] == 'HOLD'
            assert result['success'] is False
            assert 'News model unavailable' in result['error']

    def test_fallback_exception_in_sentiment_analysis(self):
        """analyze_sentiment raises exception -> fallback error."""
        with patch('stocks.lstm_predictor.analyze_sentiment', side_effect=Exception('Model crash')):
            result = get_sentiment_fallback('AAPL', news_text='Something')
            assert result['success'] is False
            assert 'Fallback error' in result['error']


# ============================================================================
# Test: _fallback_result helper
# ============================================================================

class TestFallbackResult:
    def test_fallback_result_success(self):
        result = _fallback_result('UP', 75.0, 0.3, 'Test message', success=True)
        assert result['prediction'] == 'UP'
        assert result['confidence'] == 75.0
        assert result['sentiment_score'] == 0.3
        assert result['success'] is True
        assert result['fallback'] is True
        assert result['message'] == 'Test message'
        assert 'error' not in result

    def test_fallback_result_failure(self):
        result = _fallback_result('HOLD', 0.0, 0.0, 'Error message', success=False)
        assert result['success'] is False
        assert result['error'] == 'Error message'


# ============================================================================
# Test: LSTMPredictor
# ============================================================================

class TestLSTMPredictor:
    def test_init_model_path_from_settings(self):
        """Initialize with path from settings."""
        with patch('stocks.lstm_predictor.settings.LSTM_MODEL_PATH', '/custom/path.pth'):
            with patch('stocks.lstm_predictor.os.path.exists', return_value=True):
                with patch('stocks.lstm_predictor.torch.load') as mock_load:
                    mock_load.return_value = {'state': 'dummy'}
                    predictor = LSTMPredictor()
                    assert predictor.model_path == '/custom/path.pth'

    def test_init_model_path_default(self):
        """Default path when no settings."""
        with patch('stocks.lstm_predictor.settings.LSTM_MODEL_PATH', None):
            with patch('stocks.lstm_predictor.settings.BASE_DIR', '/base'):
                with patch('stocks.lstm_predictor.os.path.exists', return_value=True):
                    with patch('stocks.lstm_predictor.torch.load') as mock_load:
                        mock_load.return_value = {'state': 'dummy'}
                        predictor = LSTMPredictor()
                        assert predictor.model_path == '/base/models/stock_prediction_model.pth'

    def test_load_model_success(self):
        """Model loads successfully."""
        with patch('stocks.lstm_predictor.os.path.exists', return_value=True):
            with patch('stocks.lstm_predictor.torch.load') as mock_load:
                mock_load.return_value = {'state_dict': 'dummy'}
                with patch('stocks.lstm_predictor.LSTMModel') as mock_model_class:
                    mock_model = MagicMock()
                    mock_model_class.return_value = mock_model
                    predictor = LSTMPredictor()
                    assert predictor.model is not None
                    mock_model_class.assert_called_once_with(MODEL_INPUT_SIZE, MODEL_HIDDEN_SIZE, MODEL_OUTPUT_SIZE)
                    mock_load.assert_called_once()

    def test_load_model_missing_file(self):
        """Model file missing -> model remains None."""
        with patch('stocks.lstm_predictor.os.path.exists', return_value=False):
            predictor = LSTMPredictor()
            assert predictor.model is None

    def test_load_model_corrupt_file(self):
        """Corrupt model file -> model remains None."""
        with patch('stocks.lstm_predictor.os.path.exists', return_value=True):
            with patch('stocks.lstm_predictor.torch.load', side_effect=Exception('Corrupt file')):
                predictor = LSTMPredictor()
                assert predictor.model is None

    def test_predict_model_not_loaded(self):
        """If model is None, use fallback."""
        predictor = LSTMPredictor()
        predictor.model = None  # simulate failure
        with patch('stocks.lstm_predictor.get_sentiment_fallback') as mock_fallback:
            mock_fallback.return_value = {'prediction': 'HOLD', 'confidence': 0, 'success': False, 'error': 'Model not loaded'}
            result = predictor.predict('AAPL')
            assert result['error'] == 'Model not loaded'
            mock_fallback.assert_called_with('AAPL', '', '')

    def test_predict_feature_failure(self, mock_lstm_predictor):
        """Feature computation returns None -> fallback."""
        with patch('stocks.lstm_predictor.compute_lstm_features', return_value=None) as mock_features:
            with patch('stocks.lstm_predictor.get_sentiment_fallback') as mock_fallback:
                mock_fallback.return_value = {'prediction': 'HOLD', 'success': False, 'error': 'Insufficient price data'}
                result = mock_lstm_predictor.predict('AAPL')
                assert result['error'] == 'Insufficient price data'
                mock_features.assert_called_with('AAPL')
                mock_fallback.assert_called_with('AAPL', '', '')

    def test_predict_invalid_feature_value(self, mock_lstm_predictor):
        """One of the features is invalid (None or non-finite) -> fallback."""
        features = {'MA7': 149.0, 'MA21': 148.0, 'STD21': 2.0, 'RSI14': 55.0, 'UpperBB': 152.0, 'LowerBB': 144.0, 'Close': 150.0}
        with patch('stocks.lstm_predictor.compute_lstm_features', return_value=features) as mock_features:
            # Set one feature to None
            features['MA7'] = None
            with patch('stocks.lstm_predictor.get_sentiment_fallback') as mock_fallback:
                mock_fallback.return_value = {'prediction': 'HOLD', 'success': False, 'error': 'Invalid feature'}
                result = mock_lstm_predictor.predict('AAPL')
                assert result['error'] == 'Invalid feature: MA7'
                mock_fallback.assert_called()

    def test_predict_sentiment_failure(self, mock_lstm_predictor):
        """analyze_sentiment raises exception -> fallback."""
        features = {'MA7': 149.0, 'MA21': 148.0, 'STD21': 2.0, 'RSI14': 55.0, 'UpperBB': 152.0, 'LowerBB': 144.0, 'Close': 150.0}
        with patch('stocks.lstm_predictor.compute_lstm_features', return_value=features):
            with patch('stocks.lstm_predictor.analyze_sentiment', side_effect=Exception('Sentiment crash')):
                with patch('stocks.lstm_predictor.get_sentiment_fallback') as mock_fallback:
                    mock_fallback.return_value = {'prediction': 'HOLD', 'success': False, 'error': 'Sentiment failure'}
                    result = mock_lstm_predictor.predict('AAPL')
                    assert result['error'] == 'Sentiment failure'

    def test_predict_feature_conversion_error(self, mock_lstm_predictor):
        """Feature conversion from dict to array raises TypeError/ValueError -> fallback."""
        features = {'MA7': 'invalid', 'MA21': 148.0, 'STD21': 2.0, 'RSI14': 55.0, 'UpperBB': 152.0, 'LowerBB': 144.0, 'Close': 150.0}
        with patch('stocks.lstm_predictor.compute_lstm_features', return_value=features):
            with patch('stocks.lstm_predictor.get_sentiment_fallback') as mock_fallback:
                mock_fallback.return_value = {'prediction': 'HOLD', 'success': False, 'error': 'Conversion error'}
                result = mock_lstm_predictor.predict('AAPL')
                assert 'Feature conversion error' in result['error']
                mock_fallback.assert_called()

    def test_predict_nan_feature(self, mock_lstm_predictor):
        """NaN in features -> fallback."""
        features = {'MA7': 149.0, 'MA21': 148.0, 'STD21': np.nan, 'RSI14': 55.0, 'UpperBB': 152.0, 'LowerBB': 144.0, 'Close': 150.0}
        with patch('stocks.lstm_predictor.compute_lstm_features', return_value=features):
            with patch('stocks.lstm_predictor.get_sentiment_fallback') as mock_fallback:
                mock_fallback.return_value = {'prediction': 'HOLD', 'success': False, 'error': 'NaN'}
                result = mock_lstm_predictor.predict('AAPL')
                assert result['error'] == 'Invalid features (NaN or Inf)'
                mock_fallback.assert_called()

    def test_predict_inference_success(self, mock_lstm_predictor):
        """Happy path: successful inference."""
        features = {'MA7': 149.0, 'MA21': 148.0, 'STD21': 2.0, 'RSI14': 55.0, 'UpperBB': 152.0, 'LowerBB': 144.0, 'Close': 150.0}
        with patch('stocks.lstm_predictor.compute_lstm_features', return_value=features):
            with patch('stocks.lstm_predictor.analyze_sentiment') as mock_sent:
                mock_sent.return_value = {'label': 'positive', 'score': 0.6}
                # Mock the model's forward pass
                mock_model = mock_lstm_predictor.model
                mock_model.return_value = torch.tensor([[0.8]])  # prob 0.8 -> UP
                result = mock_lstm_predictor.predict('AAPL')
                assert result['prediction'] == 'UP'
                assert result['confidence'] == 80.0
                assert result['success'] is True
                assert result['fallback'] is False
                assert result['sentiment_score'] == 0.6
                assert result['close_price'] == 150.0

    def test_predict_inference_exception(self, mock_lstm_predictor):
        """Exception during model inference -> fallback."""
        features = {'MA7': 149.0, 'MA21': 148.0, 'STD21': 2.0, 'RSI14': 55.0, 'UpperBB': 152.0, 'LowerBB': 144.0, 'Close': 150.0}
        with patch('stocks.lstm_predictor.compute_lstm_features', return_value=features):
            with patch('stocks.lstm_predictor.get_sentiment_fallback') as mock_fallback:
                mock_fallback.return_value = {'prediction': 'HOLD', 'success': False, 'error': 'Inference crash'}
                # Make model raise an exception
                mock_lstm_predictor.model.return_value.side_effect = RuntimeError('CUDA error')
                result = mock_lstm_predictor.predict('AAPL')
                assert 'Inference error' in result['error']
                mock_fallback.assert_called()

    def test_predict_with_news_text(self, mock_lstm_predictor):
        """news_text is passed to analyze_sentiment and used."""
        features = {'MA7': 149.0, 'MA21': 148.0, 'STD21': 2.0, 'RSI14': 55.0, 'UpperBB': 152.0, 'LowerBB': 144.0, 'Close': 150.0}
        with patch('stocks.lstm_predictor.compute_lstm_features', return_value=features):
            with patch('stocks.lstm_predictor.analyze_sentiment') as mock_sent:
                mock_sent.return_value = {'label': 'positive', 'score': 0.9}
                # Mock model forward
                mock_lstm_predictor.model.return_value = torch.tensor([[0.9]])
                result = mock_lstm_predictor.predict('AAPL', news_text='Good news')
                # The sentiment_score in result should come from the sentiment analysis
                assert result['sentiment_score'] == 0.9
                mock_sent.assert_called_with('Good news')


# ============================================================================
# Test: get_lstm_predictor singleton
# ============================================================================

class TestGetLSTMPredictor:
    def test_singleton(self):
        """get_lstm_predictor returns the same instance."""
        with patch('stocks.lstm_predictor.LSTMPredictor') as mock_class:
            mock_instance1 = MagicMock()
            mock_instance2 = MagicMock()
            mock_class.return_value = mock_instance1
            # First call creates instance
            instance1 = get_lstm_predictor()
            # Second call should return same instance
            # But we need to reset the global variable to simulate fresh call
            # We'll patch the global variable directly
            import stocks.lstm_predictor
            stocks.lstm_predictor._predictor_instance = None
            mock_class.return_value = mock_instance1  # return same mock
            instance2 = get_lstm_predictor()
            assert instance1 is instance2
            assert mock_class.call_count == 1

    def test_creates_new_if_none(self):
        """If _predictor_instance is None, create new."""
        import stocks.lstm_predictor
        stocks.lstm_predictor._predictor_instance = None
        with patch('stocks.lstm_predictor.LSTMPredictor') as mock_class:
            mock_instance = MagicMock()
            mock_class.return_value = mock_instance
            instance = get_lstm_predictor()
            assert instance is mock_instance
            mock_class.assert_called_once()