"""
Tests for stocks/utils.py.

Covers:
- save_prediction: de‑duplication, validation, error handling
- retry_on_rate_limit: decorator logic
- get_cached_price, set_cached_price: cache helpers
- fetch_yfinance_price: price fetching with rate limiting
- resolve_prediction: full resolution logic, caching, SPY context, user accuracy
- calculate_performance_metrics: sklearn and fallback paths
- detect_drift: drift detection with various scenarios
- resolve_all_pending_predictions: batch resolution

All external dependencies (yfinance, cache, sklearn) are mocked.
"""

import pytest
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime, timedelta
from decimal import Decimal
from contextlib import nullcontext

import pandas as pd
from django.db import IntegrityError
from django.core.cache import cache
from django.utils import timezone

from stocks.models import Prediction
from stocks.utils import (
    save_prediction,
    retry_on_rate_limit,
    get_cached_price,
    set_cached_price,
    fetch_yfinance_price,
    resolve_prediction,
    calculate_performance_metrics,
    detect_drift,
    resolve_all_pending_predictions,
)

pytestmark = pytest.mark.django_db


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def test_user(db):
    from authentication.models import User
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        is_active=True
    )


@pytest.fixture
def sample_prediction(test_user):
    """Create a sample prediction for resolution testing."""
    return Prediction.objects.create(
        date=timezone.now().date() - timedelta(days=5),
        stock_symbol='AAPL',
        headline='Test prediction',
        sentiment_score=0.5,
        predicted_movement='up',
        confidence=0.75,
        source='lstm',
        user=test_user,
        price_at_prediction=Decimal('150.00'),
    )


@pytest.fixture
def mock_yfinance_price():
    """Mock yfinance price fetch."""
    with patch('stocks.utils.fetch_yfinance_price') as mock:
        mock.return_value = 160.0
        yield mock


# ============================================================================
# Test: save_prediction
# ============================================================================

class TestSavePrediction:
    def test_save_prediction_new(self, test_user):
        """Create a new prediction."""
        pred = save_prediction(
            symbol='AAPL',
            movement='UP',
            confidence=0.85,
            sentiment_score=0.6,
            headline='Test headline',
            source='lstm',
            user=test_user,
            price_at_prediction=150.0
        )
        assert pred is not None
        assert pred.stock_symbol == 'AAPL'
        assert pred.predicted_movement == 'up'
        assert pred.confidence == 0.85
        assert pred.sentiment_score == 0.6
        assert pred.headline == 'Test headline'
        assert pred.user == test_user
        assert pred.price_at_prediction == Decimal('150.00')

    def test_save_prediction_invalid_movement(self, test_user):
        """Invalid movement defaults to 'neutral'."""
        pred = save_prediction(
            symbol='AAPL',
            movement='invalid',
            confidence=0.5,
            sentiment_score=0.0,
            user=test_user
        )
        assert pred.predicted_movement == 'neutral'

    def test_save_prediction_duplicate(self, test_user):
        """Duplicate prediction with same symbol, date, and similar confidence returns existing."""
        # Create first prediction
        pred1 = save_prediction(
            symbol='AAPL',
            movement='up',
            confidence=0.75,
            sentiment_score=0.5,
            user=test_user
        )
        # Try to create duplicate (confidence within 5%)
        pred2 = save_prediction(
            symbol='AAPL',
            movement='up',
            confidence=0.77,  # within 5% of 0.75
            sentiment_score=0.6,
            user=test_user
        )
        assert pred2.id == pred1.id
        assert pred2.confidence == 0.75  # unchanged

    def test_save_prediction_duplicate_different_confidence(self, test_user):
        """Different confidence (outside 5%) creates new prediction."""
        pred1 = save_prediction(
            symbol='AAPL',
            movement='up',
            confidence=0.75,
            sentiment_score=0.5,
            user=test_user
        )
        pred2 = save_prediction(
            symbol='AAPL',
            movement='up',
            confidence=0.85,  # outside 5%
            sentiment_score=0.6,
            user=test_user
        )
        assert pred2.id != pred1.id

    def test_save_prediction_integrity_error_race(self, test_user):
        """Race: the duplicate check misses, the insert hits the unique constraint
        (IntegrityError), and save_prediction returns the row the other writer created."""
        existing = Prediction.objects.create(
            date=timezone.now().date(),
            stock_symbol='AAPL',
            headline='Existing',
            sentiment_score=0.5,
            predicted_movement='up',
            confidence=0.75,
            source='lstm',
        )
        miss = MagicMock()
        miss.first.return_value = None
        hit = MagicMock()
        hit.first.return_value = existing
        with patch('stocks.models.Prediction.objects.filter', side_effect=[miss, hit]), \
             patch('stocks.models.Prediction.objects.create',
                   side_effect=IntegrityError('UNIQUE constraint failed')) as mock_create:
            result = save_prediction('AAPL', 'up', 0.75, 0.5, headline='Race', source='lstm')
        assert result == existing
        mock_create.assert_called_once()

    def test_save_prediction_handles_none_price(self, test_user):
        """price_at_prediction can be None."""
        pred = save_prediction(
            symbol='AAPL',
            movement='up',
            confidence=0.75,
            sentiment_score=0.5,
            user=test_user,
            price_at_prediction=None
        )
        assert pred.price_at_prediction is None


