"""
DRF Authentication classes for Tickflow Intelligence.

Supports:
- JWT Authentication (primary) via DRF Simple JWT
- API Key Authentication (fallback) via hashed UserAPIKey model
- Both X-API-Key header and Authorization: Bearer <api_key> support

Performance optimised:
- API key validation uses direct hashed-key database lookup (O(1))
- Caches valid keys for 5 minutes to reduce DB hits
- Rate limits authentication attempts per IP+key prefix

All authentication attempts are logged for audit purposes.
"""

import logging
import hashlib
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import authentication, exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import UserAPIKey

# drf-spectacular extension
try:
    from drf_spectacular.extensions import OpenApiAuthenticationExtension
except ImportError:
    OpenApiAuthenticationExtension = None  # graceful fallback if drf-spectacular not installed

logger = logging.getLogger(__name__)
User = get_user_model()


# ============================================================================
# API KEY AUTHENTICATION
# ============================================================================

class APIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authenticate requests using an API key sent in the `X-API-Key` header
    or `Authorization: Bearer <api_key>`.

    Supports the hashed UserAPIKey model. Uses direct hashed-key lookup
    for O(1) performance.

    Rate limiting: 10 attempts per minute per IP+key-prefix to prevent brute force.
    """

    # Rate limiting for authentication attempts
    AUTH_ATTEMPT_LIMIT = 10
    AUTH_ATTEMPT_WINDOW = 60  # seconds

    def authenticate(self, request):
        """
        Authenticate the request using API key.

        Returns:
            tuple: (user, None) on success
            None: if no API key provided (let other auth methods handle)
            AuthenticationFailed: if API key is invalid
        """
        # 1. Extract API key from headers
        api_key = self._extract_api_key(request)
        if not api_key:
            return None  # No API key provided

        # 2. Rate limit authentication attempts
        if not self._check_rate_limit(request, api_key):
            logger.warning(f"API key auth rate limit exceeded for {api_key[:8]}...")
            raise exceptions.AuthenticationFailed(
                'Too many authentication attempts. Please try again later.'
            )

        # 3. Validate API key using direct hashed lookup
        try:
            key_obj = self._validate_api_key(api_key)
            if not key_obj:
                self._log_auth_attempt(None, api_key, success=False)
                raise exceptions.AuthenticationFailed('Invalid API key')

            # Check if key is active
            if not key_obj.is_active:
                self._log_auth_attempt(key_obj.user, api_key, success=False, reason='inactive')
                raise exceptions.AuthenticationFailed('API key is deactivated')

            # Check if key has expired
            if key_obj.expires_at and key_obj.expires_at < timezone.now():
                self._log_auth_attempt(key_obj.user, api_key, success=False, reason='expired')
                raise exceptions.AuthenticationFailed('API key has expired')

            # 4. Update last_used timestamp asynchronously
            self._update_last_used_async(key_obj)

            # 5. Log successful authentication
            self._log_auth_attempt(key_obj.user, api_key, success=True)

            # 6. Attach key object to request for downstream use
            request.api_key_obj = key_obj
            request.api_key = api_key

            logger.info(f"API key authentication successful: {key_obj.user.username} - {key_obj.name}")
            return (key_obj.user, None)

        except UserAPIKey.DoesNotExist:
            self._log_auth_attempt(None, api_key, success=False, reason='not_found')
            raise exceptions.AuthenticationFailed('Invalid API key')

        except Exception as e:
            logger.error(f"API key authentication error: {e}", exc_info=True)
            raise exceptions.AuthenticationFailed('Authentication error. Please try again.')

    def authenticate_header(self, request):
        """Return the WWW-Authenticate header value for 401 responses."""
        return 'Bearer realm="api"'

    def _extract_api_key(self, request):
        """
        Extract API key from request headers.

        Supports:
        - X-API-Key header
        - Authorization: Bearer <api_key> (if token starts with 'ts_')
        """
        # 1. Check X-API-Key header
        api_key = request.headers.get('X-API-Key')
        if api_key:
            return api_key

        # 2. Check Authorization: Bearer header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
            # Only treat as API key if it starts with our prefix 'ts_'
            if token.startswith('ts_'):
                return token

        # 3. (Optional) Query parameter – disabled for production security
        # api_key = request.GET.get('api_key')
        # if api_key:
        #     return api_key

        return None

    def _validate_api_key(self, raw_key):
        """
        Validate an API key using direct hashed-key database lookup.

        This is O(1) and much faster than iterating all keys.

        Args:
            raw_key: The raw API key string (starts with 'ts_')

        Returns:
            UserAPIKey object if valid, None otherwise
        """
        # Compute SHA-256 hash of the raw key (same as model's hashing method)
        # Ensure we strip any whitespace
        raw_key = raw_key.strip()
        hashed = hashlib.sha256(raw_key.encode()).hexdigest()

        # Check cache first to avoid DB hit
        cache_key = f"api_key_lookup_{hashed}"
        cached_key_id = cache.get(cache_key)

        if cached_key_id:
            try:
                # Fetch from DB with select_related to get user in one query
                return UserAPIKey.objects.select_related('user').get(
                    id=cached_key_id,
                    is_active=True
                )
            except UserAPIKey.DoesNotExist:
                # Cache stale – delete it
                cache.delete(cache_key)
                return None

        # Direct database query using hashed key
        try:
            key_obj = UserAPIKey.objects.select_related('user').get(
                hashed_key=hashed,
                is_active=True
            )
            # Cache the result for 5 minutes (positive cache)
            cache.set(cache_key, key_obj.id, timeout=300)
            return key_obj
        except UserAPIKey.DoesNotExist:
            # Optionally cache negative results for a short time to prevent brute force
            # But we already have rate limiting, so we can skip negative caching
            return None

    def _check_rate_limit(self, request, api_key):
        """
        Check rate limit for authentication attempts.

        Uses a combination of client IP and key prefix to prevent brute force.

        Returns:
            bool: True if under limit, False if exceeded
        """
        try:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
            key_prefix = api_key[:8] if api_key else 'unknown'
            rate_key = f"auth_attempts_{ip}_{key_prefix}"

            attempts = cache.get(rate_key, 0)
            if attempts >= self.AUTH_ATTEMPT_LIMIT:
                return False

            # Increment attempts
            cache.set(rate_key, attempts + 1, timeout=self.AUTH_ATTEMPT_WINDOW)
            return True

        except Exception as e:
            logger.warning(f"Rate limit check failed: {e}")
            return True  # Fail open if cache is down

    def _update_last_used_async(self, key_obj):
        """
        Update last_used timestamp asynchronously (with cache to avoid frequent DB writes).

        Updates only once every 5 minutes per key.
        """
        try:
            cache_key = f"last_used_update_{key_obj.id}"
            last_update = cache.get(cache_key)

            if not last_update:
                # Update database
                UserAPIKey.objects.filter(pk=key_obj.pk).update(
                    last_used=timezone.now()
                )
                # Set a flag to prevent updates for the next 5 minutes
                cache.set(cache_key, True, timeout=300)

        except Exception as e:
            logger.warning(f"Could not update last_used: {e}")

    def _log_auth_attempt(self, user, api_key, success=True, reason=None):
        """
        Log authentication attempt for audit purposes.

        If AuditLog model exists, create a record; otherwise, fall back to logger.
        """
        try:
            # Attempt to import AuditLog dynamically to avoid import errors
            from .models import AuditLog

            action = 'API_KEY_AUTH_SUCCESS' if success else 'API_KEY_AUTH_FAILED'
            details = {
                'api_key_prefix': api_key[:8] if api_key else 'unknown',
                'success': success,
                'timestamp': timezone.now().isoformat(),
            }
            if reason:
                details['reason'] = reason

            if user:
                AuditLog.objects.create(
                    user=user,
                    action=action,
                    details=details
                )
            else:
                # For failed attempts without a user, log to logger
                logger.warning(f"API key auth failed: {details}")

        except (ImportError, AttributeError):
            # If AuditLog model doesn't exist, just log to logger
            log_level = logging.INFO if success else logging.WARNING
            log_msg = f"API key auth {'success' if success else 'failed'} for key {api_key[:8]}... user={user.username if user else 'anonymous'}"
            if reason:
                log_msg += f" reason={reason}"
            logger.log(log_level, log_msg)

        except Exception as e:
            logger.warning(f"Could not log auth attempt: {e}")


# ============================================================================
# CUSTOM JWT AUTHENTICATION (Enhanced)
# ============================================================================

class CustomJWTAuthentication(JWTAuthentication):
    """
    Enhanced JWT authentication with additional validation and logging.
    """

    def authenticate(self, request):
        """
        Authenticate using JWT with additional checks for user status.
        """
        try:
            # Check for Authorization header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header or not auth_header.startswith('Bearer '):
                return None

            # Delegate to parent authentication
            result = super().authenticate(request)
            if result:
                user, token = result

                # Additional validation: user must be active
                if not user.is_active:
                    raise InvalidToken('User account is deactivated')

                # Check for soft-deletion flag (if model has it)
                if hasattr(user, 'deletion_requested_at') and user.deletion_requested_at:
                    raise InvalidToken('User account is scheduled for deletion')

                logger.info(f"JWT authentication successful: {user.username} (ID: {user.id})")
                return result

            return None

        except InvalidToken as e:
            logger.warning(f"Invalid JWT token: {str(e)}")
            raise exceptions.AuthenticationFailed(str(e))

        except Exception as e:
            logger.error(f"JWT authentication error: {e}", exc_info=True)
            raise exceptions.AuthenticationFailed('Authentication error. Please try again.')


# ============================================================================
# COMBINED AUTHENTICATION (JWT + API Key)
# ============================================================================

class CombinedAuthentication(authentication.BaseAuthentication):
    """
    Combined authentication that tries JWT first, then API key.

    This is the primary authentication class for the API if you want a single
    class to handle both. Currently, DRF settings use separate classes,
    but this remains for flexibility.
    """

    def __init__(self):
        self.jwt_auth = CustomJWTAuthentication()
        self.api_key_auth = APIKeyAuthentication()

    def authenticate(self, request):
        """
        Try JWT authentication first, then API key authentication.

        Returns:
            tuple: (user, auth) on success
            None: if no authentication credentials provided
            AuthenticationFailed: if credentials are invalid
        """
        # Try JWT
        try:
            result = self.jwt_auth.authenticate(request)
            if result:
                return result
        except exceptions.AuthenticationFailed:
            # JWT failed, continue to API key
            pass
        except Exception as e:
            logger.error(f"JWT auth error: {e}", exc_info=True)
            # Continue to API key

        # Try API key
        try:
            result = self.api_key_auth.authenticate(request)
            if result:
                return result
        except exceptions.AuthenticationFailed:
            raise
        except Exception as e:
            logger.error(f"API key auth error: {e}", exc_info=True)
            raise exceptions.AuthenticationFailed('Authentication error. Please try again.')

        # No credentials provided
        return None

    def authenticate_header(self, request):
        """Return the WWW-Authenticate header value."""
        return 'Bearer realm="api", X-API-Key'
    
# ============================================================================
# DRF-SPECTACULAR OPENAPI AUTH EXTENSION
# ============================================================================

if OpenApiAuthenticationExtension is not None:
    class APIKeyAuthenticationScheme(OpenApiAuthenticationExtension):
        """
        OpenAPI schema extension for APIKeyAuthentication.
        """
        target_class = 'authentication.authentication.APIKeyAuthentication'
        name = 'APIKeyAuth'

        def get_security_definition(self, auto_schema):
            return {
                'type': 'apiKey',
                'in': 'header',
                'name': 'X-API-Key',
                'description': 'API key authentication',
            }