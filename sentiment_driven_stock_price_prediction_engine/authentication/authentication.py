"""
DRF Authentication classes for Tickflow Sentiment.

Supports:
- JWT Authentication (primary) via DRF Simple JWT
- API Key Authentication (fallback) via hashed UserAPIKey model
- Both X-API-Key header and Authorization: Bearer <api_key> support

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
from .utils import error_response

logger = logging.getLogger(__name__)
User = get_user_model()


# ============================================================================
# API KEY AUTHENTICATION
# ============================================================================

class APIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authenticate requests using an API key sent in the `X-API-Key` header
    or `Authorization: Bearer <api_key>`.
    
    Supports the new hashed UserAPIKey model. Legacy APIKey model is NOT supported.
    
    Performance optimized: Uses direct database lookup with hashed keys.
    """
    
    # Rate limiting for authentication attempts
    AUTH_ATTEMPT_LIMIT = 10
    AUTH_ATTEMPT_WINDOW = 60  # 60 seconds
    
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
            logger.warning(f"API key authentication rate limit exceeded for {api_key[:8]}...")
            raise exceptions.AuthenticationFailed(
                'Too many authentication attempts. Please try again later.'
            )
        
        # 3. Validate API key using hashed lookup
        try:
            key_obj = self._validate_api_key(api_key)
            if not key_obj:
                # Log failed attempt
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
            
            # 4. Update last_used timestamp (async via cache)
            self._update_last_used_async(key_obj)
            
            # 5. Log successful authentication
            self._log_auth_attempt(key_obj.user, api_key, success=True)
            
            # 6. Set the user and API key on the request
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
        """
        Return the WWW-Authenticate header value for 401 responses.
        """
        return 'Bearer realm="api"'

    def _extract_api_key(self, request):
        """
        Extract API key from request headers.
        
        Supports:
        - X-API-Key header
        - Authorization: Bearer <api_key>
        """
        # Check X-API-Key header
        api_key = request.headers.get('X-API-Key')
        if api_key:
            return api_key
        
        # Check Authorization header (Bearer token)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            # Extract token after 'Bearer '
            token = auth_header[7:].strip()
            # Check if token is an API key (starts with 'ts_')
            if token.startswith('ts_'):
                return token
        
        # Check query parameter (for debugging/testing - remove in production)
        # api_key = request.GET.get('api_key')
        # if api_key:
        #     return api_key
        
        return None

    def _validate_api_key(self, raw_key):
        """
        Validate an API key against stored hashed keys.
        
        Args:
            raw_key: The raw API key string
            
        Returns:
            UserAPIKey object if valid, None otherwise
        """
        # Get all active keys
        # Performance optimization: Use a cache for active keys
        cache_key = f"api_key_lookup_{hashlib.sha256(raw_key.encode()).hexdigest()}"
        cached_key_id = cache.get(cache_key)
        
        if cached_key_id:
            try:
                return UserAPIKey.objects.get(id=cached_key_id, is_active=True)
            except UserAPIKey.DoesNotExist:
                cache.delete(cache_key)
                return None
        
        # Direct lookup - iterate through active keys and validate
        # This is a performance trade-off vs iterating all keys
        # For production with many keys, consider a different approach
        active_keys = UserAPIKey.objects.filter(is_active=True).select_related('user')
        
        for key_obj in active_keys:
            if key_obj.validate_key(raw_key):
                # Cache the result for 5 minutes
                cache.set(cache_key, key_obj.id, timeout=300)
                return key_obj
        
        return None

    def _check_rate_limit(self, request, api_key):
        """
        Check rate limit for authentication attempts.
        
        Returns:
            bool: True if under limit, False if exceeded
        """
        try:
            # Use a combination of IP and API key prefix for rate limiting
            ip = request.META.get('REMOTE_ADDR', 'Unknown')
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
            return True  # Fail open if rate limiting fails

    def _update_last_used_async(self, key_obj):
        """
        Update last_used timestamp asynchronously (via cache for batch update).
        """
        try:
            # Update in database directly if not too frequent
            # Use cache to prevent excessive database updates
            cache_key = f"last_used_update_{key_obj.id}"
            last_update = cache.get(cache_key)
            
            if not last_update:
                # Update every 5 minutes at most
                UserAPIKey.objects.filter(pk=key_obj.pk).update(
                    last_used=timezone.now()
                )
                cache.set(cache_key, True, timeout=300)  # 5 minutes
                
        except Exception as e:
            logger.warning(f"Could not update last_used: {e}")

    def _log_auth_attempt(self, user, api_key, success=True, reason=None):
        """
        Log authentication attempt for audit purposes.
        """
        try:
            from .models import AuditLog
            
            action = 'API_KEY_AUTH_SUCCESS' if success else 'API_KEY_AUTH_FAILED'
            details = {
                'api_key_prefix': api_key[:8] if api_key else 'unknown',
                'success': success,
                'timestamp': timezone.now().isoformat(),
            }
            if reason:
                details['reason'] = reason
            
            # Create audit log entry
            if user:
                AuditLog.objects.create(
                    user=user,
                    action=action,
                    details=details
                )
            else:
                # For failed attempts without a user, log without user
                logger.warning(f"API key auth failed: {details}")
                
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
        Authenticate using JWT with additional checks.
        """
        try:
            # Get authentication header
            auth_header = request.headers.get('Authorization', '')
            if not auth_header:
                return None
            
            # Validate header format
            if not auth_header.startswith('Bearer '):
                return None
            
            # Try to authenticate with parent class
            try:
                result = super().authenticate(request)
                if result:
                    user, token = result
                    
                    # Additional validation: Check if user is active
                    if not user.is_active:
                        raise InvalidToken('User account is deactivated')
                    
                    # Check if user has been deleted (soft delete check)
                    if hasattr(user, 'deletion_requested_at') and user.deletion_requested_at:
                        raise InvalidToken('User account is scheduled for deletion')
                    
                    # Log successful JWT authentication
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
    
    This is the primary authentication class for the API.
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
        # Try JWT authentication first
        try:
            result = self.jwt_auth.authenticate(request)
            if result:
                return result
        except exceptions.AuthenticationFailed:
            # JWT failed, try API key
            pass
        except Exception as e:
            logger.error(f"JWT authentication error: {e}", exc_info=True)
            # Continue to API key
        
        # Try API key authentication
        try:
            result = self.api_key_auth.authenticate(request)
            if result:
                return result
        except exceptions.AuthenticationFailed:
            raise
        except Exception as e:
            logger.error(f"API key authentication error: {e}", exc_info=True)
            raise exceptions.AuthenticationFailed('Authentication error. Please try again.')
        
        # No authentication credentials provided
        return None
    
    def authenticate_header(self, request):
        """
        Return the WWW-Authenticate header value.
        """
        return 'Bearer realm="api", X-API-Key'