"""
Custom throttles for Tickflow Sentiment.

Provides rate limiting for:
- Anonymous users (IP-based)
- Authenticated users (user ID-based)
- API keys (per-key rate limiting)

All throttles include proper error handling, rate limit headers,
and support for different rate limits per scope.
"""

import logging
from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle

logger = logging.getLogger(__name__)


class APIKeyRateThrottle(SimpleRateThrottle):
    """
    Rate throttle for API key authentication.
    
    Rate limits are applied per API key, not per user.
    This allows different rate limits for different API keys/tiers.
    
    The rate is configured in settings as:
        REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['apikey'] = '200/minute'
    
    Response headers include:
        X-RateLimit-Limit: The maximum number of requests allowed
        X-RateLimit-Remaining: The number of requests remaining
        X-RateLimit-Reset: The time when the rate limit resets (UNIX timestamp)
    """
    scope = 'apikey'
    
    # Cache key format for the parent class
    cache_format = 'throttle_apikey_%(scope)s_%(ident)s'
    
    def get_cache_key(self, request, view):
        """
        Get the cache key for the current request.
        
        Returns None if no API key is provided (fallback to other throttles).
        """
        try:
            # Extract API key from headers
            api_key = request.headers.get('X-API-Key')
            if not api_key:
                # Also check Authorization header for Bearer token
                auth_header = request.headers.get('Authorization', '')
                if auth_header.startswith('Bearer '):
                    # This is a JWT, not an API key
                    return None
                return None
            
            # Use a sanitized version of the key as identifier
            # This prevents cache key collisions
            import hashlib
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:16]
            
            # Store usage for rate limit headers
            self._track_usage(request, api_key, key_hash)
            
            # Build cache key for parent class
            return self.cache_format % {
                'scope': self.scope,
                'ident': key_hash
            }
            
        except Exception as e:
            # If anything fails, log and allow the request (fail open)
            logger.error(f"APIKeyRateThrottle cache key error: {e}")
            return None
    
    def _track_usage(self, request, api_key, key_hash):
        """
        Track usage for rate limit headers.
        
        This stores usage data separately from the throttling mechanism
        so we can add rate limit headers to responses.
        """
        try:
            # Get current usage
            usage_key = f"apikey_usage_{key_hash}"
            usage = cache.get(usage_key, {'count': 0, 'reset_at': None})
            
            # Reset if expired
            from django.utils import timezone
            now = timezone.now().timestamp()
            
            if usage.get('reset_at') and now > usage.get('reset_at', 0):
                usage = {'count': 0, 'reset_at': None}
            
            # Increment count
            usage['count'] = usage.get('count', 0) + 1
            
            # Set reset time if not set
            if not usage.get('reset_at'):
                # Calculate reset time based on rate
                rate = self.get_rate()
                if rate:
                    num, period = rate.split('/')
                    num = int(num)
                    
                    # Parse period
                    if period.endswith('s'):
                        seconds = int(period[:-1])
                    elif period.endswith('m'):
                        seconds = int(period[:-1]) * 60
                    elif period.endswith('h'):
                        seconds = int(period[:-1]) * 3600
                    elif period.endswith('d'):
                        seconds = int(period[:-1]) * 86400
                    else:
                        seconds = 60  # default to 1 minute
                    
                    usage['reset_at'] = now + seconds
                    usage['limit'] = num
            
            # Store usage
            cache.set(usage_key, usage, timeout=3600)  # 1 hour cache
            
            # Store in request for response headers
            request._apikey_usage = usage
            request._apikey_key_hash = key_hash
            
        except Exception as e:
            logger.error(f"Failed to track API key usage: {e}")
    
    def get_rate(self):
        """
        Get the rate limit for this throttle.
        
        Can be overridden to provide different rates per key type.
        """
        if not getattr(self, '_rate', None):
            # Default rate from settings
            return super().get_rate()
        return self._rate
    
    def allow_request(self, request, view):
        """
        Determine if the request should be allowed.
        
        Overridden to add rate limit headers to the response.
        """
        # Get cache key
        cache_key = self.get_cache_key(request, view)
        if cache_key is None:
            # No API key, skip this throttle
            return True
        
        # Check if we've tracked usage
        if hasattr(request, '_apikey_usage'):
            usage = request._apikey_usage
            
            # Check if rate limit exceeded
            if usage.get('limit') and usage.get('count', 0) > usage.get('limit', 0):
                # Rate limit exceeded
                self._add_headers(request, usage)
                return False
        
        # Use parent class for actual throttling
        result = super().allow_request(request, view)
        
        # If allowed, add headers
        if result and hasattr(request, '_apikey_usage'):
            self._add_headers(request, request._apikey_usage)
        
        return result
    
    def _add_headers(self, request, usage):
        """
        Add rate limit headers to the response.
        
        Headers:
            X-RateLimit-Limit: The maximum number of requests allowed
            X-RateLimit-Remaining: The number of requests remaining
            X-RateLimit-Reset: The time when the rate limit resets (UNIX timestamp)
        """
        try:
            limit = usage.get('limit', 0)
            count = usage.get('count', 0)
            reset_at = usage.get('reset_at', 0)
            
            # Store in request for middleware to add to response
            request._rate_limit_headers = {
                'X-RateLimit-Limit': str(limit),
                'X-RateLimit-Remaining': str(max(0, limit - count)),
                'X-RateLimit-Reset': str(int(reset_at)),
            }
        except Exception as e:
            logger.error(f"Failed to add rate limit headers: {e}")


class CustomAnonRateThrottle(SimpleRateThrottle):
    """
    Custom anonymous rate throttle with better error handling.
    
    Rate limits are applied per IP address.
    """
    scope = 'anon'
    
    def get_cache_key(self, request, view):
        try:
            # Get client IP
            ip = request.META.get('REMOTE_ADDR')
            if not ip:
                # Fallback to X-Forwarded-For
                forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
                if forwarded:
                    ip = forwarded.split(',')[0].strip()
            
            if not ip:
                return None
            
            # Use IP as identifier
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
            
            # Use user ID as identifier
            return self.cache_format % {
                'scope': self.scope,
                'ident': str(request.user.id)
            }
            
        except Exception as e:
            logger.error(f"CustomUserRateThrottle cache key error: {e}")
            return None


class RateLimitHeadersMiddleware:
    """
    Middleware to add rate limit headers to responses.
    
    This middleware adds X-RateLimit-* headers to all responses
    if they were set by the throttles.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add rate limit headers if set
        if hasattr(request, '_rate_limit_headers'):
            for key, value in request._rate_limit_headers.items():
                response[key] = value
        
        return response