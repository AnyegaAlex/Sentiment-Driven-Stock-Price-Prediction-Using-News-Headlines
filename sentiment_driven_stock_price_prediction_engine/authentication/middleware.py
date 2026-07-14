from django.http import JsonResponse
from django.core.cache import cache
import os
from .models import APIKey

class APIKeyMiddleware:
    """Global authentication for all non-public endpoints."""
    EXEMPT_PATHS = ['/admin/', '/health/', '/api/docs/', '/api/schema/', '/generate-key/']

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip auth for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return self.get_response(request)

        api_key = request.headers.get('X-API-Key')
        
        # Check static API key fallback (from environment)
        static_key = os.environ.get('STATIC_API_KEY')
        if static_key and api_key == static_key:
            request.api_key = api_key
            return self.get_response(request)
        
        # Check database for API key
        if not api_key or not APIKey.is_valid(api_key):
            return JsonResponse(
                {'error': 'Valid X-API-Key header required.'},
                status=401
            )
        
        # Store API key on request for rate limiting
        request.api_key = api_key
        return self.get_response(request)


class DeprecationMiddleware:
    """Adds deprecation headers to legacy endpoints."""
    DEPRECATED_PATHS = [
        '/api/stock-opinion/', 
        '/api/news/analyzed/'  # legacy alias
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
                api_key_obj = APIKey.objects.get(key=request.api_key)
                
                # Get current usage from cache (set by throttle)
                cache_key = f"rate_limit_{request.api_key}"
                usage = cache.get(cache_key, {'count': 0, 'reset': None})
                
                # Rate limit: 200 requests per minute
                limit = 200
                remaining = max(0, limit - usage.get('count', 0))
                
                response['X-RateLimit-Limit'] = str(limit)
                response['X-RateLimit-Remaining'] = str(remaining)
                response['X-RateLimit-Reset'] = '60'  # seconds until reset
                
            except APIKey.DoesNotExist:
                pass
        
        return response