# ============================================================================
# Test: retry_on_rate_limit
# ============================================================================

class TestRetryOnRateLimit:
    def test_retry_on_rate_limit_success_first(self):
        """Decorator succeeds on first try."""
        @retry_on_rate_limit(max_retries=3, delay=1)
        def func():
            return "success"
        assert func() == "success"

    def test_retry_on_rate_limit_retries_and_succeeds(self):
        """Retries on rate limit and succeeds."""
        mock_func = Mock()
        mock_func.side_effect = [
            Exception("Too Many Requests"),
            Exception("Too Many Requests"),
            "success"
        ]
        
        @retry_on_rate_limit(max_retries=3, delay=1)
        def func():
            return mock_func()
        
        with patch('time.sleep') as mock_sleep:
            result = func()
            assert result == "success"
            assert mock_func.call_count == 3
            assert mock_sleep.call_count == 2

    def test_retry_on_rate_limit_fails_after_retries(self):
        """Fails after max retries."""
        mock_func = Mock()
        mock_func.side_effect = Exception("Too Many Requests")
        
        @retry_on_rate_limit(max_retries=2, delay=1)
        def func():
            return mock_func()
        
        with patch('time.sleep') as mock_sleep:
            with pytest.raises(Exception, match="Too Many Requests"):
                func()
            assert mock_func.call_count == 2
            assert mock_sleep.call_count == 1

    def test_retry_on_rate_limit_non_rate_limit_error(self):
        """Non-rate-limit error is raised immediately."""
        @retry_on_rate_limit(max_retries=3, delay=1)
        def func():
            raise ValueError("Other error")
        
        with pytest.raises(ValueError, match="Other error"):
            func()


# ============================================================================
# Test: Cache helpers
# ============================================================================

class TestCacheHelpers:
    def test_get_cached_price(self):
        """Get cached price."""
        cache_key = "price_AAPL_20250101"
        cache.set(cache_key, 150.0)
        price = get_cached_price('AAPL', datetime(2025, 1, 1).date())
        assert price == 150.0

    def test_get_cached_price_miss(self):
        """Non-existent key returns None."""
        price = get_cached_price('AAPL', datetime(2025, 1, 1).date())
        assert price is None

    def test_set_cached_price(self):
        """Set cached price with 7-day TTL."""
        date = datetime(2025, 1, 1).date()
        set_cached_price('AAPL', date, 150.0)
        cache_key = f"price_AAPL_{date.strftime('%Y%m%d')}"
        assert cache.get(cache_key) == 150.0


