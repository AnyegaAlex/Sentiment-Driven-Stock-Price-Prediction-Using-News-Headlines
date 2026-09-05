"""
Custom middleware for authentication, rate limiting, logging, and deprecation.

Includes:
- APIKeyMiddleware: Enforces API key for unauthenticated requests; skips check for authenticated JWT users.
  Uses direct hashed-key database lookup (O(1)) for performance.
- DeprecationMiddleware: Adds deprecation headers to legacy endpoints.
- RateLimitHeadersMiddleware: Informs clients about rate limit usage.
- RequestLoggingMiddleware: Logs all requests with timing and request ID.

Performance optimised:
- API key validation uses hashed-key lookup with caching.
- `last_used` updates are batched via cache and flushed on request end.

Author: Tickflow Capital
Version: 1.1.0
"""

import time
import uuid
import hashlib
import logging
from django.conf import settings
from django.http import JsonResponse
from django.core.cache import cache
from django.utils import timezone
from rest_framework.settings import api_settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import UserAPIKey
from .utils import error_response, success_response

logger = logging.getLogger(__name__)

# ============================================================================
# CONSTANTS
# ============================================================================

# Exempt paths (no authentication required)
PUBLIC_PATHS = [
    '/',
    # Admin & Monitoring
    '/admin/',
    '/health/',
    '/api/v1/health/',
    '/sentry-debug/',

    # API Documentation
    '/api/docs/',
    '/api/schema/',

    # Authentication (Public)
    '/api/v1/auth/register/',
    '/api/v1/auth/login/',
    '/api/v1/auth/verify-email/',
    '/api/v1/auth/resend-verification/',
    '/api/v1/auth/password-reset/',
    '/api/v1/auth/password-reset/confirm/',
    '/api/v1/auth/refresh/',

    # Newsletter (Optional – can be public)
    '/api/v1/subscribe/',

    # Stock Analysis (Public – No Auth Required)
    '/api/v1/stock-analysis/',
    '/api/v1/technical-indicators/',
    '/api/v1/sentiment-analysis/',
    '/api/v1/lstm-predict/',
    '/api/v1/symbols/',

    # NOTE: '/stocks/cron/' is internal – if it's meant for cron jobs, it should be protected.
    # Consider removing it from public paths or adding IP whitelist.
    '/stocks/cron/',
]

# Deprecated endpoints
DEPRECATED_PATHS = [
    '/api/stock-opinion/',
    '/api/news/analyzed/',
]


# ============================================================================
# API KEY AUTHENTICATION MIDDLEWARE
# ============================================================================

