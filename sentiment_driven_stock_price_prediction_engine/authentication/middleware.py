"""
Custom middleware for authentication, rate limiting, logging, and deprecation.

Includes:
- APIKeyMiddleware: Enforces API key for unauthenticated requests; skips check for authenticated JWT users.
- DeprecationMiddleware: Adds deprecation headers to legacy endpoints.
- RateLimitHeadersMiddleware: Informs clients about rate limit usage.
- RequestLoggingMiddleware: Logs all requests with timing and request ID, plus tracks API key usage & symbol requests.
"""

import time
import uuid
import logging
import os
from django.http import JsonResponse
from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import APIKey, UserAPIKey

logger = logging.getLogger(__name__)


class APIKeyMiddleware:
    """
    Enforces API key authentication for all non‑exempt endpoints,
    but skips the check if the user is already authenticated via JWT.

    Supports both legacy APIKey model and new UserAPIKey model (Phase 2).
    """
    EXEMPT_PATHS = [
        # ----- Admin & Monitoring -----
        '/admin/',
        '/health/',
        '/api/v1/health/',
        '/sentry-debug/',
        
        # ----- API Documentation -----
        '/api/docs/',
        '/api/schema/',
        
        # ----- Authentication (Public) -----
        '/api/v1/auth/register/',
        '/api/v1/auth/login/',
        '/api/v1/auth/verify-email/',
        '/api/v1/auth/resend-verification/',
        '/api/v1/auth/password-reset/',
        '/api/v1/auth/password-reset/confirm/',
        '/api/v1/auth/refresh/',
        
        # ----- Newsletter (Optional – can be public) -----
        '/api/v1/subscribe/',
        
        # ----- Stock Analysis (Public – No Auth Required) -----
        '/api/v1/stock-analysis/',
        '/api/v1/technical-indicators/',
        '/api/v1/sentiment-analysis/',
        '/api/v1/lstm-predict/',
        '/api/v1/symbols/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()

    def __call__(self, request):
        # 1. Skip authentication for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return self.get_response(request)

        # 2. Try JWT authentication
        try:
            auth_result = self.jwt_auth.authenticate(request)
            if auth_result:
                user, token = auth_result
                request.user = user  # set the authenticated user
                return self.get_response(request)  # skip API key check
        except (InvalidToken, TokenError, Exception) as e:
            # Token invalid or missing – continue to API key check
            pass

        # 3. Check API key (X-API-Key header)
        api_key = request.headers.get('X-API-Key')

        # Static API key fallback
        static_key = os.environ.get('STATIC_API_KEY')
        if static_key and api_key == static_key:
            request.api_key = api_key
            return self.get_response(request)

        # Check UserAPIKey (user‑owned keys)
        if api_key:
            user_keys = UserAPIKey.objects.filter(is_active=True)
            for user_key in user_keys:
                if user_key.validate_key(api_key):
                    request.user = user_key.user
                    request.api_key_obj = user_key
                    request.api_key = api_key
                    return self.get_response(request)

        # Fallback to legacy APIKey model
        legacy_key = APIKey.objects.filter(key=api_key, is_active=True).first()
        if legacy_key and (not legacy_key.expires_at or legacy_key.expires_at > timezone.now()):
            request.api_key = api_key
            return self.get_response(request)

        # No valid authentication found
        return JsonResponse(
            {'error': 'Valid X-API-Key header required.'},
            status=401
        )


class DeprecationMiddleware:
    """Adds deprecation headers to legacy endpoints."""
    DEPRECATED_PATHS = [
        '/api/stock-opinion/',
        '/api/news/analyzed/',  # legacy alias
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if any(request.path.startswith(path) for path in self.DEPRECATED_PATHS):
            response['Deprecation'] = 'true'
            response['Sunset'] = 'Fri, 31 Dec 2027 23:59:59 GMT'
        return response


class RateLimitHeadersMiddleware:
    """
    Add rate limit headers to all responses.
    Informs clients about their current rate limit usage.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Add rate limit headers if API key is present
        if hasattr(request, 'api_key'):
            try:
                # Try to get from UserAPIKey first
                if hasattr(request, 'api_key_obj') and request.api_key_obj:
                    limit = 200
                    cache_key = f"rate_limit_{request.api_key_obj.id}"
                else:
                    # Fallback to legacy
                    api_key_obj = APIKey.objects.get(key=request.api_key)
                    limit = 200
                    cache_key = f"rate_limit_{request.api_key}"

                usage = cache.get(cache_key, {'count': 0, 'reset': None})
                remaining = max(0, limit - usage.get('count', 0))
                response['X-RateLimit-Limit'] = str(limit)
                response['X-RateLimit-Remaining'] = str(remaining)
                response['X-RateLimit-Reset'] = '60'

            except (APIKey.DoesNotExist, UserAPIKey.DoesNotExist):
                pass

        return response


# ============================================================================
# Request Logging Middleware (with Usage Tracking)
# ============================================================================

class RequestLoggingMiddleware:
    """
    Logs all requests and tracks:
    - API key usage (last_used + daily counters)
    - Symbol requests (per user / per key)
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self.process_request(request)
        response = self.get_response(request)
        self.process_response(request, response)
        return response

    def process_request(self, request):
        # Generate request ID
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        request.request_id = request_id
        request.log_extra = {
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
        }
        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            request.log_extra['user_id'] = request.user.id
            request.log_extra['username'] = request.user.username
        request._start_time = time.time()

    def process_response(self, request, response):
        # ---- 1. Logging ----
        duration = time.time() - getattr(request, '_start_time', time.time())
        log_data = {
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'request_id': getattr(request, 'request_id', None),
        }
        
        # ✅ SAFE user ID extraction
        user = getattr(request, 'user', None)
        if user and hasattr(user, 'is_authenticated') and user.is_authenticated:
            if hasattr(user, 'id'):
                log_data['user_id'] = user.id
                log_data['username'] = getattr(user, 'username', 'Unknown')

        if response.status_code >= 500:
            logger.error(f"Request failed: {log_data}")
        elif response.status_code >= 400:
            logger.warning(f"Request error: {log_data}")
        else:
            logger.info(f"Request completed: {log_data}")

        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = request.request_id

        # ---- 2. Usage Tracking (API key) ----
        if hasattr(request, 'api_key_obj') and request.api_key_obj:
            try:
                UserAPIKey.objects.filter(pk=request.api_key_obj.pk).update(
                    last_used=timezone.now()
                )
                date_str = timezone.now().date().isoformat()
                key_id = request.api_key_obj.pk
                cache_key = f"usage_daily_{key_id}_{date_str}"
                count = cache.get(cache_key, 0) + 1
                cache.set(cache_key, count, timeout=86400 * 2)
            except Exception as e:
                logger.warning(f"Could not track API key usage: {e}")

        # ---- 3. Symbol Tracking ----
        if 'symbol' in request.GET:
            symbol = request.GET['symbol'].upper()
            try:
                # ✅ SAFE: Only track if user is authenticated and has id
                if user and hasattr(user, 'is_authenticated') and user.is_authenticated:
                    if hasattr(user, 'id'):
                        cache_key = f"symbol_usage_{user.id}_{symbol}"
                    else:
                        cache_key = f"symbol_usage_anon_{symbol}"
                else:
                    cache_key = f"symbol_usage_anon_{symbol}"
                count = cache.get(cache_key, 0) + 1
                cache.set(cache_key, count, timeout=86400 * 7)
            except Exception as e:
                logger.warning(f"Could not track symbol usage: {e}")

        return response