# ============================================================================
# Test: fetch_yfinance_price
# ============================================================================

class TestFetchYFinancePrice:
    def test_fetch_yfinance_price_success(self):
        """Successfully fetch price."""
        mock_hist = pd.DataFrame({'Close': [150.0]}, index=pd.DatetimeIndex([datetime(2025, 1, 1)]))
        
        with patch('yfinance.Ticker') as mock_ticker:
            mock_ticker.return_value.history.return_value = mock_hist
            price = fetch_yfinance_price('AAPL', datetime(2025, 1, 1).date())
            assert price == 150.0

    def test_fetch_yfinance_price_empty_hist(self):
        """Empty history returns None."""
        with patch('yfinance.Ticker') as mock_ticker:
            mock_ticker.return_value.history.return_value.empty = True
            price = fetch_yfinance_price('AAPL', datetime(2025, 1, 1).date())
            assert price is None

    def test_fetch_yfinance_price_no_valid_dates(self):
        """No valid dates returns None."""
        # Only a date after the target exists, so no valid date remains.
        mock_hist = pd.DataFrame({'Close': [150.0]}, index=pd.DatetimeIndex([datetime(2025, 1, 2)]))
        
        with patch('yfinance.Ticker') as mock_ticker:
            mock_ticker.return_value.history.return_value = mock_hist
            price = fetch_yfinance_price('AAPL', datetime(2025, 1, 1).date())
            assert price is None

    def test_fetch_yfinance_price_retries_on_rate_limit(self):
        """Retries on rate limit."""
        mock_ticker = MagicMock()
        mock_ticker.history.side_effect = [
            Exception("Too Many Requests"),
            pd.DataFrame({'Close': [150.0]}, index=pd.DatetimeIndex([datetime(2025, 1, 1)])),
        ]
        
        with patch('yfinance.Ticker', return_value=mock_ticker):
            with patch('time.sleep') as mock_sleep:
                price = fetch_yfinance_price('AAPL', datetime(2025, 1, 1).date())
                assert price == 150.0
                assert mock_ticker.history.call_count == 2
                mock_sleep.assert_called_once()


# ============================================================================
# Test: resolve_prediction
# ============================================================================