class APIKeyMiddleware:
    """
    Enforces API key authentication for all non-exempt endpoints,
    but skips the check if the user is already authenticated via JWT.

    Performance: Uses direct hashed-key lookup (O(1)) and caches results.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()

    def __call__(self, request):
        # 1. Try JWT authentication for ALL requests
        try:
            auth_result = self.jwt_auth.authenticate(request)
            if auth_result:
                user, _ = auth_result
                request.user = user
                return self.get_response(request)
        except (InvalidToken, TokenError, Exception):
            # JWT failed – continue to public paths check
            pass

        # 2. Skip public paths if JWT failed
        if self._is_public_path(request.path):
            return self.get_response(request)

        # 3. Check API key (X-API-Key header)
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return JsonResponse(
                error_response(
                    message='API key required. Please provide X-API-Key header.',
                    code='AUTH_API_KEY_REQUIRED',
                    status_code=401
                ),
                status=401
            )

        # 4. Validate API key using O(1) hashed lookup
        key_obj = self._validate_api_key(api_key)
        if not key_obj:
            logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
            return JsonResponse(
                error_response(
                    message='Invalid or inactive API key.',
                    code='AUTH_INVALID_API_KEY',
                    status_code=401
                ),
                status=401
            )

        # 5. Update last_used (cached, flushed on response)
        self._update_last_used_async(key_obj)

        # 6. Set user and key on request
        request.user = key_obj.user
        request.api_key_obj = key_obj
        request.api_key = api_key

        # 7. Process request
        response = self.get_response(request)

        # 8. Flush any pending usage updates
        self._flush_usage_updates(key_obj)

        return response

    def _is_public_path(self, path):
        """Check if the path is in the public whitelist."""
        return any(path.startswith(p) for p in PUBLIC_PATHS)

    def _validate_api_key(self, raw_key):
        """
        Validate API key using direct hashed-key database lookup.

        Returns:
            UserAPIKey object or None if invalid.
        """
        raw_key = raw_key.strip()
        # Compute hash (must match model's hashing method)
        hashed = hashlib.sha256(raw_key.encode()).hexdigest()

        # Check cache first
        cache_key = f"api_key_lookup_{hashed}"
        cached_key_id = cache.get(cache_key)

        if cached_key_id:
            try:
                return UserAPIKey.objects.select_related('user').get(
                    id=cached_key_id,
                    is_active=True
                )
            except UserAPIKey.DoesNotExist:
                cache.delete(cache_key)
                return None

        # Direct DB query
        try:
            key_obj = UserAPIKey.objects.select_related('user').get(
                hashed_key=hashed,
                is_active=True
            )
            # Cache positive result for 5 minutes
            cache.set(cache_key, key_obj.id, timeout=300)
            return key_obj
        except UserAPIKey.DoesNotExist:
            # Negative caching not needed due to rate limiting
            return None

    def _update_last_used_async(self, key_obj):
        """Store last_used update in cache to be flushed later."""
        # Store in a per-request cache (will be flushed in _flush_usage_updates)
        update_key = f"pending_last_used_{key_obj.id}"
        cache.set(update_key, timezone.now(), timeout=60)

    def _flush_usage_updates(self, key_obj):
        """Flush pending last_used updates to the database."""
        try:
            update_key = f"pending_last_used_{key_obj.id}"
            timestamp = cache.get(update_key)
            if timestamp:
                # Update database only if it's been more than 5 minutes since last update
                last_update_key = f"last_used_update_time_{key_obj.id}"
                last_update = cache.get(last_update_key)
                now = timezone.now()

                if not last_update or (now - last_update).total_seconds() > 300:
                    UserAPIKey.objects.filter(pk=key_obj.pk).update(last_used=timestamp)
                    cache.set(last_update_key, now, timeout=300)

                # Clear the pending update
                cache.delete(update_key)
        except Exception as e:
            logger.warning(f"Could not flush last_used update: {e}")


# ============================================================================
# DEPRECATION MIDDLEWARE
# ============================================================================

class DeprecationMiddleware:
    """Adds deprecation headers to legacy endpoints."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if any(request.path.startswith(path) for path in DEPRECATED_PATHS):
            response['Deprecation'] = 'true'
            response['Sunset'] = 'Fri, 31 Dec 2027 23:59:59 GMT'
            response['Link'] = '</api/v1/stock-analysis/>; rel="successor-version"'
            response['Warning'] = '299 - "This endpoint is deprecated. Please use /api/v1/stock-analysis/ instead."'

        return response


# ============================================================================
# RATE LIMIT HEADERS MIDDLEWARE
# ============================================================================

