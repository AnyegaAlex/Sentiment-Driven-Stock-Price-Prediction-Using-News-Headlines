import logging
from datetime import datetime
from django.db import IntegrityError
from .models import Prediction

logger = logging.getLogger(__name__)

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