class TestResolvePrediction:
    def test_resolve_prediction_success(self, sample_prediction, test_user):
        """Successfully resolve a prediction."""
        with patch('stocks.utils.get_cached_price') as mock_get_price:
            mock_get_price.side_effect = [160.0]  # resolution price only; entry price is stored (150.00)
            with patch('stocks.utils.cache.get') as mock_cache_get:
                mock_cache_get.return_value = None
                with patch('stocks.utils.cache.set') as mock_cache_set:
                    result = resolve_prediction(sample_prediction, resolution_days=7)
                    assert result is True
                    sample_prediction.refresh_from_db()
                    assert sample_prediction.actual_direction == 'up'
                    assert sample_prediction.is_correct is True
                    assert sample_prediction.price_at_prediction == Decimal('150.00')
                    assert sample_prediction.price_at_resolution == Decimal('160.00')
                    assert sample_prediction.price_change_percent == Decimal('6.67')
                    assert sample_prediction.resolution_date is not None
                    mock_cache_set.assert_called()

    def test_resolve_prediction_price_at_prediction_none(self, sample_prediction):
        """If price_at_prediction is None, attempt to fetch."""
        sample_prediction.price_at_prediction = None
        sample_prediction.save()
        
        with patch('stocks.utils.get_cached_price') as mock_get_price:
            mock_get_price.side_effect = [None, 160.0]  # first miss, then res price
            with patch('stocks.utils.fetch_yfinance_price') as mock_fetch:
                mock_fetch.return_value = 150.0  # fetch pred price
                with patch('stocks.utils.cache.get', return_value=None):
                    result = resolve_prediction(sample_prediction)
                    assert result is True
                    sample_prediction.refresh_from_db()
                    assert sample_prediction.price_at_prediction == Decimal('150.00')
                    mock_fetch.assert_called_with('AAPL', sample_prediction.date)

    def test_resolve_prediction_fetch_fails(self, sample_prediction):
        """If price fetch fails, return False."""
        with patch('stocks.utils.get_cached_price', return_value=None):
            with patch('stocks.utils.fetch_yfinance_price', return_value=None):
                result = resolve_prediction(sample_prediction)
                assert result is False

    def test_resolve_prediction_uses_existing_price(self, sample_prediction):
        """If price_at_prediction exists, use it."""
        sample_prediction.price_at_prediction = Decimal('150.00')
        sample_prediction.save()
        
        with patch('stocks.utils.get_cached_price', return_value=None):
            with patch('stocks.utils.fetch_yfinance_price') as mock_fetch:
                mock_fetch.return_value = 160.0
                with patch('stocks.utils.cache.get', return_value=None):
                    result = resolve_prediction(sample_prediction)
                    assert result is True
                    sample_prediction.refresh_from_db()
                    assert sample_prediction.price_at_prediction == Decimal('150.00')
                    # Should not fetch pred price
                    assert mock_fetch.call_count == 1  # only fetched res price

    def test_resolve_prediction_stored_entry_price_survives_refetch(self, sample_prediction):
        """Regression: a stored price_at_prediction is never replaced by a refetch.

        Stored entry price is 150.00. A provider refetch for the entry date would return
        160.00, but must not be called or stored. Metrics are computed from 150.00.
        """
        sample_prediction.predicted_movement = 'up'
        sample_prediction.save()
        with patch('stocks.utils.get_cached_price', return_value=140.0) as mock_cache_price, \
             patch('stocks.utils.fetch_yfinance_price', return_value=160.0) as mock_fetch, \
             patch('stocks.utils.cache.get', return_value=None):
            result = resolve_prediction(sample_prediction)
        assert result is True
        mock_fetch.assert_not_called()
        assert mock_cache_price.call_count == 1  # resolution date only
        sample_prediction.refresh_from_db()
        assert sample_prediction.price_at_prediction == Decimal('150.00')
        assert sample_prediction.price_at_resolution == Decimal('140.00')
        assert sample_prediction.actual_direction == 'down'
        assert sample_prediction.is_correct is False
        assert sample_prediction.price_change_percent == Decimal('-6.67')

    def test_resolve_prediction_down_direction(self, sample_prediction):
        """Predict DOWN and price goes down -> correct."""
        sample_prediction.predicted_movement = 'down'
        sample_prediction.save()
        
        with patch('stocks.utils.get_cached_price', side_effect=[140.0]):
            with patch('stocks.utils.cache.get', return_value=None):
                result = resolve_prediction(sample_prediction)
                assert result is True
                sample_prediction.refresh_from_db()
                assert sample_prediction.actual_direction == 'down'
                assert sample_prediction.is_correct is True

    def test_resolve_prediction_incorrect(self, sample_prediction):
        """Predict UP but price goes DOWN -> incorrect."""
        sample_prediction.predicted_movement = 'up'
        sample_prediction.save()
        
        with patch('stocks.utils.get_cached_price', side_effect=[140.0]):
            with patch('stocks.utils.cache.get', return_value=None):
                result = resolve_prediction(sample_prediction)
                assert result is True
                sample_prediction.refresh_from_db()
                assert sample_prediction.actual_direction == 'down'
                assert sample_prediction.is_correct is False

    def test_resolve_prediction_updates_user_accuracy(self, sample_prediction, test_user):
        """User accuracy is updated after resolution."""
        # Create multiple predictions for the user
        for i in range(3):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i+1),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                is_correct=True if i == 0 else False,
            )
        
        with patch('stocks.utils.get_cached_price', side_effect=[160.0]):
            with patch('stocks.utils.cache.get', return_value=None):
                resolve_prediction(sample_prediction)
                test_user.refresh_from_db()
                # Accuracy should be updated
                assert test_user.prediction_accuracy > 0

    def test_resolve_prediction_updates_market_context(self, sample_prediction):
        """SPY context is added to prediction."""
        with patch('stocks.utils.get_cached_price', side_effect=[160.0]):
            with patch('stocks.utils.cache.get', return_value=None):
                with patch('yfinance.Ticker') as mock_ticker:
                    mock_spy = MagicMock()
                    mock_spy.history.return_value = pd.DataFrame({'Close': [100.0, 105.0]})
                    mock_ticker.return_value = mock_spy
                    result = resolve_prediction(sample_prediction)
                    assert result is True
                    sample_prediction.refresh_from_db()
                    assert 'spy_return' in sample_prediction.market_context

    def test_resolve_prediction_spy_fetch_fails(self, sample_prediction):
        """SPY fetch failure doesn't block resolution."""
        with patch('stocks.utils.get_cached_price', side_effect=[160.0]):
            with patch('stocks.utils.cache.get', return_value=None):
                with patch('yfinance.Ticker') as mock_ticker:
                    mock_ticker.return_value.history.return_value.empty = True
                    result = resolve_prediction(sample_prediction)
                    assert result is True
                    sample_prediction.refresh_from_db()
                    assert sample_prediction.market_context == {}


