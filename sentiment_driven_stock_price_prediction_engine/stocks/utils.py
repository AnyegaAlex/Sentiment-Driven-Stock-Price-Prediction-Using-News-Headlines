import logging
from datetime import datetime, timedelta
from decimal import Decimal
from django.db import IntegrityError
from django.db.models import Q, Count, Sum, Avg
from .models import Prediction
import time
from django.core.cache import cache
from functools import wraps

# Optional imports for performance metrics
try:
    from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score
    import numpy as np
    import yfinance as yf
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("sklearn, numpy, or yfinance not installed. Performance metrics will be limited.")

logger = logging.getLogger(__name__)


# ============================================================
# – SAVE PREDICTION
# ============================================================

def save_prediction(
    symbol: str,
    movement: str,
    confidence: float,
    sentiment_score: float,
    headline: str = "",
    source: str = "lstm"
) -> Prediction:
    """
    Save a prediction record with de‑duplication logic.
    If a prediction with the same symbol, date, and similar confidence already exists,
    the existing record is returned and no new record is created.

    Args:
        symbol: Stock symbol (case-insensitive)
        movement: 'UP', 'DOWN', or 'neutral' (case-insensitive)
        confidence: Float between 0 and 1
        sentiment_score: Float, can be negative for negative sentiment
        headline: Optional news headline or description
        source: String identifier (default 'lstm')

    Returns:
        Prediction instance (either newly created or existing)
    """
    symbol = symbol.upper()
    movement = movement.lower()
    if movement not in ('up', 'down', 'neutral'):
        logger.warning(f"Invalid movement '{movement}' for {symbol}, defaulting to 'neutral'")
        movement = 'neutral'

    # Normalise confidence to 0-1
    confidence = max(0.0, min(1.0, float(confidence)))

    today = datetime.utcnow().date()

    # Check for existing prediction with same symbol, date, and close confidence (±5%)
    existing = Prediction.objects.filter(
        stock_symbol=symbol,
        date=today,
        predicted_movement=movement,
        confidence__range=(confidence - 0.05, confidence + 0.05)
    ).first()

    if existing:
        logger.debug(f"Duplicate prediction for {symbol} today – skipping creation")
        return existing

    # Create new prediction
    try:
        pred = Prediction.objects.create(
            date=today,
            stock_symbol=symbol,
            headline=headline or f"Prediction for {symbol}",
            sentiment_score=sentiment_score,
            predicted_movement=movement,
            confidence=confidence,
            source=source
        )
        logger.info(f"Saved prediction for {symbol}: {movement} (conf={confidence:.2f})")
        return pred
    except IntegrityError as e:
        # Rare race condition: another process may have created it simultaneously
        logger.warning(f"IntegrityError while saving prediction for {symbol}: {e}")
        # Return the existing record if found
        existing = Prediction.objects.filter(
            stock_symbol=symbol,
            date=today,
            predicted_movement=movement
        ).first()
        if existing:
            return existing
        # If still not found, re-raise the exception
        raise

# ============================================================
# – HELPER: Caching & Rate Limit Handling
# ============================================================

