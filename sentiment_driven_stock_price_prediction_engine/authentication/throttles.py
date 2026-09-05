"""
Custom throttles for Tickflow Intelligence.

Provides rate limiting for:
- Anonymous users (IP-based)
- Authenticated users (user ID-based)
- API keys (per-key rate limiting)

All throttles extend DRF's SimpleRateThrottle and add rate limit headers
to responses via a dedicated middleware (in authentication.middleware).

The headers are populated from the throttle's `allow_request` method.

Author: Tickflow Capital
Version: 1.1.0
"""

import logging
from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle

logger = logging.getLogger(__name__)


class APIKeyRateThrottle(SimpleRateThrottle):
    """
    Rate throttle for API key authentication.

    Rate limits are applied per API key (identified by a hash of the key).
    The rate is configured in settings as:
        REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['apikey'] = '200/minute'

    This throttle adds rate limit headers by storing usage data in the request
    object, which is later picked up by RateLimitHeadersMiddleware.
    """

    scope = 'apikey'
    cache_format = 'throttle_apikey_%(scope)s_%(ident)s'

    def get_cache_key(self, request, view):
        """
        Return a unique cache key for the current API key.

        Uses a SHA‑256 hash of the key to avoid long keys and prevent collisions.
        If no API key is provided (or only JWT), returns None to let other throttles handle.
        """
        try:
            api_key = self._extract_api_key(request)
            if not api_key:
                return None

            # Use a consistent identifier – hash of the key (16 chars)
            import hashlib
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:16]

            # Build cache key for parent class
            return self.cache_format % {
                'scope': self.scope,
                'ident': key_hash
            }

        except Exception as e:
            logger.error(f"APIKeyRateThrottle cache key error: {e}")
            # Fail open: allow request if cache key generation fails
            return None

    def _extract_api_key(self, request):
        """Extract API key from X-API-Key header or Bearer token (only if starts with ts_)."""
        api_key = request.headers.get('X-API-Key')
        if api_key:
            return api_key

        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
            if token.startswith('ts_'):  # API key prefix
                return token

        return None

    def allow_request(self, request, view):
        """
        Override to store rate limit information in the request for headers.

        Returns True if the request is allowed, False otherwise.
        """
        # Let parent class do the actual throttling
        allowed = super().allow_request(request, view)

        # Store rate limit headers in request (for middleware to add to response)
        # This avoids a separate cache lookup.
        if hasattr(self, 'rate') and self.rate:
            # Retrieve current usage from cache using the same key as parent
            cache_key = self.get_cache_key(request, view)
            if cache_key:
                history = cache.get(cache_key, [])
                # Limit is stored in self.num_requests and self.duration (set by parent)
                # Get the limit and remaining
                limit = self.num_requests if hasattr(self, 'num_requests') else 0
                remaining = max(0, limit - len(history))
                reset_time = None
                if history:
                    # Reset time = oldest timestamp + duration
                    oldest = history[-1] if history else 0
                    reset_time = int(oldest + self.duration) if self.duration else 0

                request._rate_limit_headers = {
                    'X-RateLimit-Limit': str(limit),
                    'X-RateLimit-Remaining': str(remaining),
                    'X-RateLimit-Reset': str(reset_time) if reset_time else '0',
                }

        return allowed


class CustomAnonRateThrottle(SimpleRateThrottle):
    """
    Custom anonymous rate throttle with better error handling.

    Rate limits are applied per IP address.
    """

    scope = 'anon'

    def get_cache_key(self, request, view):
        try:
            ip = request.META.get('REMOTE_ADDR')
            if not ip:
                forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
                if forwarded:
                    ip = forwarded.split(',')[0].strip()
            if not ip:
                return None

            return self.cache_format % {
                'scope': self.scope,
                'ident': ip
            }
        except Exception as e:
            logger.error(f"CustomAnonRateThrottle cache key error: {e}")
            return None


class CustomUserRateThrottle(SimpleRateThrottle):
    """
    Custom user rate throttle with better error handling.

    Rate limits are applied per authenticated user.
    """

    scope = 'user'

    def get_cache_key(self, request, view):
        try:
            if not request.user or not request.user.is_authenticated:
                return None

            return self.cache_format % {
                'scope': self.scope,
                'ident': str(request.user.id)
            }
        except Exception as e:
            logger.error(f"CustomUserRateThrottle cache key error: {e}")
            return None