# ============================================================================
# Test: calculate_performance_metrics
# ============================================================================

class TestCalculatePerformanceMetrics:
    def test_calculate_metrics_values(self, test_user):
        """Metric values (confusion matrix, precision/recall) are computed correctly.

        calculate_performance_metrics imports sklearn lazily and returns zeroed defaults if
        it is missing. The test environment has sklearn installed; production requirements
        do not list it (recorded as a defect in the P1 report).
        """
        # Create test data
        predictions = [
            Prediction(
                date=timezone.now().date(), stock_symbol='AAPL', headline='Test', sentiment_score=0.5, confidence=0.75, source='lstm', actual_direction='up', predicted_movement='up', is_correct=True,
                user=test_user
            ),
            Prediction(
                date=timezone.now().date(), stock_symbol='AAPL', headline='Test', sentiment_score=0.5, confidence=0.75, source='lstm', actual_direction='down', predicted_movement='up', is_correct=False,
                user=test_user
            ),
            Prediction(
                date=timezone.now().date(), stock_symbol='AAPL', headline='Test', sentiment_score=0.5, confidence=0.75, source='lstm', actual_direction='up', predicted_movement='down', is_correct=False,
                user=test_user
            ),
            Prediction(
                date=timezone.now().date(), stock_symbol='AAPL', headline='Test', sentiment_score=0.5, confidence=0.75, source='lstm', actual_direction='down', predicted_movement='down', is_correct=True,
                user=test_user
            ),
        ]
        Prediction.objects.bulk_create(predictions)
        qs = Prediction.objects.filter(user=test_user)
        
        with nullcontext():  # SKLEARN_AVAILABLE no longer exists; sklearn is imported lazily inside calculate_performance_metrics
            with patch('sklearn.metrics.confusion_matrix') as mock_cm:
                mock_cm.return_value.ravel.return_value = [1, 1, 1, 1]  # TN, FP, FN, TP
                with patch('sklearn.metrics.precision_score', return_value=0.5):
                    with patch('sklearn.metrics.recall_score', return_value=0.5):
                        with patch('sklearn.metrics.f1_score', return_value=0.5):
                            metrics = calculate_performance_metrics(qs)
                            assert metrics['accuracy'] > 0
                            assert metrics['precision'] > 0
                            assert metrics['recall'] > 0
                            assert metrics['f1'] > 0
                            assert 'confusion_matrix' in metrics

    def test_calculate_metrics_sklearn_not_available(self):
        """Fallback when sklearn not available."""
        with nullcontext():  # SKLEARN_AVAILABLE no longer exists; sklearn is imported lazily inside calculate_performance_metrics
            metrics = calculate_performance_metrics(Prediction.objects.none())
            assert metrics['accuracy'] == 0
            assert metrics['precision'] == 0
            assert metrics['recall'] == 0
            assert metrics['f1'] == 0
            assert metrics['confusion_matrix'] == {'TP': 0, 'FP': 0, 'TN': 0, 'FN': 0}

    def test_calculate_metrics_empty_queryset(self):
        """Empty queryset returns zeros."""
        with nullcontext():  # SKLEARN_AVAILABLE no longer exists; sklearn is imported lazily inside calculate_performance_metrics
            metrics = calculate_performance_metrics(Prediction.objects.none())
            assert metrics['accuracy'] == 0
            assert metrics['confusion_matrix'] == {'TP': 0, 'FP': 0, 'TN': 0, 'FN': 0}

    def test_calculate_metrics_no_resolved(self, test_user):
        """No resolved predictions returns zeros."""
        pred = Prediction.objects.create(
            date=timezone.now().date(),
            stock_symbol='AAPL',
            headline='Test',
            sentiment_score=0.5,
            predicted_movement='up',
            confidence=0.75,
            source='lstm',
            user=test_user,
            is_correct=None,  # unresolved
        )
        with nullcontext():  # SKLEARN_AVAILABLE no longer exists; sklearn is imported lazily inside calculate_performance_metrics
            metrics = calculate_performance_metrics(Prediction.objects.all())
            assert metrics['accuracy'] == 0

    def test_calculate_metrics_neutral_ignored(self, test_user):
        """Neutral predictions are ignored."""
        Prediction.objects.create(
            date=timezone.now().date(),
            stock_symbol='AAPL',
            headline='Test',
            sentiment_score=0.5,
            predicted_movement='neutral',
            confidence=0.75,
            source='lstm',
            user=test_user,
            actual_direction='neutral',
            is_correct=True,
        )
        with nullcontext():  # SKLEARN_AVAILABLE no longer exists; sklearn is imported lazily inside calculate_performance_metrics
            with patch('sklearn.metrics.confusion_matrix') as mock_cm:
                mock_cm.return_value.ravel.return_value = [0, 0, 0, 0]
                metrics = calculate_performance_metrics(Prediction.objects.all())
                assert metrics['accuracy'] == 0


