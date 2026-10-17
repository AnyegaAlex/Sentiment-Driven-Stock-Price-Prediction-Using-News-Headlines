import logging
import time
from datetime import timedelta
from decimal import Decimal
from functools import wraps
from typing import Optional, Dict, Any

from django.db import IntegrityError
from django.db.models import QuerySet, Avg
from django.core.cache import cache
from django.utils import timezone

from .models import Prediction

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
    source: str = "lstm",
    user=None,                     
    price_at_prediction=None
) -> Prediction:
    """
    Save a prediction record with de-duplication logic.
    Ensures timezone awareness and prevents duplicate predictions for the same day.
    """
    symbol = symbol.upper()
    movement = movement.lower()
    
    if movement not in ('up', 'down', 'neutral'):
        logger.warning(f"Invalid movement '{movement}' for {symbol}, defaulting to 'neutral'")
        movement = 'neutral'

    confidence = max(0.0, min(1.0, float(confidence)))
    today = timezone.now().date()

    # Check for existing prediction to prevent duplicates
    existing = Prediction.objects.filter(
        stock_symbol=symbol,
        date=today,
        predicted_movement=movement,
        confidence__range=(confidence - 0.05, confidence + 0.05)
    ).first()

    if existing:
        logger.debug(f"Duplicate prediction for {symbol} today – skipping creation")
        return existing

    try:
        pred = Prediction.objects.create(
            date=today,
            stock_symbol=symbol,
            headline=headline or f"Prediction for {symbol}",
            sentiment_score=sentiment_score,
            predicted_movement=movement,
            confidence=confidence,
            source=source,
            user=user,
            price_at_prediction=price_at_prediction
        )
        logger.info(f"Saved prediction for {symbol}: {movement} (conf={confidence:.2f})")
        return pred
    except IntegrityError as e:
        logger.warning(f"IntegrityError while saving prediction for {symbol}: {e}")
        existing = Prediction.objects.filter(
            stock_symbol=symbol,
            date=today,
            predicted_movement=movement
        ).first()
        if existing:
            return existing
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


def get_cached_price(symbol: str, target_date) -> Optional[float]:
    """Retrieve cached price for a specific date."""
    cache_key = f"price_{symbol}_{target_date.strftime('%Y%m%d')}"
    return cache.get(cache_key)


def set_cached_price(symbol: str, target_date, price: float):
    """Cache price for a specific date (7 days TTL)."""
    cache_key = f"price_{symbol}_{target_date.strftime('%Y%m%d')}"
    cache.set(cache_key, price, timeout=60 * 60 * 24 * 7)


@retry_on_rate_limit(max_retries=3, delay=2)
def fetch_yfinance_price(symbol: str, target_date) -> Optional[float]:
    """Fetch closing price for a symbol on target_date using yfinance."""
    import yfinance as yf  # Lazy import to keep web server light

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

def resolve_prediction(prediction: Prediction, resolution_days: int = 7) -> bool:
    """
    Resolve a single prediction after `resolution_days`.
    Fetches historical prices, calculates actual direction, and updates user accuracy.
    Returns True if successfully resolved, False otherwise.
    """
    import yfinance as yf

    try:
        resolution_date = prediction.date + timedelta(days=resolution_days)

        # 1. Resolve Prediction Price
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

        # 2. Resolve Resolution Price
        res_price = get_cached_price(prediction.stock_symbol, resolution_date)
        if res_price is None:
            res_price = fetch_yfinance_price(prediction.stock_symbol, resolution_date)
            if res_price is not None:
                set_cached_price(prediction.stock_symbol, resolution_date, res_price)
                
        if res_price is None:
            logger.warning(f"No price data for {prediction.stock_symbol} on {resolution_date}")
            return False
            
        prediction.price_at_resolution = Decimal(str(res_price))

        # 3. Determine Actual Direction
        if res_price > pred_price:
            prediction.actual_direction = 'up'
        elif res_price < pred_price:
            prediction.actual_direction = 'down'
        else:
            prediction.actual_direction = 'neutral'

        prediction.is_correct = (prediction.actual_direction == prediction.predicted_movement)

        if pred_price:
            change = ((res_price - pred_price) / pred_price) * 100
            prediction.price_change_percent = Decimal(str(round(change, 2)))

        # 4. Market Context (SPY)
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
                cache.set(spy_cache_key, spy_data, timeout=60 * 60 * 24 * 7)
        prediction.market_context = spy_data or {}

        # 5. Save Resolution Details
        prediction.resolution_date = timezone.now()
        prediction.time_to_resolution = prediction.resolution_date - timezone.make_aware(
            timezone.datetime.combine(prediction.date, timezone.datetime.min.time())
        )
        prediction.save()

        # 6. Update User Accuracy (if user exists)
        if prediction.user:
            avg = Prediction.objects.filter(
                user=prediction.user,
                is_correct__isnull=False
            ).aggregate(avg=Avg('is_correct'))['avg']
            
            prediction.user.prediction_accuracy = round((avg or 0) * 100, 1)
            prediction.user.save(update_fields=['prediction_accuracy'])
            logger.info(f"Updated accuracy for user {prediction.user.id}: {prediction.user.prediction_accuracy}%")
            
        logger.info(f"Resolved prediction {prediction.id} for {prediction.stock_symbol}: {prediction.is_correct}")
        return True

    except Exception as e:
        logger.error(f"Error resolving prediction {prediction.id}: {e}", exc_info=True)
        return False


