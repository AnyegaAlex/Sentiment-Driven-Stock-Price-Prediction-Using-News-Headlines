"""
Tests for stocks/opinion_generator.py – Institutional Stock Analysis Engine.

Covers:
- generate_stock_opinion and format_investment_analysis (public API)
- TechnicalAnalyzer: analyze, _get_data, _fetch_from_* sources, caching
- MarketRegimeDetector: get_current_regime with caching and fallback
- InstitutionalAnalysisEngine: full_analysis, _generate_recommendation
- Fallback logic, error handling, and edge cases.

All external dependencies (yfinance, requests, cache, LSTM) are mocked.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, Mock
from django.core.cache import cache

from stocks.opinion_generator import (
    generate_stock_opinion,
    format_investment_analysis,
    get_technical_analyzer,
    TechnicalAnalyzer,
    MarketRegimeDetector,
    InstitutionalAnalysisEngine,
    Config,
    RiskProfile,
    MarketRegime,
    Recommendation,
    TechnicalMetrics,
    MarketRegimeResult,
    _get_cached_price_data,
    _cache_price_data,
    _get_cached_technical_data,
    _cache_technical_data,
    _get_cached_data,      
    _set_cached_data,      
)

pytestmark = pytest.mark.django_db


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_yfinance_data():
    """Return a realistic pandas DataFrame for a stock."""
    dates = pd.date_range(end=datetime.now(), periods=300, freq='D')
    data = {
        'Open': np.random.randn(300).cumsum() + 100,
        'High': np.random.randn(300).cumsum() + 102,
        'Low': np.random.randn(300).cumsum() + 98,
        'Close': np.random.randn(300).cumsum() + 100,
        'Volume': np.random.randint(1_000_000, 10_000_000, 300)
    }
    return pd.DataFrame(data, index=dates)


@pytest.fixture
def mock_lstm_prediction():
    return {
        'success': True,
        'prediction': 'UP',
        'confidence': 75.0,
        'sentiment_score': 0.3,
        'fallback': False,
        'message': 'LSTM prediction successful'
    }


@pytest.fixture
def mock_fallback_lstm():
    return {
        'success': False,
        'error': 'Model not loaded',
        'prediction': 'UNAVAILABLE',
        'confidence': 0.0
    }


# ============================================================================
# Test: generate_stock_opinion
# ============================================================================

class TestGenerateStockOpinion:

    def test_generate_stock_opinion_success(self, mock_yfinance_data):
        with patch('stocks.opinion_generator.TechnicalAnalyzer._get_data') as mock_get_data:
            mock_get_data.return_value = mock_yfinance_data
            with patch('stocks.opinion_generator.get_lstm_predictor') as mock_lstm:
                mock_lstm.return_value.predict.return_value = {'success': True, 'prediction': 'UP', 'confidence': 75.0}
                result = generate_stock_opinion('AAPL', 'medium')
                assert 'symbol' in result
                assert result['symbol'] == 'AAPL'
                assert 'recommendation' in result
                assert 'price' in result
                assert 'technical_indicators' in result
                assert 'lstm_prediction' in result
                # Check that no error occurred
                assert 'error' not in result

    def test_generate_stock_opinion_invalid_symbol(self):
        """Invalid symbol format -> ValueError -> error response."""
        result = generate_stock_opinion('INVALID123!@#', 'medium')
        assert 'error' in result
        assert result['status'] == 'failed'
        assert 'Invalid stock symbol format' in result['error']

    def test_generate_stock_opinion_empty_symbol(self):
        result = generate_stock_opinion('', 'medium')
        assert 'error' in result
        assert result['status'] == 'failed'
        assert 'Invalid symbol provided' in result['error']

    def test_generate_stock_opinion_with_news_text(self, mock_yfinance_data):
        """News text is passed to LSTM predictor."""
        with patch('stocks.opinion_generator.TechnicalAnalyzer._get_data') as mock_get_data:
            mock_get_data.return_value = mock_yfinance_data
            with patch('stocks.opinion_generator.get_lstm_predictor') as mock_lstm:
                predictor = Mock()
                predictor.predict.return_value = {'success': True, 'prediction': 'UP', 'confidence': 75.0}
                mock_lstm.return_value = predictor
                generate_stock_opinion('AAPL', 'medium', news_text='Some news')
                predictor.predict.assert_called_with('AAPL', 'Some news')

    def test_generate_stock_opinion_fallback_on_lstm_failure(self, mock_yfinance_data):
        """If LSTM fails, analysis still returns with lstm_prediction error."""
        with patch('stocks.opinion_generator.TechnicalAnalyzer._get_data') as mock_get_data:
            mock_get_data.return_value = mock_yfinance_data
            with patch('stocks.opinion_generator.get_lstm_predictor') as mock_lstm:
                mock_lstm.return_value.predict.side_effect = Exception('LSTM crash')
                result = generate_stock_opinion('AAPL', 'medium')
                assert 'symbol' in result
                assert 'lstm_prediction' in result
                assert result['lstm_prediction']['direction'] == 'UNAVAILABLE'
                assert 'error' in result['lstm_prediction']

    def test_generate_stock_opinion_technical_analyzer_exception(self):
        """If TechnicalAnalyzer raises, return error response."""
        with patch('stocks.opinion_generator.TechnicalAnalyzer.analyze') as mock_analyze:
            mock_analyze.side_effect = Exception('Technical failure')
            result = generate_stock_opinion('AAPL', 'medium')
            assert 'error' in result
            assert result['status'] == 'failed'


# ============================================================================
# Test: format_investment_analysis
# ============================================================================

class TestFormatInvestmentAnalysis:

    def test_format_investment_analysis_success(self):
        """Format a valid analysis result."""
        analysis = {
            'symbol': 'AAPL',
            'recommendation': 'BUY',
            'confidence': 65.0,
            'price': 150.0,
            'risk_profile': 'medium',
            'technical_indicators': {'rsi': 55, 'volatility': 0.2},
            'market_regime': {'regime': 'bull', 'confidence': 70},
            'summary': 'Test summary',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'lstm_prediction': {'direction': 'UP', 'confidence': 75.0}
        }
        result = format_investment_analysis(analysis)
        assert result['success'] is True
        assert result['symbol'] == 'AAPL'
        assert result['analysis']['recommendation'] == 'BUY'
        assert 'investment_thesis' in result['analysis']
        assert 'lstm_prediction' in result

    def test_format_investment_analysis_with_error(self):
        """If analysis contains error, return error formatted."""
        analysis = {'error': 'Something went wrong', 'symbol': 'AAPL', 'timestamp': '2026-01-01T00:00:00Z'}
        result = format_investment_analysis(analysis)
        assert result['success'] is False
        assert result['error'] == 'Something went wrong'
        assert result['symbol'] == 'AAPL'

    def test_format_investment_analysis_missing_fields(self):
        """Missing optional fields are filled with defaults."""
        analysis = {'symbol': 'GOOGL'}
        result = format_investment_analysis(analysis)
        assert result['success'] is True
        assert result['symbol'] == 'GOOGL'
        assert result['analysis']['recommendation'] == 'HOLD'
        assert result['analysis']['confidence'] == 0
        assert 'investment_thesis' in result['analysis']

    def test_format_investment_analysis_exception(self):
        """If formatting fails, return error dict."""
        # Pass data that causes exception (e.g., non-dict)
        result = format_investment_analysis(None)
        assert result['success'] is False
        assert 'Formatting failed' in result['error']


# ============================================================================
# Test: TechnicalAnalyzer
# ============================================================================

class TestTechnicalAnalyzer:

    def test_analyze_cached_technical_metrics(self):
        """If technical metrics cached, return cached data."""
        with patch('stocks.opinion_generator._get_cached_technical_data') as mock_cache:
            mock_cache.return_value = TechnicalMetrics(
                sma_50=100, sma_200=95, rsi=50, current_price=100,
                volatility=0.2, confidence=50,
                market_regime=MarketRegimeResult(MarketRegime.NEUTRAL, 50)
            )
            analyzer = TechnicalAnalyzer()
            result = analyzer.analyze('AAPL')
            assert result.current_price == 100
            mock_cache.assert_called_once_with('AAPL')

    def test_analyze_with_insufficient_data_fallback(self):
        """If data is empty or < MIN_DATA_POINTS, use fallback metrics."""
        with patch('stocks.opinion_generator.TechnicalAnalyzer._get_data') as mock_get_data:
            mock_get_data.return_value = pd.DataFrame()  # empty
            analyzer = TechnicalAnalyzer()
            with patch.object(analyzer, '_get_fallback_metrics') as mock_fallback:
                mock_fallback.return_value = TechnicalMetrics(
                    sma_50=100, sma_200=95, rsi=50, current_price=100,
                    volatility=0.2, confidence=30,
                    market_regime=MarketRegimeResult(MarketRegime.NEUTRAL, 50)
                )
                result = analyzer.analyze('AAPL')
                assert result.confidence == 30
                mock_fallback.assert_called_with('AAPL')

    def test_analyze_calculates_metrics_from_data(self, mock_yfinance_data):
        """When data is sufficient, compute technical metrics."""
        with patch('stocks.opinion_generator.TechnicalAnalyzer._get_data') as mock_get_data:
            mock_get_data.return_value = mock_yfinance_data
            with patch('stocks.opinion_generator.MarketRegimeDetector.get_current_regime') as mock_regime:
                mock_regime.return_value = MarketRegimeResult(MarketRegime.NEUTRAL, 50)
                analyzer = TechnicalAnalyzer()
                # Ensure we use a real data but we need to mock the methods that call external APIs
                # Actually _get_data will be called, we mocked it.
                result = analyzer.analyze('AAPL')
                assert isinstance(result, TechnicalMetrics)
                assert result.current_price > 0
                assert 0 <= result.rsi <= 100
                assert result.volatility >= 0

    def test__get_data_cache_hit(self):
        """_get_data returns cached price data if available."""
        with patch('stocks.opinion_generator._get_cached_price_data') as mock_cache:
            mock_cache.return_value = pd.DataFrame({'Close': [100, 101]})
            analyzer = TechnicalAnalyzer()
            data = analyzer._get_data('AAPL')
            assert not data.empty
            assert data['Close'].iloc[-1] == 101
            mock_cache.assert_called_once_with('AAPL')

    def test__get_data_finnhub_success(self, mock_yfinance_data):
        """_get_data falls back to Finnhub if cache miss."""
        with patch('stocks.opinion_generator._get_cached_price_data', return_value=None):
            with patch.object(TechnicalAnalyzer, '_fetch_from_finnhub', return_value=mock_yfinance_data) as mock_finnhub:
                analyzer = TechnicalAnalyzer()
                data = analyzer._get_data('AAPL')
                assert not data.empty
                mock_finnhub.assert_called_once_with('AAPL')

    def test__get_data_all_sources_fail(self):
        """If all sources fail, return empty DataFrame."""
        with patch('stocks.opinion_generator._get_cached_price_data', return_value=None):
            with patch.object(TechnicalAnalyzer, '_fetch_from_finnhub', return_value=pd.DataFrame()):
                with patch.object(TechnicalAnalyzer, '_fetch_from_twelvedata', return_value=pd.DataFrame()):
                    with patch.object(TechnicalAnalyzer, '_fetch_from_yahoo', return_value=pd.DataFrame()):
                        with patch.object(TechnicalAnalyzer, '_fetch_from_alpha_vantage', return_value=pd.DataFrame()):
                            analyzer = TechnicalAnalyzer()
                            data = analyzer._get_data('AAPL')
                            assert data.empty

    def test_fetch_from_finnhub_no_key(self):
        """If Finnhub key missing, return empty DataFrame."""
        analyzer = TechnicalAnalyzer()
        analyzer.finnhub_key = ''
        df = analyzer._fetch_from_finnhub('AAPL')
        assert df.empty

    def test_fetch_from_finnhub_invalid_response(self):
        """Finnhub returns invalid data -> empty DataFrame."""
        with patch('requests.get') as mock_get:
            mock_get.return_value.json.return_value = {'c': 0}  # invalid
            analyzer = TechnicalAnalyzer()
            analyzer.finnhub_key = 'fake'
            df = analyzer._fetch_from_finnhub('AAPL')
            assert df.empty

    def test_fetch_from_finnhub_valid(self):
        # Create 20 candles
        c = list(range(100, 120))
        h = [x + 2 for x in c]
        l = [x - 2 for x in c]
        o = [x - 1 for x in c]
        v = [1000 * (i + 1) for i in range(20)]
        t = [1620000000 + i * 86400 for i in range(20)]

        mock_candle = {
            'c': c, 'h': h, 'l': l, 'o': o, 'v': v, 't': t
        }
        with patch('requests.get') as mock_get:
            mock_get.side_effect = [
                Mock(json=Mock(return_value={'c': 100})),
                Mock(json=Mock(return_value=mock_candle))
            ]
            analyzer = TechnicalAnalyzer()
            analyzer.finnhub_key = 'fake'
            df = analyzer._fetch_from_finnhub('AAPL')
            assert not df.empty
            assert 'Close' in df.columns
            assert len(df) == 20

    # More tests for other fetchers can be added similarly

    def test__calculate_rsi(self):
        """RSI calculation returns correct value."""
        closes = pd.Series([100, 101, 102, 101, 100, 99, 98, 97, 96, 95, 94, 93, 92, 91])
        analyzer = TechnicalAnalyzer()
        rsi = analyzer._calculate_rsi(closes, window=14)
        assert 0 <= rsi <= 100
        # For a consistently decreasing series, RSI should be low
        assert rsi < 50

    def test__calculate_confidence(self, mock_yfinance_data):
        """Confidence score is within 0-100."""
        analyzer = TechnicalAnalyzer()
        data = mock_yfinance_data
        closes = data['Close']
        sma_50 = closes.tail(50).mean()
        sma_200 = closes.tail(200).mean()
        current_price = closes.iloc[-1]
        rsi = analyzer._calculate_rsi(closes)
        volatility = closes.pct_change().std() * np.sqrt(252)
        conf = analyzer._calculate_confidence(data, sma_50, sma_200, current_price, rsi, volatility)
        assert 0 <= conf <= 100

    def test__get_fallback_metrics(self):
        """Fallback metrics use Config.FALLBACK_PRICES or default."""
        analyzer = TechnicalAnalyzer()
        metrics = analyzer._get_fallback_metrics('AAPL')
        assert metrics.current_price == Config.FALLBACK_PRICES.get('AAPL')
        assert metrics.confidence == 30.0
        assert metrics.market_regime.regime == MarketRegime.NEUTRAL
        # Unknown symbol uses default
        metrics2 = analyzer._get_fallback_metrics('UNKNOWN')
        assert metrics2.current_price == Config.DEFAULT_FALLBACK_PRICE


# ============================================================================
# Test: MarketRegimeDetector
# ============================================================================

class TestMarketRegimeDetector:

    def test_get_current_regime_cache_hit(self):
        """Return cached regime if present."""
        with patch('stocks.opinion_generator._get_cached_data') as mock_cache:
            mock_cache.return_value = MarketRegimeResult(MarketRegime.BULL, 80)
            detector = MarketRegimeDetector()
            result = detector.get_current_regime()
            assert result.regime == MarketRegime.BULL
            assert result.confidence == 80

    def test_get_current_regime_fetch_spy_success(self, mock_yfinance_data):
        """Fetch SPY data and compute regime."""
        with patch('stocks.opinion_generator._get_cached_data', return_value=None):
            with patch('stocks.opinion_generator.MarketRegimeDetector._fetch_spy_data') as mock_fetch:
                mock_fetch.return_value = mock_yfinance_data
                detector = MarketRegimeDetector()
                result = detector.get_current_regime()
                # Depending on data, regime might be any; just check it's a valid MarketRegime
                assert isinstance(result.regime, MarketRegime)
                assert 0 <= result.confidence <= 100

    def test_get_current_regime_spy_empty_fallback(self):
        """If SPY data empty, return neutral regime."""
        with patch('stocks.opinion_generator._get_cached_data', return_value=None):
            with patch('stocks.opinion_generator.MarketRegimeDetector._fetch_spy_data') as mock_fetch:
                mock_fetch.return_value = pd.DataFrame()
                detector = MarketRegimeDetector()
                result = detector.get_current_regime()
                assert result.regime == MarketRegime.NEUTRAL
                assert result.confidence == 50

    def test__fetch_spy_data_uses_cache(self):
        """Internal SPY cache returns cached data within 15 min."""
        detector = MarketRegimeDetector()
        with patch('yfinance.download') as mock_download:
            mock_download.return_value = pd.DataFrame({'Close': [100, 101]})
            first = detector._fetch_spy_data()
            assert not first.empty
            # Second call should not download again (cache hit)
            second = detector._fetch_spy_data()
            assert not second.empty
            # mock_download should be called once
            mock_download.assert_called_once()


# ============================================================================
# Test: InstitutionalAnalysisEngine
# ============================================================================

class TestInstitutionalAnalysisEngine:

    def test_validation_raises_for_invalid_symbol(self):
        with pytest.raises(ValueError, match="Invalid stock symbol format"):
            InstitutionalAnalysisEngine('INVALID!')

    def test_full_analysis_happy_path(self, mock_yfinance_data):
        with patch('stocks.opinion_generator.TechnicalAnalyzer.analyze') as mock_analyze:
            mock_analyze.return_value = TechnicalMetrics(
                sma_50=100, sma_200=95, rsi=50, current_price=100,
                volatility=0.2, confidence=50,
                market_regime=MarketRegimeResult(MarketRegime.NEUTRAL, 50)
            )
            with patch('stocks.opinion_generator.get_lstm_predictor') as mock_lstm:
                mock_lstm.return_value.predict.return_value = {'success': True, 'prediction': 'UP', 'confidence': 75.0}
                engine = InstitutionalAnalysisEngine('AAPL', 'medium')
                result = engine.full_analysis()
                assert result['symbol'] == 'AAPL'
                assert 'recommendation' in result
                assert 'technical_indicators' in result
                assert 'lstm_prediction' in result
                assert result['lstm_prediction']['direction'] == 'UP'

    def test_full_analysis_fallback_price_zero(self):
        with patch('stocks.opinion_generator.TechnicalAnalyzer.analyze') as mock_analyze:
            # Mock object with zero price (bypasses Pydantic validation)
            mock_metrics = Mock(spec=TechnicalMetrics)
            mock_metrics.current_price = 0.0
            mock_analyze.return_value = mock_metrics

            with patch.object(TechnicalAnalyzer, '_get_fallback_metrics') as mock_fallback:
                fallback = TechnicalMetrics(
                    sma_50=100, sma_200=95, rsi=50, current_price=100.0,
                    volatility=0.2, confidence=30,
                    market_regime=MarketRegimeResult(MarketRegime.NEUTRAL, 50)
                )
                mock_fallback.return_value = fallback
                engine = InstitutionalAnalysisEngine('AAPL', 'medium')
                result = engine.full_analysis()
                assert result['price'] == 100.0
                mock_fallback.assert_called_once_with('AAPL')

    def test_full_analysis_exception_returns_error(self):
        with patch('stocks.opinion_generator.TechnicalAnalyzer.analyze') as mock_analyze:
            mock_analyze.side_effect = Exception('Analysis error')
            engine = InstitutionalAnalysisEngine('AAPL', 'medium')
            result = engine.full_analysis()
            assert 'error' in result
            assert result['status'] == 'failed'

    def test__generate_recommendation(self):
        engine = InstitutionalAnalysisEngine('AAPL', 'medium')
        metrics = TechnicalMetrics(
            sma_50=100, sma_200=95, rsi=50, current_price=105,
            volatility=0.2, confidence=50,
            market_regime=MarketRegimeResult(MarketRegime.NEUTRAL, 50)
        )
        # Above both MA and RSI < threshold -> BUY
        rec = engine._generate_recommendation(metrics)
        assert rec in [Recommendation.BUY, Recommendation.STRONG_BUY]
        # Below both MA and RSI > sell threshold -> SELL
        metrics.current_price = 90
        metrics.rsi = 65
        rec = engine._generate_recommendation(metrics)
        assert rec in [Recommendation.SELL, Recommendation.STRONG_SELL]

    def test__format_response(self):
        engine = InstitutionalAnalysisEngine('AAPL', 'medium')
        metrics = TechnicalMetrics(
            sma_50=100, sma_200=95, rsi=50, current_price=100,
            volatility=0.2, confidence=50,
            market_regime=MarketRegimeResult(MarketRegime.NEUTRAL, 50)
        )
        response = engine._format_response(metrics)
        assert 'symbol' in response
        assert 'price' in response
        assert 'recommendation' in response
        assert 'technical_indicators' in response
        assert 'summary' in response

    def test__get_lstm_prediction_success(self, mock_lstm_prediction):
        with patch('stocks.opinion_generator.get_lstm_predictor') as mock_lstm:
            mock_lstm.return_value.predict.return_value = mock_lstm_prediction
            engine = InstitutionalAnalysisEngine('AAPL', 'medium')
            result = engine._get_lstm_prediction('')
            assert result['direction'] == 'UP'
            assert result['confidence'] == 75.0

    def test__get_lstm_prediction_failure(self, mock_fallback_lstm):
        with patch('stocks.opinion_generator.get_lstm_predictor') as mock_lstm:
            mock_lstm.return_value.predict.return_value = mock_fallback_lstm
            engine = InstitutionalAnalysisEngine('AAPL', 'medium')
            result = engine._get_lstm_prediction('')
            assert result['direction'] == 'UNAVAILABLE'
            assert result['confidence'] == 0.0
            assert 'error' in result

    def test__get_lstm_prediction_exception(self):
        with patch('stocks.opinion_generator.get_lstm_predictor') as mock_lstm:
            mock_lstm.return_value.predict.side_effect = Exception('LSTM crash')
            engine = InstitutionalAnalysisEngine('AAPL', 'medium')
            result = engine._get_lstm_prediction('')
            assert result['direction'] == 'UNAVAILABLE'
            assert 'error' in result


# ============================================================================
# Test: get_technical_analyzer singleton
# ============================================================================

def test_get_technical_analyzer_singleton():
    """Ensure get_technical_analyzer returns the same instance."""
    first = get_technical_analyzer()
    second = get_technical_analyzer()
    assert first is second


def test_clear_all_caches():
    """clear_all_caches calls analyzer.clear_cache."""
    with patch.object(TechnicalAnalyzer, 'clear_cache') as mock_clear:
        from stocks.opinion_generator import clear_all_caches
        clear_all_caches()
        mock_clear.assert_called_once()


# ============================================================================
# Test: cache helpers
# ============================================================================

def test_cache_helpers():
    """Test _get_cached_price_data, _cache_price_data, etc."""
    from django.core.cache import cache
    # Clear cache first
    cache.clear()
    symbol = 'AAPL'
    df = pd.DataFrame({'Close': [100]})
    _cache_price_data(symbol, df, ttl=60)
    cached = _get_cached_price_data(symbol)
    assert cached is not None and not cached.empty
    assert cached['Close'].iloc[-1] == 100

    # Technical metrics
    metrics = TechnicalMetrics(
        sma_50=100, sma_200=95, rsi=50, current_price=100,
        volatility=0.2, confidence=50,
        market_regime=MarketRegimeResult(MarketRegime.NEUTRAL, 50)
    )
    _cache_technical_data(symbol, metrics, ttl=60)
    cached_metrics = _get_cached_technical_data(symbol)
    assert cached_metrics is not None
    assert cached_metrics.current_price == 100

    # Generic cache set/get
    _set_cached_data('test_key', 'test_value', 60)
    assert _get_cached_data('test_key') == 'test_value'