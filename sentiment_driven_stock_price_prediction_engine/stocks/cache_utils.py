"""
Redis cache utilities for stock data.
"""

import logging
import pickle
from typing import Optional, Any
from django.core.cache import cache
from django.conf import settings
import pandas as pd

logger = logging.getLogger(__name__)

# TTL constants (in seconds)
TTL_PRICE = 60 * 5          # 5 minutes
TTL_TECHNICAL = 60 * 15     # 15 minutes
TTL_MARKET_REGIME = 60 * 30 # 30 minutes
TTL_SYMBOLS = 60 * 60 * 24  # 24 hours


def get_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a consistent cache key."""
    parts = [prefix]
    parts.extend(str(arg) for arg in args)
    parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
    return ":".join(parts)


def set_cached_data(key: str, data: Any, ttl: int = TTL_TECHNICAL) -> bool:
    """
    Store data in Redis cache with TTL.
    
    Args:
        key: Cache key
        data: Data to store (must be pickleable)
        ttl: Time-to-live in seconds
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        cache.set(key, data, timeout=ttl)
        logger.debug(f"Cached data for key: {key} (TTL: {ttl}s)")
        return True
    except Exception as e:
        logger.warning(f"Failed to cache data for {key}: {e}")
        return False


def get_cached_data(key: str) -> Optional[Any]:
    """
    Retrieve data from Redis cache.
    
    Args:
        key: Cache key
        
    Returns:
        Cached data or None if not found/expired
    """
    try:
        data = cache.get(key)
        if data is not None:
            logger.debug(f"Cache hit for key: {key}")
        return data
    except Exception as e:
        logger.warning(f"Failed to retrieve cache for {key}: {e}")
        return None


def delete_cached_data(key: str) -> bool:
    """Delete a specific cache entry."""
    try:
        cache.delete(key)
        logger.debug(f"Deleted cache key: {key}")
        return True
    except Exception as e:
        logger.warning(f"Failed to delete cache {key}: {e}")
        return False


def clear_cache_pattern(pattern: str) -> int:
    """
    Clear all cache keys matching a pattern.
    
    Args:
        pattern: Key pattern to match (e.g., "technical:*")
        
    Returns:
        Number of keys deleted
    """
    try:
        from django.core.cache.backends.base import DEFAULT_TIMEOUT
        if hasattr(cache, 'delete_pattern'):
            deleted = cache.delete_pattern(pattern)
            logger.info(f"Cleared cache pattern: {pattern} ({deleted} keys)")
            return deleted
        else:
            # Fallback: iterate and delete
            logger.warning("delete_pattern not available, skipping")
            return 0
    except Exception as e:
        logger.warning(f"Failed to clear cache pattern {pattern}: {e}")
        return 0


def cache_technical_data(
    symbol: str,
    technical_metrics: Any,
    ttl: int = TTL_TECHNICAL
) -> bool:
    """
    Store technical metrics with symbol-based key.
    """
    key = get_cache_key("technical", symbol)
    return set_cached_data(key, technical_metrics, ttl)


def get_cached_technical_data(symbol: str) -> Optional[Any]:
    """
    Get cached technical metrics for a symbol.
    """
    key = get_cache_key("technical", symbol)
    return get_cached_data(key)


def cache_price_data(symbol: str, price_data: pd.DataFrame, ttl: int = TTL_PRICE) -> bool:
    """
    Store price data (DataFrame) with symbol-based key.
    """
    key = get_cache_key("price", symbol)
    return set_cached_data(key, price_data, ttl)


def get_cached_price_data(symbol: str) -> Optional[pd.DataFrame]:
    """
    Get cached price data for a symbol.
    """
    key = get_cache_key("price", symbol)
    data = get_cached_data(key)
    return data