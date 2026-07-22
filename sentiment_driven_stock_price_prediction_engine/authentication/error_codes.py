"""
Error codes for Tickflow Sentiment API.

All error codes are grouped by category and include:
- Numeric code (unique identifier)
- User-friendly message (for clients)
- HTTP status code mapping (for responses)

Usage:
    from .error_codes import ErrorCodes
    
    return Response(
        error_response(
            message=ErrorCodes.get_message(ErrorCodes.INVALID_API_KEY),
            code=ErrorCodes.INVALID_API_KEY,
            status_code=ErrorCodes.get_http_status(ErrorCodes.INVALID_API_KEY)
        ),
        status=ErrorCodes.get_http_status(ErrorCodes.INVALID_API_KEY)
    )

Version: 1.0.0
"""

from typing import Dict, Tuple, Optional


class ErrorCodes:
    """
    Centralized error codes for the Tickflow Sentiment API.
    
    Categories:
    - Authentication: 1000-1999
    - Authorization: 2000-2999
    - User Management: 3000-3999
    - API Key: 4000-4999
    - Validation: 5000-5999
    - Rate Limiting: 6000-6999
    - Email: 7000-7999
    - Database: 8000-8999
    - External API: 9000-9999
    - System: 10000-10999
    """
    
    # ========================================================================
    # AUTHENTICATION ERRORS (1000-1999)
    # ========================================================================
    
    INVALID_API_KEY = 1001
    MISSING_API_KEY = 1002
    API_KEY_EXPIRED = 1003
    API_KEY_INACTIVE = 1004
    INVALID_CREDENTIALS = 1005
    EMAIL_NOT_VERIFIED = 1006
    ACCOUNT_DEACTIVATED = 1007
    ACCOUNT_LOCKED = 1008
    TOKEN_EXPIRED = 1009
    TOKEN_INVALID = 1010
    REFRESH_TOKEN_EXPIRED = 1011
    PASSWORD_RESET_TOKEN_INVALID = 1012
    VERIFICATION_CODE_INVALID = 1013
    VERIFICATION_CODE_EXPIRED = 1014
    AUTH_REQUIRED = 1015
    AUTH_FAILED = 1016
    
    # ========================================================================
    # AUTHORIZATION ERRORS (2000-2999)
    # ========================================================================
    
    PERMISSION_DENIED = 2001
    INSUFFICIENT_TIER = 2002
    ADMIN_REQUIRED = 2003
    
    # ========================================================================
    # USER MANAGEMENT ERRORS (3000-3999)
    # ========================================================================
    
    USERNAME_TAKEN = 3001
    EMAIL_TAKEN = 3002
    USER_NOT_FOUND = 3003
    USERNAME_CHANGE_LIMIT = 3004
    EMAIL_CHANGE_COOLDOWN = 3005
    USER_CREATION_FAILED = 3006
    USER_UPDATE_FAILED = 3007
    USER_DELETE_FAILED = 3008
    USER_ALREADY_VERIFIED = 3009
    USER_INACTIVE = 3010
    
    # ========================================================================
    # API KEY ERRORS (4000-4999)
    # ========================================================================
    
    API_KEY_LIMIT_EXCEEDED = 4001
    API_KEY_NAME_EXISTS = 4002
    API_KEY_NOT_FOUND = 4003
    API_KEY_REVOKE_FAILED = 4004
    API_KEY_CREATE_FAILED = 4005
    
    # ========================================================================
    # VALIDATION ERRORS (5000-5999)
    # ========================================================================
    
    MISSING_PARAMETER = 5001
    INVALID_PARAMETER = 5002
    INVALID_SYMBOL = 5003
    INVALID_EMAIL = 5004
    INVALID_PASSWORD = 5005
    MISSING_PASSWORD = 5006
    PASSWORD_MISMATCH = 5007
    INVALID_USERNAME = 5008
    INVALID_CODE = 5009
    MISSING_CODE = 5010
    INVALID_DATE = 5011
    INVALID_TIMEFRAME = 5012
    INVALID_AMOUNT = 5013
    INVALID_TIER = 5014
    
    # ========================================================================
    # RATE LIMITING ERRORS (6000-6999)
    # ========================================================================
    
    RATE_LIMIT_EXCEEDED = 6001
    IP_RATE_LIMIT_EXCEEDED = 6002
    USER_RATE_LIMIT_EXCEEDED = 6003
    API_KEY_RATE_LIMIT_EXCEEDED = 6004
    
    # ========================================================================
    # EMAIL ERRORS (7000-7999)
    # ========================================================================
    
    EMAIL_SEND_FAILED = 7001
    EMAIL_RATE_LIMIT = 7002
    EMAIL_TEMPLATE_ERROR = 7003
    EMAIL_INVALID_ADDRESS = 7004
    EMAIL_VERIFICATION_FAILED = 7005
    
    # ========================================================================
    # DATABASE ERRORS (8000-8999)
    # ========================================================================
    
    NOT_FOUND = 8001
    DUPLICATE_ENTRY = 8002
    DATABASE_ERROR = 8003
    INTEGRITY_ERROR = 8004
    QUERY_ERROR = 8005
    CONNECTION_ERROR = 8006
    
    # ========================================================================
    # EXTERNAL API ERRORS (9000-9999)
    # ========================================================================
    
    EXTERNAL_API_FAILURE = 9001
    EXTERNAL_API_TIMEOUT = 9002
    EXTERNAL_API_RATE_LIMIT = 9003
    EXTERNAL_API_INVALID_RESPONSE = 9004
    EXTERNAL_API_UNAVAILABLE = 9005
    
    # ========================================================================
    # SYSTEM ERRORS (10000-10999)
    # ========================================================================
    
    INTERNAL_ERROR = 10001
    SERVICE_UNAVAILABLE = 10002
    MAINTENANCE_MODE = 10003
    UNKNOWN_ERROR = 10004
    CONFIGURATION_ERROR = 10005
    
    # ========================================================================
    # ERROR MESSAGES
    # ========================================================================
    
    _MESSAGES: Dict[int, str] = {
        # Authentication (1000-1999)
        INVALID_API_KEY: "Invalid API key provided.",
        MISSING_API_KEY: "API key is required. Please provide X-API-Key header.",
        API_KEY_EXPIRED: "API key has expired. Please generate a new key.",
        API_KEY_INACTIVE: "API key is deactivated. Please reactivate or create a new key.",
        INVALID_CREDENTIALS: "Invalid username or password. Please check your credentials.",
        EMAIL_NOT_VERIFIED: "Email address not verified. Please verify your email before logging in.",
        ACCOUNT_DEACTIVATED: "Your account has been deactivated. Please contact support.",
        ACCOUNT_LOCKED: "Your account has been locked due to too many failed attempts.",
        TOKEN_EXPIRED: "Authentication token has expired. Please refresh your token.",
        TOKEN_INVALID: "Invalid authentication token. Please provide a valid token.",
        REFRESH_TOKEN_EXPIRED: "Refresh token has expired. Please log in again.",
        PASSWORD_RESET_TOKEN_INVALID: "Invalid or expired password reset token.",
        VERIFICATION_CODE_INVALID: "Invalid verification code. Please check and try again.",
        VERIFICATION_CODE_EXPIRED: "Verification code has expired. Please request a new code.",
        AUTH_REQUIRED: "Authentication required. Please log in.",
        AUTH_FAILED: "Authentication failed. Please try again.",
        
        # Authorization (2000-2999)
        PERMISSION_DENIED: "You do not have permission to perform this action.",
        INSUFFICIENT_TIER: "This feature requires a higher subscription tier.",
        ADMIN_REQUIRED: "Administrator privileges required.",
        
        # User Management (3000-3999)
        USERNAME_TAKEN: "Username is already taken. Please choose a different username.",
        EMAIL_TAKEN: "Email is already registered. Please use a different email or log in.",
        USER_NOT_FOUND: "User not found. Please check the user ID.",
        USERNAME_CHANGE_LIMIT: "Username change limit reached. You can change your username 2 times per year.",
        EMAIL_CHANGE_COOLDOWN: "Email change cooldown active. You can change your email once every 6 months.",
        USER_CREATION_FAILED: "Failed to create user. Please try again.",
        USER_UPDATE_FAILED: "Failed to update user. Please try again.",
        USER_DELETE_FAILED: "Failed to delete user. Please try again.",
        USER_ALREADY_VERIFIED: "Email is already verified.",
        USER_INACTIVE: "User account is inactive.",
        
        # API Key (4000-4999)
        API_KEY_LIMIT_EXCEEDED: "Maximum number of API keys reached (5). Please revoke an existing key first.",
        API_KEY_NAME_EXISTS: "An API key with this name already exists.",
        API_KEY_NOT_FOUND: "API key not found.",
        API_KEY_REVOKE_FAILED: "Failed to revoke API key. Please try again.",
        API_KEY_CREATE_FAILED: "Failed to create API key. Please try again.",
        
        # Validation (5000-5999)
        MISSING_PARAMETER: "Required parameter is missing.",
        INVALID_PARAMETER: "Invalid parameter value provided.",
        INVALID_SYMBOL: "Invalid stock symbol. Please provide a valid symbol (e.g., 'AAPL').",
        INVALID_EMAIL: "Invalid email address format. Please provide a valid email.",
        INVALID_PASSWORD: "Invalid password. Password must be at least 8 characters.",
        MISSING_PASSWORD: "Password is required.",
        PASSWORD_MISMATCH: "Passwords do not match. Please ensure both passwords are the same.",
        INVALID_USERNAME: "Invalid username. Use 3-30 characters, letters, numbers, and underscores only.",
        INVALID_CODE: "Invalid code provided.",
        MISSING_CODE: "Verification code is required.",
        INVALID_DATE: "Invalid date format. Please use ISO 8601 format.",
        INVALID_TIMEFRAME: "Invalid timeframe. Please use '7d', '30d', or '90d'.",
        INVALID_AMOUNT: "Invalid amount. Please provide a positive number.",
        INVALID_TIER: "Invalid subscription tier.",
        
        # Rate Limiting (6000-6999)
        RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please slow down your requests.",
        IP_RATE_LIMIT_EXCEEDED: "Too many requests from this IP address.",
        USER_RATE_LIMIT_EXCEEDED: "Too many requests for this user.",
        API_KEY_RATE_LIMIT_EXCEEDED: "API key rate limit exceeded.",
        
        # Email (7000-7999)
        EMAIL_SEND_FAILED: "Failed to send email. Please try again later.",
        EMAIL_RATE_LIMIT: "Too many email requests. Please wait before trying again.",
        EMAIL_TEMPLATE_ERROR: "Email template error.",
        EMAIL_INVALID_ADDRESS: "Invalid email address.",
        EMAIL_VERIFICATION_FAILED: "Email verification failed.",
        
        # Database (8000-8999)
        NOT_FOUND: "Resource not found.",
        DUPLICATE_ENTRY: "Duplicate entry. Resource already exists.",
        DATABASE_ERROR: "Database error. Please try again later.",
        INTEGRITY_ERROR: "Data integrity error.",
        QUERY_ERROR: "Query error. Please check your parameters.",
        CONNECTION_ERROR: "Database connection error.",
        
        # External API (9000-9999)
        EXTERNAL_API_FAILURE: "External API service failure.",
        EXTERNAL_API_TIMEOUT: "External API request timed out.",
        EXTERNAL_API_RATE_LIMIT: "External API rate limit exceeded.",
        EXTERNAL_API_INVALID_RESPONSE: "Invalid response from external API.",
        EXTERNAL_API_UNAVAILABLE: "External API service is unavailable.",
        
        # System (10000-10999)
        INTERNAL_ERROR: "Internal server error. Please try again later.",
        SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again later.",
        MAINTENANCE_MODE: "Service is in maintenance mode. Please try again later.",
        UNKNOWN_ERROR: "An unknown error occurred. Please try again.",
        CONFIGURATION_ERROR: "Configuration error. Please contact support.",
    }
    
    # ========================================================================
    # HTTP STATUS CODE MAPPING
    # ========================================================================
    
    _HTTP_STATUS: Dict[int, int] = {
        # Authentication (1000-1999)
        INVALID_API_KEY: 401,
        MISSING_API_KEY: 401,
        API_KEY_EXPIRED: 401,
        API_KEY_INACTIVE: 401,
        INVALID_CREDENTIALS: 401,
        EMAIL_NOT_VERIFIED: 403,
        ACCOUNT_DEACTIVATED: 403,
        ACCOUNT_LOCKED: 403,
        TOKEN_EXPIRED: 401,
        TOKEN_INVALID: 401,
        REFRESH_TOKEN_EXPIRED: 401,
        PASSWORD_RESET_TOKEN_INVALID: 400,
        VERIFICATION_CODE_INVALID: 400,
        VERIFICATION_CODE_EXPIRED: 400,
        AUTH_REQUIRED: 401,
        AUTH_FAILED: 401,
        
        # Authorization (2000-2999)
        PERMISSION_DENIED: 403,
        INSUFFICIENT_TIER: 403,
        ADMIN_REQUIRED: 403,
        
        # User Management (3000-3999)
        USERNAME_TAKEN: 409,
        EMAIL_TAKEN: 409,
        USER_NOT_FOUND: 404,
        USERNAME_CHANGE_LIMIT: 400,
        EMAIL_CHANGE_COOLDOWN: 400,
        USER_CREATION_FAILED: 500,
        USER_UPDATE_FAILED: 500,
        USER_DELETE_FAILED: 500,
        USER_ALREADY_VERIFIED: 400,
        USER_INACTIVE: 403,
        
        # API Key (4000-4999)
        API_KEY_LIMIT_EXCEEDED: 400,
        API_KEY_NAME_EXISTS: 409,
        API_KEY_NOT_FOUND: 404,
        API_KEY_REVOKE_FAILED: 500,
        API_KEY_CREATE_FAILED: 500,
        
        # Validation (5000-5999)
        MISSING_PARAMETER: 400,
        INVALID_PARAMETER: 400,
        INVALID_SYMBOL: 400,
        INVALID_EMAIL: 400,
        INVALID_PASSWORD: 400,
        MISSING_PASSWORD: 400,
        PASSWORD_MISMATCH: 400,
        INVALID_USERNAME: 400,
        INVALID_CODE: 400,
        MISSING_CODE: 400,
        INVALID_DATE: 400,
        INVALID_TIMEFRAME: 400,
        INVALID_AMOUNT: 400,
        INVALID_TIER: 400,
        
        # Rate Limiting (6000-6999)
        RATE_LIMIT_EXCEEDED: 429,
        IP_RATE_LIMIT_EXCEEDED: 429,
        USER_RATE_LIMIT_EXCEEDED: 429,
        API_KEY_RATE_LIMIT_EXCEEDED: 429,
        
        # Email (7000-7999)
        EMAIL_SEND_FAILED: 500,
        EMAIL_RATE_LIMIT: 429,
        EMAIL_TEMPLATE_ERROR: 500,
        EMAIL_INVALID_ADDRESS: 400,
        EMAIL_VERIFICATION_FAILED: 400,
        
        # Database (8000-8999)
        NOT_FOUND: 404,
        DUPLICATE_ENTRY: 409,
        DATABASE_ERROR: 500,
        INTEGRITY_ERROR: 500,
        QUERY_ERROR: 400,
        CONNECTION_ERROR: 503,
        
        # External API (9000-9999)
        EXTERNAL_API_FAILURE: 502,
        EXTERNAL_API_TIMEOUT: 504,
        EXTERNAL_API_RATE_LIMIT: 429,
        EXTERNAL_API_INVALID_RESPONSE: 502,
        EXTERNAL_API_UNAVAILABLE: 503,
        
        # System (10000-10999)
        INTERNAL_ERROR: 500,
        SERVICE_UNAVAILABLE: 503,
        MAINTENANCE_MODE: 503,
        UNKNOWN_ERROR: 500,
        CONFIGURATION_ERROR: 500,
    }
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    @classmethod
    def get_message(cls, code: int) -> str:
        """
        Get the user-friendly message for an error code.
        
        Args:
            code: Error code
            
        Returns:
            str: Error message
            
        Raises:
            ValueError: If code is not found
        """
        message = cls._MESSAGES.get(code)
        if message is None:
            raise ValueError(f"Unknown error code: {code}")
        return message
    
    @classmethod
    def get_http_status(cls, code: int) -> int:
        """
        Get the HTTP status code for an error code.
        
        Args:
            code: Error code
            
        Returns:
            int: HTTP status code
            
        Raises:
            ValueError: If code is not found
        """
        status = cls._HTTP_STATUS.get(code)
        if status is None:
            raise ValueError(f"Unknown error code: {code}")
        return status
    
    @classmethod
    def get_response(cls, code: int, details: Optional[Dict] = None) -> Dict:
        """
        Get a complete error response for an error code.
        
        Args:
            code: Error code
            details: Additional error details
            
        Returns:
            dict: Complete error response
        """
        return {
            'success': False,
            'error': cls.get_message(code),
            'code': code,
            'details': details,
            'status_code': cls.get_http_status(code),
        }
    
    @classmethod
    def is_success(cls, code: int) -> bool:
        """
        Check if an error code indicates success (code < 1000).
        
        Args:
            code: Error code
            
        Returns:
            bool: True if code indicates success
        """
        return code < 1000
    
    @classmethod
    def get_category(cls, code: int) -> str:
        """
        Get the category of an error code.
        
        Args:
            code: Error code
            
        Returns:
            str: Category name
        """
        if 1000 <= code < 2000:
            return 'authentication'
        elif 2000 <= code < 3000:
            return 'authorization'
        elif 3000 <= code < 4000:
            return 'user_management'
        elif 4000 <= code < 5000:
            return 'api_key'
        elif 5000 <= code < 6000:
            return 'validation'
        elif 6000 <= code < 7000:
            return 'rate_limiting'
        elif 7000 <= code < 8000:
            return 'email'
        elif 8000 <= code < 9000:
            return 'database'
        elif 9000 <= code < 10000:
            return 'external_api'
        elif 10000 <= code < 11000:
            return 'system'
        else:
            return 'unknown'
    
    @classmethod
    def get_all_codes(cls) -> Dict[int, str]:
        """
        Get all error codes with their messages.
        
        Returns:
            dict: Code -> message mapping
        """
        return cls._MESSAGES.copy()
    
    @classmethod
    def get_all_by_category(cls) -> Dict[str, Dict[int, str]]:
        """
        Get all error codes grouped by category.
        
        Returns:
            dict: Category -> {code: message}
        """
        result = {}
        for code, message in cls._MESSAGES.items():
            category = cls.get_category(code)
            if category not in result:
                result[category] = {}
            result[category][code] = message
        return result


# ========================================================================
# SHORTCUT FUNCTIONS
# ========================================================================

def error_response_from_code(code: int, details: Optional[Dict] = None) -> Dict:
    """
    Convenience function to create an error response from an error code.
    
    Args:
        code: Error code
        details: Additional error details
        
    Returns:
        dict: Error response
    """
    return ErrorCodes.get_response(code, details)


def is_error_code(code: int) -> bool:
    """
    Check if a code is a valid error code.
    
    Args:
        code: Code to check
        
    Returns:
        bool: True if code is a valid error code
    """
    return code in ErrorCodes._MESSAGES


# ========================================================================
# EXPORTS
# ========================================================================

__all__ = [
    'ErrorCodes',
    'error_response_from_code',
    'is_error_code',
]