def retry_on_rate_limit(max_retries=3, delay=2):
    """Decorator to retry on 'Too Many Requests' with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if "Too Many Requests" in str(e) and attempt < max_retries - 1:
                        wait = delay * (2 ** attempt)
                        logger.warning(f"Rate limit hit, retrying in {wait}s...")
                        time.sleep(wait)
                    else:
                        raise
            return None
        return wrapper
    return decorator


def get_cached_price(symbol, date):
    """Get price from cache."""
    cache_key = f"price_{symbol}_{date.strftime('%Y%m%d')}"
    return cache.get(cache_key)


def set_cached_price(symbol, date, price):
    """Store price in cache for 7 days."""
    cache_key = f"price_{symbol}_{date.strftime('%Y%m%d')}"
    cache.set(cache_key, price, timeout=60*60*24*7)


@retry_on_rate_limit(max_retries=3, delay=2)
def fetch_yfinance_price(symbol, target_date):
    """Fetch closing price for a symbol on target_date using yfinance."""
    ticker = yf.Ticker(symbol)
    start = target_date - timedelta(days=2)
    end = target_date + timedelta(days=2)
    hist = ticker.history(start=start, end=end)
    if hist.empty:
        return None
    hist.index = hist.index.normalize()
    available_dates = hist.index.date
    valid_dates = [d for d in available_dates if d <= target_date]
    if not valid_dates:
        return None
    closest_date = max(valid_dates)
    price = float(hist.loc[hist.index.date == closest_date, 'Close'].iloc[0])
    return price

# ============================================================
# – PREDICTION RESOLUTION & METRICS
# ============================================================

def resolve_prediction(prediction, resolution_days=7):
    """
    Resolve a prediction after resolution_days with caching and rate limit handling.
    """
    try:
        resolution_date = prediction.date + timedelta(days=resolution_days)

        # Get price at prediction time (cached)
        pred_price = get_cached_price(prediction.stock_symbol, prediction.date)
        if pred_price is None:
            pred_price = fetch_yfinance_price(prediction.stock_symbol, prediction.date)
            if pred_price is not None:
                set_cached_price(prediction.stock_symbol, prediction.date, pred_price)
        if pred_price is None:
            if prediction.price_at_prediction:
                pred_price = float(prediction.price_at_prediction)
            else:
                logger.warning(f"No price data for {prediction.stock_symbol} on {prediction.date}")
                return False
        prediction.price_at_prediction = Decimal(str(pred_price))

        # Get price at resolution date (cached)
        res_price = get_cached_price(prediction.stock_symbol, resolution_date)
        if res_price is None:
            res_price = fetch_yfinance_price(prediction.stock_symbol, resolution_date)
            if res_price is not None:
                set_cached_price(prediction.stock_symbol, resolution_date, res_price)
        if res_price is None:
            logger.warning(f"No price data for {prediction.stock_symbol} on {resolution_date}")
            return False
        prediction.price_at_resolution = Decimal(str(res_price))

        # Determine direction
        if res_price > pred_price:
            prediction.actual_direction = 'up'
        elif res_price < pred_price:
            prediction.actual_direction = 'down'
        else:
            prediction.actual_direction = 'neutral'

        prediction.is_correct = (prediction.actual_direction == prediction.predicted_movement)

        # Percent change
        if pred_price:
            change = ((res_price - pred_price) / pred_price) * 100
            prediction.price_change_percent = Decimal(str(round(change, 2)))

        # Add SPY context (cached)
        spy_cache_key = f"spy_price_{resolution_date.strftime('%Y%m%d')}"
        spy_data = cache.get(spy_cache_key)
        if spy_data is None:
            spy = yf.Ticker("SPY")
            spy_hist = spy.history(start=prediction.date, end=resolution_date)
            if not spy_hist.empty:
                spy_return = (spy_hist['Close'].iloc[-1] / spy_hist['Close'].iloc[0] - 1) * 100
                spy_data = {
                    'spy_return': round(spy_return, 2),
                    'spy_price_start': float(spy_hist['Close'].iloc[0]),
                    'spy_price_end': float(spy_hist['Close'].iloc[-1]),
                }
                cache.set(spy_cache_key, spy_data, timeout=60*60*24*7)
        prediction.market_context = spy_data or {}

        prediction.resolution_date = datetime.now()
        prediction.time_to_resolution = prediction.resolution_date - prediction.date
        prediction.save()
        logger.info(f"Resolved prediction {prediction.id} for {prediction.stock_symbol}: {prediction.is_correct}")
        return True

    except Exception as e:
        logger.error(f"Error resolving prediction {prediction.id}: {e}")
        return False


def calculate_performance_metrics(queryset):
    """
    Calculate precision, recall, f1, confusion matrix from queryset.
    
    Args:
        queryset: QuerySet of Prediction objects (must have is_correct and actual_direction)
        
    Returns:
        dict: Performance metrics including accuracy, precision, recall, f1, confusion matrix
    """
    if not SKLEARN_AVAILABLE:
        logger.warning("sklearn not available – returning empty metrics")
        return {
            'accuracy': 0,
            'precision': 0,
            'recall': 0,
            'f1': 0,
            'balanced_accuracy': 0,
            'confusion_matrix': {'TP': 0, 'FP': 0, 'TN': 0, 'FN': 0}
        }
    
    if queryset.count() == 0:
        return {
            'accuracy': 0,
            'precision': 0,
            'recall': 0,
            'f1': 0,
            'balanced_accuracy': 0,
            'confusion_matrix': {'TP': 0, 'FP': 0, 'TN': 0, 'FN': 0}
        }
    
    # Only include resolved predictions
    resolved = queryset.filter(is_correct__isnull=False)
    if resolved.count() == 0:
        return {
            'accuracy': 0,
            'precision': 0,
            'recall': 0,
            'f1': 0,
            'balanced_accuracy': 0,
            'confusion_matrix': {'TP': 0, 'FP': 0, 'TN': 0, 'FN': 0}
        }
    
    # Extract actual and predicted
    y_true = []
    y_pred = []
    for pred in resolved:
        # Map direction to binary (up=1, down=0, neutral ignored)
        if pred.actual_direction in ['up', 'down']:
            y_true.append(1 if pred.actual_direction == 'up' else 0)
            y_pred.append(1 if pred.predicted_movement == 'up' else 0)
    
    if len(y_true) == 0:
        return {
            'accuracy': 0,
            'precision': 0,
            'recall': 0,
            'f1': 0,
            'balanced_accuracy': 0,
            'confusion_matrix': {'TP': 0, 'FP': 0, 'TN': 0, 'FN': 0}
        }
    
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    balanced_accuracy = (recall + (tn / (tn + fp) if (tn + fp) > 0 else 0)) / 2
    
    return {
        'accuracy': round(accuracy * 100, 1),
        'precision': round(precision * 100, 1),
        'recall': round(recall * 100, 1),
        'f1': round(f1 * 100, 1),
        'balanced_accuracy': round(balanced_accuracy * 100, 1),
        'confusion_matrix': {'TP': tp, 'FP': fp, 'TN': tn, 'FN': fn}
    }


def detect_drift(recent_period_days=30, baseline_period_days=90):
    """
    Detect performance drift by comparing recent vs baseline F1.
    
    Args:
        recent_period_days: Number of days for recent window
        baseline_period_days: Number of days for baseline window
        
    Returns:
        dict: Drift detection results including severity and metrics
    """
    from django.utils import timezone
    
    recent_start = timezone.now() - timedelta(days=recent_period_days)
    baseline_start = timezone.now() - timedelta(days=baseline_period_days)
    
    # Recent predictions (resolved within last 30 days)
    recent_qs = Prediction.objects.filter(
        resolution_date__gte=recent_start,
        is_correct__isnull=False
    )
    recent_metrics = calculate_performance_metrics(recent_qs)
    recent_f1 = recent_metrics['f1'] / 100  # convert to 0-1
    
    # Baseline predictions (resolved 30-90 days ago)
    baseline_qs = Prediction.objects.filter(
        resolution_date__gte=baseline_start,
        resolution_date__lt=recent_start,
        is_correct__isnull=False
    )
    baseline_metrics = calculate_performance_metrics(baseline_qs)
    baseline_f1 = baseline_metrics['f1'] / 100
    
    # Detect drift: drop > 10% or absolute drop > 0.1
    drift_detected = False
    severity = 'none'
    if baseline_f1 > 0 and recent_f1 > 0:
        drop = baseline_f1 - recent_f1
        drop_pct = (drop / baseline_f1) * 100
        if drop_pct > 10 or drop > 0.1:
            drift_detected = True
            if drop_pct > 20:
                severity = 'high'
            elif drop_pct > 15:
                severity = 'medium'
            else:
                severity = 'low'
    
    return {
        'drift_detected': drift_detected,
        'severity': severity,
        'recent_f1': recent_f1 * 100,
        'baseline_f1': baseline_f1 * 100,
        'drop_percent': round((baseline_f1 - recent_f1) / baseline_f1 * 100, 1) if baseline_f1 > 0 else 0,
        'recent_metrics': recent_metrics,
        'baseline_metrics': baseline_metrics
    }


def resolve_all_pending_predictions(resolution_days=7):
    """
    Resolve all pending predictions with a 1.5s delay between each to avoid rate limits.
    """
    cutoff_date = datetime.now() - timedelta(days=resolution_days)
    pending = Prediction.objects.filter(
        is_correct__isnull=True,
        date__lte=cutoff_date
    )
    results = {'total': pending.count(), 'resolved': 0, 'failed': 0}
    for idx, pred in enumerate(pending):
        if idx > 0:
            time.sleep(1.5)  # delay between calls
        success = resolve_prediction(pred, resolution_days)
        if success:
            results['resolved'] += 1
        else:
            results['failed'] += 1
    logger.info(f"Resolved {results['resolved']} predictions, {results['failed']} failed")
    return results