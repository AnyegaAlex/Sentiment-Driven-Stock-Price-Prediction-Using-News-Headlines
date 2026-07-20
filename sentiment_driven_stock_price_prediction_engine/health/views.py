"""
Health check endpoints for Tickflow Sentiment.
Provides detailed service status for monitoring and load balancers.
"""

import logging
import time
import os
from django.db import connection
from django.core.cache import cache
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Comprehensive health check endpoint.
    
    Checks:
    - Database connectivity
    - Redis cache connectivity
    - System memory usage
    - Response time
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        start_time = time.time()
        status = 'healthy'
        checks = {}
        
        # 1. Database check
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            checks['database'] = {
                'status': 'healthy',
                'message': 'Connected to database'
            }
        except Exception as e:
            checks['database'] = {
                'status': 'unhealthy',
                'message': str(e)
            }
            status = 'unhealthy'
        
        # 2. Redis check (only if configured)
        if getattr(settings, 'REDIS_URL', None):
            try:
                cache.set('health_check_test', 'ok', timeout=5)
                result = cache.get('health_check_test')
                if result == 'ok':
                    checks['redis'] = {
                        'status': 'healthy',
                        'message': 'Redis connected'
                    }
                else:
                    checks['redis'] = {
                        'status': 'degraded',
                        'message': 'Redis response invalid'
                    }
            except Exception as e:
                checks['redis'] = {
                    'status': 'unhealthy',
                    'message': str(e)
                }
                status = 'unhealthy'
        else:
            checks['redis'] = {
                'status': 'not_configured',
                'message': 'Redis not configured (using memory cache)'
            }
        
        # 3. Memory check (if psutil available)
        try:
            import psutil
            memory = psutil.virtual_memory()
            memory_usage_percent = memory.percent
            if memory_usage_percent > 90:
                checks['memory'] = {
                    'status': 'degraded',
                    'message': f'Memory usage: {memory_usage_percent}%',
                    'usage_percent': memory_usage_percent
                }
            else:
                checks['memory'] = {
                    'status': 'healthy',
                    'message': f'Memory usage: {memory_usage_percent}%',
                    'usage_percent': memory_usage_percent
                }
        except ImportError:
            checks['memory'] = {
                'status': 'skipped',
                'message': 'psutil not installed (optional)'
            }
        except Exception as e:
            checks['memory'] = {
                'status': 'degraded',
                'message': str(e)
            }
        
        # 4. Response time
        response_time = (time.time() - start_time) * 1000
        checks['response_time_ms'] = round(response_time, 2)
        
        # 5. Version info
        checks['version'] = {
            'app': getattr(settings, 'APP_VERSION', '1.0.0'),
            'django': '5.1.5',
            'environment': getattr(settings, 'SENTRY_ENVIRONMENT', 'production'),
        }
        
        # 6. External API providers (optional)
        providers = {}
        finnhub_key = getattr(settings, 'FINNHUB_API_KEY', None)
        if finnhub_key:
            providers['finnhub'] = {'configured': True}
        alpha_key = getattr(settings, 'ALPHA_VANTAGE_KEY', None)
        if alpha_key:
            providers['alpha_vantage'] = {'configured': True}
        rapidapi_key = getattr(settings, 'RAPIDAPI_KEY', None)
        if rapidapi_key:
            providers['rapidapi'] = {'configured': True}
        
        if providers:
            checks['providers'] = providers
        
        response_data = {
            'status': status,
            'timestamp': time.time(),
            'checks': checks,
        }
        
        # Log health status changes
        if status != 'healthy':
            logger.warning(f"Health check status: {status}")
        
        return Response(response_data, status=200 if status == 'healthy' else 503)


class ReadinessView(APIView):
    """
    Readiness check for load balancers.
    Checks only critical dependencies (database, redis).
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        ready = True
        issues = []
        
        # Database check
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception as e:
            ready = False
            issues.append(f'Database: {str(e)}')
        
        # Redis check (if configured)
        if getattr(settings, 'REDIS_URL', None):
            try:
                cache.set('readiness_check', 'ok', timeout=5)
                result = cache.get('readiness_check')
                if result != 'ok':
                    ready = False
                    issues.append('Redis: unhealthy')
            except Exception as e:
                ready = False
                issues.append(f'Redis: {str(e)}')
        
        return Response({
            'status': 'ready' if ready else 'not_ready',
            'issues': issues,
        }, status=200 if ready else 503)