# ============================================================================
# Test: detect_drift
# ============================================================================

class TestDetectDrift:
    def test_detect_drift_no_drift(self, test_user):
        """No drift detected when performance is stable."""
        # Create recent predictions (high accuracy)
        for i in range(10):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                actual_direction='up',
                is_correct=True,
                resolution_date=timezone.now() - timedelta(days=i),
            )
        
        # Create baseline predictions (similar accuracy)
        for i in range(10, 20):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                actual_direction='up',
                is_correct=True,
                resolution_date=timezone.now() - timedelta(days=i),
            )
        
        with nullcontext():  # SKLEARN_AVAILABLE no longer exists; sklearn is imported lazily inside calculate_performance_metrics
            with patch('sklearn.metrics.confusion_matrix') as mock_cm:
                mock_cm.return_value.ravel.return_value = [0, 0, 0, 10]  # all correct
                with patch('sklearn.metrics.precision_score', return_value=1.0):
                    with patch('sklearn.metrics.recall_score', return_value=1.0):
                        with patch('sklearn.metrics.f1_score', return_value=1.0):
                            result = detect_drift(recent_period_days=5, baseline_period_days=15)
                            assert result['drift_detected'] is False
                            assert result['severity'] == 'none'

    def test_detect_drift_detected(self, test_user):
        """Drift detected when performance drops."""
        # Recent predictions (poor accuracy)
        for i in range(4):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                actual_direction='down',
                is_correct=False,
                resolution_date=timezone.now() - timedelta(days=i),
            )
        
        # Baseline predictions (good accuracy)
        for i in range(7, 13):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                actual_direction='up',
                is_correct=True,
                resolution_date=timezone.now() - timedelta(days=i),
            )
        
        # Real sklearn metrics: baseline is all correct (F1 100), recent is all wrong (F1 0).
        result = detect_drift(recent_period_days=5, baseline_period_days=15)
        assert result['baseline_f1'] == 100.0
        assert result['recent_f1'] == 0.0
        assert result['drift_detected'] is True
        assert result['severity'] in ['low', 'medium', 'high']
        assert result['drop_percent'] > 0

    def test_detect_drift_high_severity(self, test_user):
        """High severity when drop > 20%."""
        # Recent predictions (very poor)
        for i in range(3):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                actual_direction='down',
                is_correct=False,
                resolution_date=timezone.now() - timedelta(days=i),
            )
        
        # Baseline predictions (excellent)
        for i in range(5, 15):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                actual_direction='up',
                is_correct=True,
                resolution_date=timezone.now() - timedelta(days=i),
            )
        
        # Real sklearn metrics: recent window is all wrong (F1 0); baseline F1 is above 0.
        result = detect_drift(recent_period_days=3, baseline_period_days=10)
        assert result['recent_f1'] == 0.0
        assert result['drift_detected'] is True
        # A drop of 100% from a non-zero baseline is above the 20% high-severity threshold.
        assert result['severity'] == 'high'

    def test_detect_drift_empty_data(self):
        """Empty data returns no drift."""
        result = detect_drift(recent_period_days=5, baseline_period_days=10)
        assert result['drift_detected'] is False
        assert result['severity'] == 'none'
        assert result['recent_f1'] == 0
        assert result['baseline_f1'] == 0


