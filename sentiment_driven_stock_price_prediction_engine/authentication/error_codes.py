class ErrorCodes:
    # Authentication errors (1000-1999)
    INVALID_API_KEY = 1001
    MISSING_API_KEY = 1002
    API_KEY_EXPIRED = 1003
    
    # Validation errors (2000-2999)
    MISSING_PARAMETER = 2001
    INVALID_PARAMETER = 2002
    INVALID_SYMBOL = 2003
    
    # Rate limiting errors (3000-3999)
    RATE_LIMIT_EXCEEDED = 3001
    
    # Database errors (4000-4999)
    NOT_FOUND = 4001
    DUPLICATE_ENTRY = 4002
    
    # External API errors (5000-5999)
    EXTERNAL_API_FAILURE = 5001
    EXTERNAL_API_TIMEOUT = 5002
    
    # System errors (9000-9999)
    INTERNAL_ERROR = 9001