def calculate_performance_metrics(queryset: QuerySet) -> Dict[str, Any]:
    """Calculate precision, recall, f1, confusion matrix from queryset."""
    default_metrics = {
        'accuracy': 0,
        'precision': 0,
        'recall': 0,
        'f1': 0,
        'balanced_accuracy': 0,
        'confusion_matrix': {'TP': 0, 'FP': 0, 'TN': 0, 'FN': 0}
    }

    try:
        from sklearn.metrics import confusion_matrix
    except ImportError:
        logger.warning("sklearn not available – returning empty metrics")
        return default_metrics

    if queryset.count() == 0:
        return default_metrics

    resolved = queryset.filter(is_correct__isnull=False)
    if resolved.count() == 0:
        return default_metrics

    y_true = []
    y_pred = []
    for pred in resolved:
        if pred.actual_direction in ['up', 'down']:
            y_true.append(1 if pred.actual_direction == 'up' else 0)
            y_pred.append(1 if pred.predicted_movement == 'up' else 0)

    if len(y_true) == 0:
        return default_metrics

    # Defensive check: sklearn throws an error/warning if only one class is present
    if len(set(y_true)) == 1 and len(set(y_pred)) == 1:
         # Handle edge case where everything is UP or everything is DOWN
         tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    else:
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
        'confusion_matrix': {'TP': int(tp), 'FP': int(fp), 'TN': int(tn), 'FN': int(fn)}
    }


def detect_drift(recent_period_days: int = 30, baseline_period_days: int = 90) -> Dict[str, Any]:
    """Detect performance drift by comparing recent vs baseline F1."""
    recent_start = timezone.now() - timedelta(days=recent_period_days)
    baseline_start = timezone.now() - timedelta(days=baseline_period_days)

    recent_qs = Prediction.objects.filter(
        resolution_date__gte=recent_start,
        is_correct__isnull=False
    )
    recent_metrics = calculate_performance_metrics(recent_qs)
    recent_f1 = recent_metrics['f1'] / 100

    baseline_qs = Prediction.objects.filter(
        resolution_date__gte=baseline_start,
        resolution_date__lt=recent_start,
        is_correct__isnull=False
    )
    baseline_metrics = calculate_performance_metrics(baseline_qs)
    baseline_f1 = baseline_metrics['f1'] / 100

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


def resolve_all_pending_predictions(
    resolution_days: int = 7, 
    batch_size: Optional[int] = None, 
    delay_seconds: float = 1.0
) -> Dict[str, int]:
    """
    Resolve pending predictions (designed to run in GitHub Actions).
    
    Args:
        resolution_days: Number of days after which to resolve.
        batch_size: Max records to process in this run. If None, processes all.
        delay_seconds: Time to sleep between API requests to avoid rate limits.
        
    Returns:
        dict: Summary of resolved/failed counts.
    """
    cutoff_date = timezone.now() - timedelta(days=resolution_days)
    queryset = Prediction.objects.filter(
        is_correct__isnull=True,
        date__lte=cutoff_date
    ).order_by('date')
    
    total_pending = queryset.count()
    
    if total_pending == 0:
        logger.info("No pending predictions to resolve.")
        return {'total': 0, 'resolved': 0, 'failed': 0}

    # Apply batch size if provided
    items_to_process = queryset if batch_size is None else queryset[:batch_size]
    total_to_process = len(items_to_process)

    logger.info(f"Found {total_pending} pending predictions. Processing {total_to_process} in this run.")
    
    results = {'total': total_to_process, 'resolved': 0, 'failed': 0}
    
    for idx, pred in enumerate(items_to_process):
        if idx > 0 and delay_seconds > 0:
            time.sleep(delay_seconds)
            
        try:
            success = resolve_prediction(pred, resolution_days)
            if success:
                results['resolved'] += 1
            else:
                results['failed'] += 1
        except Exception as e:
            logger.error(f"Critical failure resolving prediction {pred.id}: {e}", exc_info=True)
            results['failed'] += 1
            
        # Observability: Log progress every 10 records
        if (idx + 1) % 10 == 0:
            logger.info(
                f"Progress: {idx + 1}/{total_to_process} processed. "
                f"Resolved: {results['resolved']}, Failed: {results['failed']}"
            )
            
    logger.info(
        f"Resolution complete: {results['resolved']} resolved, {results['failed']} failed "
        f"out of {results['total']} processed."
    )
    return results