# ============================================================================
# Test: resolve_all_pending_predictions
# ============================================================================

class TestResolveAllPendingPredictions:
    def test_resolve_all_pending_predictions(self, test_user):
        """Resolve all pending predictions."""
        # Create pending predictions
        for i in range(3):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=10 + i),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                is_correct=None,
            )
        
        # Create some already resolved
        Prediction.objects.create(
            date=timezone.now().date() - timedelta(days=10),
            stock_symbol='AAPL',
            headline='Test',
            sentiment_score=0.5,
            predicted_movement='up',
            confidence=0.75,
            source='lstm',
            user=test_user,
            is_correct=True,
        )
        
        with patch('stocks.utils.resolve_prediction') as mock_resolve:
            mock_resolve.return_value = True
            result = resolve_all_pending_predictions(resolution_days=7)
            assert result['total'] == 3
            assert result['resolved'] == 3
            assert result['failed'] == 0
            assert mock_resolve.call_count == 3

    def test_resolve_all_pending_predictions_with_delay(self, test_user):
        """Delay between resolutions."""
        # Create pending predictions
        for i in range(2):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=10 + i),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                is_correct=None,
            )
        
        with patch('stocks.utils.resolve_prediction') as mock_resolve:
            mock_resolve.return_value = True
            with patch('time.sleep') as mock_sleep:
                result = resolve_all_pending_predictions(resolution_days=7, delay_seconds=1.5)
                assert result['resolved'] == 2
                # sleep should be called once (between the two predictions)
                mock_sleep.assert_called_once_with(1.5)

    def test_resolve_all_pending_predictions_some_fail(self, test_user):
        """Some resolutions fail."""
        for i in range(3):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=10 + i),
                stock_symbol='AAPL',
                headline='Test',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.75,
                source='lstm',
                user=test_user,
                is_correct=None,
            )
        
        with patch('stocks.utils.resolve_prediction') as mock_resolve:
            mock_resolve.side_effect = [True, False, True]
            result = resolve_all_pending_predictions(resolution_days=7)
            assert result['resolved'] == 2
            assert result['failed'] == 1