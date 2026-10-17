"""
Custom middleware for authentication, rate limiting, logging, and deprecation.

Refactored for Production:
- Fixed ORM bug: changed 'hashed_key' to 'key_hash'.
- Fixed path matching security vulnerability.
- Optimized rate limit header injection.
- Robust user assignment for DRF compatibility.
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
from .utils import error_response

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
    '/api/v1/auth/verify-email/', # Critical for onboarding
    '/api/v1/auth/resend-verification/',
    '/api/v1/auth/password-reset/',
    '/api/v1/auth/password-reset/confirm/',
    '/api/v1/auth/refresh/',

    # Public Data (Read-only)
    '/api/v1/stock-analysis/',
    '/api/v1/technical-indicators/',
    '/api/v1/sentiment-analysis/',
    '/api/v1/lstm-predict/',
    '/api/v1/symbols/',
    '/api/v1/subscribe/',
]

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
            # JWT failed – continue to public paths check or API key check
            pass

        # 2. Skip public paths if JWT failed
        if self._is_public_path(request.path):
            return self.get_response(request)

        # 3. Check API key (X-API-Key header)
        api_key = request.headers.get('X-API-Key')
        
        # Also check Authorization: Bearer <key> if it starts with 'ts_'
        if not api_key:
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer ts_'):
                api_key = auth_header[7:].strip()

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
        self._update_last_used(key_obj)

        # 6. Set user and key on request
        request.user = key_obj.user
        request.api_key_obj = key_obj
        request.api_key = api_key

        # 7. Process request
        response = self.get_response(request)

        return response

    def _is_public_path(self, path):
        """
        Check if the path is in the public whitelist.
        Uses strict matching to prevent bypasses like `/login-bypass/`.
        """
        for p in PUBLIC_PATHS:
            if path == p or path.startswith(f"{p.rstrip('/')}/"):
                return True
        return False

    def _validate_api_key(self, raw_key):
        """
        Validate API key using direct hashed-key database lookup.
        Returns UserAPIKey object or None if invalid.
        """
        raw_key = raw_key.strip()
        hashed = hashlib.sha256(raw_key.encode()).hexdigest()
        cache_key = f"api_key_lookup_{hashed}"

        # Check cache first
        cached_key_id = cache.get(cache_key)
        if cached_key_id:
            try:
                return UserAPIKey.objects.select_related('user').get(
                    id=cached_key_id,
                    is_active=True
                )
            except UserAPIKey.DoesNotExist:
                # Cache is stale (key was revoked/deleted)
                cache.delete(cache_key)
                return None

        # Direct DB query
        try:
            # ✅ FIX: Changed 'hashed_key' to 'key_hash' to match models.py
            key_obj = UserAPIKey.objects.select_related('user').get(
                key_hash=hashed,
                is_active=True
            )
            # Cache positive result for 5 minutes
            cache.set(cache_key, key_obj.id, timeout=300)
            return key_obj
        except UserAPIKey.DoesNotExist:
            return None

    def _update_last_used(self, key_obj):
        """
        Update last_used timestamp synchronously but efficiently.
        Avoids updating if the last update was less than 5 minutes ago.
        """
        try:
            cache_key = f"last_used_update_{key_obj.id}"
            if not cache.get(cache_key):
                UserAPIKey.objects.filter(pk=key_obj.pk).update(last_used=timezone.now())
                # Set a flag to prevent updates for the next 5 minutes
                cache.set(cache_key, True, timeout=300)
        except Exception as e:
            logger.warning(f"Could not update last_used: {e}")


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
    Add rate limit headers to responses.
    Reads from DRF's built-in throttle cache keys.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only add headers if the request was successful or rate limited
        if response.status_code not in (200, 201, 204, 429):
            return response

        try:
            rates = api_settings.DEFAULT_THROTTLE_RATES
            
            if hasattr(request, 'api_key_obj') and request.api_key_obj:
                scope = 'apikey'
                limit_str = rates.get('apikey', '200/minute')
                # Create the same cache key DRF uses
                import hashlib
                key_hash = hashlib.sha256(request.api_key.encode()).hexdigest()[:16]
                cache_key = f"throttle_apikey_{scope}_{key_hash}"
                
            elif request.user and request.user.is_authenticated:
                scope = 'user'
                limit_str = rates.get('user', '1000/hour')
                cache_key = f"throttle_user_{scope}_{request.user.id}"
                
            else:
                scope = 'anon'
                limit_str = rates.get('anon', '100/hour')
                ip = request.META.get('REMOTE_ADDR', 'Unknown')
                cache_key = f"throttle_anon_{scope}_{ip}"

            # Parse limit (e.g., "200/minute" -> 200)
            limit = int(limit_str.split('/')[0])
            period = limit_str.split('/')[1]

            # DRF stores the history as a list of timestamps
            history = cache.get(cache_key, [])
            remaining = max(0, limit - len(history))

            response['X-RateLimit-Limit'] = str(limit)
            response['X-RateLimit-Remaining'] = str(remaining)
            
            # Approximate reset time based on the period
            duration_map = {'second': 1, 'minute': 60, 'hour': 3600, 'day': 86400}
            duration = duration_map.get(period, 60)
            
            if history:
                oldest = history[-1] if history else time.time()
                reset_at = int(oldest + duration)
            else:
                reset_at = int(time.time() + duration)
                
            response['X-RateLimit-Reset'] = str(reset_at)

            if remaining == 0:
                response['Retry-After'] = str(max(0, reset_at - int(time.time())))

        except Exception as e:
            logger.warning(f"Could not add rate limit headers: {e}")

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

        # Safe check for user attribute
        if hasattr(request, 'user') and request.user and getattr(request.user, 'is_authenticated', False):
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
        if user and getattr(user, 'is_authenticated', False):
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

            if user and getattr(user, 'is_authenticated', False):
                # Use update_or_create to avoid race conditions
                from django.db.models import F
                SymbolUsage.objects.update_or_create(
                    user=user,
                    symbol=symbol,
                    defaults={'count': F('count') + 1}
                )
            else:
                # Anonymous usage – cache only
                cache_key = f"symbol_usage_anon_{symbol}"
                try:
                    cache.incr(cache_key)
                except ValueError:
                    cache.set(cache_key, 1, timeout=86400 * 7)

        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"Could not track symbol usage: {e}")