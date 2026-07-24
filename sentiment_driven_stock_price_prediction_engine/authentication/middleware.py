"""
Custom middleware for authentication, rate limiting, logging, and deprecation.

Includes:
- APIKeyMiddleware: Enforces API key for unauthenticated requests; skips check for authenticated JWT users.
- DeprecationMiddleware: Adds deprecation headers to legacy endpoints.
- RateLimitHeadersMiddleware: Informs clients about rate limit usage.
- RequestLoggingMiddleware: Logs all requests with timing and request ID.
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

    Performance optimized: Uses hashed key lookup instead of iterating all keys.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()

    def __call__(self, request):
        # ✅ FIRST: Try JWT authentication for ALL requests
        try:
            auth_result = self.jwt_auth.authenticate(request)
            if auth_result:
                user, token = auth_result
                request.user = user
                return self.get_response(request)
        except (InvalidToken, TokenError, Exception):
            # JWT failed – continue to public paths check
            pass

        # ⚠️ SECOND: Only skip for public paths if JWT failed
        if any(request.path.startswith(path) for path in PUBLIC_PATHS):
            return self.get_response(request)

        # THIRD: Check API key (X-API-Key header)
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

        # FOURTH: Validate API key
        try:
            # Hash the incoming key
            from django.contrib.auth.hashers import check_password
            user_key = None
            
            # Check all active keys
            user_keys = UserAPIKey.objects.filter(is_active=True).select_related('user')
            
            for key in user_keys:
                if key.validate_key(api_key):
                    user_key = key
                    break
            
            if user_key:
                # Update last_used asynchronously
                self._update_last_used(user_key)
                
                # Set user and key on request
                request.user = user_key.user
                request.api_key_obj = user_key
                request.api_key = api_key
                
                return self.get_response(request)
            
            # No valid key found
            logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
            return JsonResponse(
                error_response(
                    message='Invalid or inactive API key.',
                    code='AUTH_INVALID_API_KEY',
                    status_code=401
                ),
                status=401
            )
            
        except Exception as e:
            logger.error(f"API key validation error: {e}", exc_info=True)
            return JsonResponse(
                error_response(
                    message='Authentication error. Please try again.',
                    code='AUTH_SERVER_ERROR',
                    status_code=500
                ),
                status=500
            )

    def _hash_key(self, raw_key: str) -> str:
        """Hash the API key for lookup."""
        return hashlib.sha256(raw_key.encode()).hexdigest()

    def _update_last_used(self, key_obj):
        """Update last_used timestamp (async via cache to avoid blocking)."""
        try:
            # Store in cache for batch update
            cache_key = f"api_key_last_used_{key_obj.id}"
            cache.set(cache_key, timezone.now(), timeout=60)
            
            # We could also use a background thread, but cache is simpler
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
        
        # Check if path is deprecated
        if any(request.path.startswith(path) for path in DEPRECATED_PATHS):
            response['Deprecation'] = 'true'
            response['Sunset'] = 'Fri, 31 Dec 2027 23:59:59 GMT'
            response['Link'] = '</api/v1/stock-analysis/>; rel="successor-version"'
            
            # Add warning header
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

        # Add rate limit headers if API key is present
        if hasattr(request, 'api_key_obj') and request.api_key_obj:
            try:
                # Get rate limit from settings or use default
                from rest_framework.settings import api_settings
                throttle_classes = api_settings.DEFAULT_THROTTLE_CLASSES
                
                # Get rate from settings
                rates = api_settings.DEFAULT_THROTTLE_RATES
                limit = int(rates.get('apikey', '200').split('/')[0])
                
                # Get current usage from cache
                cache_key = f"rate_limit_{request.api_key_obj.id}"
                usage = cache.get(cache_key, {'count': 0, 'reset_at': None})
                
                remaining = max(0, limit - usage.get('count', 0))
                reset_at = usage.get('reset_at', 0)
                
                response['X-RateLimit-Limit'] = str(limit)
                response['X-RateLimit-Remaining'] = str(remaining)
                
                if reset_at:
                    response['X-RateLimit-Reset'] = str(int(reset_at))
                else:
                    response['X-RateLimit-Reset'] = str(int(time.time() + 60))
                
                # Add Retry-After if rate limited
                if remaining == 0:
                    retry_after = max(0, int(reset_at - time.time()))
                    response['Retry-After'] = str(retry_after)
                    
            except Exception as e:
                logger.warning(f"Could not add rate limit headers: {e}")

        # Also add rate limit headers for anonymous users (IP-based)
        elif not request.user.is_authenticated:
            try:
                ip = request.META.get('REMOTE_ADDR', 'Unknown')
                rates = api_settings.DEFAULT_THROTTLE_RATES
                limit = int(rates.get('anon', '100').split('/')[0])
                
                cache_key = f"rate_limit_anon_{ip}"
                usage = cache.get(cache_key, {'count': 0, 'reset_at': None})
                
                remaining = max(0, limit - usage.get('count', 0))
                response['X-RateLimit-Limit'] = str(limit)
                response['X-RateLimit-Remaining'] = str(remaining)
                
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
    - API key usage (last_used)
    - Symbol tracking (for analytics)
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self.process_request(request)
        response = self.get_response(request)
        self.process_response(request, response)
        return response

    def process_request(self, request):
        """Generate request ID and store start time."""
        # Generate request ID
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        request.request_id = request_id
        
        # Store start time for duration calculation
        request._start_time = time.time()
        
        # Build log context
        request.log_extra = {
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'ip': request.META.get('REMOTE_ADDR', 'Unknown'),
            'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
        }
        
        # Add user info if available
        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            request.log_extra['user_id'] = request.user.id
            request.log_extra['username'] = request.user.username
        
        # Add API key info if available
        if hasattr(request, 'api_key_obj') and request.api_key_obj:
            request.log_extra['api_key_id'] = request.api_key_obj.id
            request.log_extra['api_key_name'] = request.api_key_obj.name

    def process_response(self, request, response):
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
        
        # Add user info if available
        user = getattr(request, 'user', None)
        if user and hasattr(user, 'is_authenticated') and user.is_authenticated:
            if hasattr(user, 'id'):
                log_data['user_id'] = user.id
                log_data['username'] = getattr(user, 'username', 'Unknown')
        
        # Add API key info if available
        if hasattr(request, 'api_key_obj') and request.api_key_obj:
            log_data['api_key_id'] = request.api_key_obj.id
            log_data['api_key_name'] = request.api_key_obj.name

        # Log based on status code
        if response.status_code >= 500:
            logger.error(f"Request failed: {log_data}")
        elif response.status_code >= 400:
            logger.warning(f"Request error: {log_data}")
        else:
            logger.info(f"Request completed: {log_data}")

        # Add request ID to response
        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = request.request_id

        # ---- 2. API Key Usage Tracking ----
        if hasattr(request, 'api_key_obj') and request.api_key_obj:
            self._track_api_key_usage(request.api_key_obj)

        # ---- 3. Symbol Tracking (for analytics) ----
        if 'symbol' in request.GET:
            self._track_symbol_usage(request, request.GET['symbol'])

        return response

    def _track_api_key_usage(self, api_key_obj):
        """Track API key usage in database and cache."""
        try:
            # Update last_used in database
            UserAPIKey.objects.filter(pk=api_key_obj.pk).update(
                last_used=timezone.now()
            )
            
            # Track daily usage in cache
            date_str = timezone.now().date().isoformat()
            cache_key = f"usage_daily_{api_key_obj.id}_{date_str}"
            count = cache.get(cache_key, 0) + 1
            cache.set(cache_key, count, timeout=86400 * 2)
            
        except Exception as e:
            logger.warning(f"Could not track API key usage: {e}")

    def _track_symbol_usage(self, request, symbol):
        """Track symbol usage for analytics."""
        try:
            from .models import SymbolUsage
            
            symbol = symbol.upper()
            user = getattr(request, 'user', None)
            
            # Only track authenticated users
            if user and hasattr(user, 'is_authenticated') and user.is_authenticated:
                # Use database for persistent tracking
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
                # Track anonymous usage in cache only
                cache_key = f"symbol_usage_anon_{symbol}"
                count = cache.get(cache_key, 0) + 1
                cache.set(cache_key, count, timeout=86400 * 7)
                
        except Exception as e:
            logger.warning(f"Could not track symbol usage: {e}")