class RateLimitHeadersMiddleware:
    """
    Add rate limit headers to all responses.
    Informs clients about their current rate limit usage.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # API key based rate limit
        if hasattr(request, 'api_key_obj') and request.api_key_obj:
            try:
                rates = api_settings.DEFAULT_THROTTLE_RATES
                limit = int(rates.get('apikey', '200').split('/')[0])
                cache_key = f"rate_limit_{request.api_key_obj.id}"
                usage = cache.get(cache_key, {'count': 0, 'reset_at': 0})
                remaining = max(0, limit - usage.get('count', 0))
                reset_at = usage.get('reset_at', int(time.time() + 60))

                response['X-RateLimit-Limit'] = str(limit)
                response['X-RateLimit-Remaining'] = str(remaining)
                response['X-RateLimit-Reset'] = str(reset_at)

                if remaining == 0:
                    retry_after = max(0, reset_at - int(time.time()))
                    response['Retry-After'] = str(retry_after)

            except Exception as e:
                logger.warning(f"Could not add API key rate limit headers: {e}")

        # Anonymous user (IP-based) rate limit
        elif not request.user.is_authenticated:
            try:
                ip = request.META.get('REMOTE_ADDR', 'Unknown')
                rates = api_settings.DEFAULT_THROTTLE_RATES
                limit = int(rates.get('anon', '100').split('/')[0])
                cache_key = f"rate_limit_anon_{ip}"
                usage = cache.get(cache_key, {'count': 0, 'reset_at': 0})
                remaining = max(0, limit - usage.get('count', 0))
                reset_at = usage.get('reset_at', int(time.time() + 3600))

                response['X-RateLimit-Limit'] = str(limit)
                response['X-RateLimit-Remaining'] = str(remaining)
                response['X-RateLimit-Reset'] = str(reset_at)

            except Exception as e:
                logger.warning(f"Could not add anonymous rate limit headers: {e}")

        return response


# ============================================================================
# REQUEST LOGGING MIDDLEWARE
# ============================================================================

class RequestLoggingMiddleware:
    """
    Logs all requests and tracks:
    - Request timing
    - Request IDs
    - User information (if available)
    - API key usage (last_used – already handled by APIKeyMiddleware)
    - Symbol usage (for analytics)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self._process_request(request)
        response = self.get_response(request)
        self._process_response(request, response)
        return response

    def _process_request(self, request):
        """Generate request ID and store start time."""
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        request.request_id = request_id
        request._start_time = time.time()

        # Build log context
        request.log_extra = {
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'ip': request.META.get('REMOTE_ADDR', 'Unknown'),
            'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
        }

        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            request.log_extra['user_id'] = request.user.id
            request.log_extra['username'] = getattr(request.user, 'username', 'Unknown')

        if hasattr(request, 'api_key_obj') and request.api_key_obj:
            request.log_extra['api_key_id'] = request.api_key_obj.id
            request.log_extra['api_key_name'] = request.api_key_obj.name

    def _process_response(self, request, response):
        """Log request completion and track usage."""
        # ---- 1. Logging ----
        duration = time.time() - getattr(request, '_start_time', time.time())
        log_data = {
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'request_id': getattr(request, 'request_id', None),
            'ip': request.META.get('REMOTE_ADDR', 'Unknown'),
        }

        user = getattr(request, 'user', None)
        if user and hasattr(user, 'is_authenticated') and user.is_authenticated:
            log_data['user_id'] = getattr(user, 'id', None)
            log_data['username'] = getattr(user, 'username', 'Unknown')

        if hasattr(request, 'api_key_obj') and request.api_key_obj:
            log_data['api_key_id'] = request.api_key_obj.id
            log_data['api_key_name'] = request.api_key_obj.name

        if response.status_code >= 500:
            logger.error(f"Request failed: {log_data}")
        elif response.status_code >= 400:
            logger.warning(f"Request error: {log_data}")
        else:
            logger.info(f"Request completed: {log_data}")

        # Add request ID to response
        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = request.request_id

        # ---- 2. Symbol Tracking (for analytics) ----
        if 'symbol' in request.GET:
            self._track_symbol_usage(request, request.GET['symbol'])

        return response

    def _track_symbol_usage(self, request, symbol):
        """Track symbol usage for analytics (authenticated users only)."""
        try:
            from .models import SymbolUsage

            symbol = symbol.upper()
            user = getattr(request, 'user', None)

            if user and hasattr(user, 'is_authenticated') and user.is_authenticated:
                from django.db import transaction
                with transaction.atomic():
                    usage, created = SymbolUsage.objects.get_or_create(
                        user=user,
                        symbol=symbol,
                        defaults={'count': 0}
                    )
                    usage.count += 1
                    usage.save(update_fields=['count', 'last_updated'])
            else:
                # Anonymous usage – cache only
                cache_key = f"symbol_usage_anon_{symbol}"
                count = cache.get(cache_key, 0) + 1
                cache.set(cache_key, count, timeout=86400 * 7)

        except ImportError:
            # SymbolUsage model not available – skip silently
            pass
        except Exception as e:
            logger.warning(f"Could not track symbol usage: {e}")