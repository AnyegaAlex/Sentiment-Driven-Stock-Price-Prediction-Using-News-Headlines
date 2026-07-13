from rest_framework.throttling import SimpleRateThrottle
from django.core.cache import cache

class APIKeyRateThrottle(SimpleRateThrottle):
    scope = 'apikey'

    def get_cache_key(self, request, view):
        key = request.headers.get('X-API-Key')
        if not key:
            return None
        
        # Track usage for rate limit headers
        cache_key = f"rate_limit_{key}"
        usage = cache.get(cache_key, {'count': 0})
        usage['count'] = usage.get('count', 0) + 1
        cache.set(cache_key, usage, timeout=60)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': key
        }