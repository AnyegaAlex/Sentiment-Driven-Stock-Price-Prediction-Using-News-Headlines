"""
Sentry configuration for Tickflow Sentiment.
Provides error tracking, performance monitoring, and release tracking.

Features:
- Error and exception tracking
- Performance monitoring (traces)
- Profile sampling
- Release tracking
- Environment-specific configuration
- Breadcrumbs for debugging
- Automatic user context
- Integration with Django, Redis, and Logging
- Business metrics tagging
- Database query tracking
- API endpoint performance monitoring
"""

import os
import sys
import logging
from typing import Optional, Dict, Any

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from django.conf import settings

logger = logging.getLogger(__name__)

# ============================================================================
# CONSTANTS
# ============================================================================

# Default values
DEFAULT_ENVIRONMENT = 'production'
DEFAULT_TRACES_SAMPLE_RATE = 0.1  # 10% of transactions
DEFAULT_PROFILES_SAMPLE_RATE = 0.1  # 10% of profiles
DEFAULT_RELEASE = None
APP_VERSION = getattr(settings, 'APP_VERSION', '1.0.0')


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_sentry_config() -> Dict[str, Any]:
    """
    Get Sentry configuration from Django settings with defaults.
    
    Returns:
        dict: Sentry configuration
    """
    return {
        'dsn': getattr(settings, 'SENTRY_DSN', None),
        'environment': getattr(settings, 'SENTRY_ENVIRONMENT', DEFAULT_ENVIRONMENT),
        'traces_sample_rate': float(getattr(settings, 'SENTRY_TRACES_SAMPLE_RATE', DEFAULT_TRACES_SAMPLE_RATE)),
        'profiles_sample_rate': float(getattr(settings, 'SENTRY_PROFILES_SAMPLE_RATE', DEFAULT_PROFILES_SAMPLE_RATE)),
        'release': getattr(settings, 'SENTRY_RELEASE', DEFAULT_RELEASE),
        'debug': getattr(settings, 'DEBUG', False),
        'send_default_pii': getattr(settings, 'SENTRY_SEND_PII', True),
        'attach_stacktrace': getattr(settings, 'SENTRY_ATTACH_STACKTRACE', True),
        'max_breadcrumbs': getattr(settings, 'SENTRY_MAX_BREADCRUMBS', 100),
        'enable_tracing': getattr(settings, 'SENTRY_ENABLE_TRACING', True),
        'enable_profiling': getattr(settings, 'SENTRY_ENABLE_PROFILING', True),
    }


def is_sentry_enabled() -> bool:
    """
    Check if Sentry is enabled.
    
    Returns:
        bool: True if Sentry is enabled
    """
    dsn = getattr(settings, 'SENTRY_DSN', None)
    
    # Disable in test environment
    if getattr(settings, 'TESTING', False):
        return False
    
    # Disable if DSN is not set
    if not dsn:
        return False
    
    return True


def get_environment() -> str:
    """
    Get the current environment with fallback detection.
    
    Returns:
        str: Environment name
    """
    env = getattr(settings, 'SENTRY_ENVIRONMENT', DEFAULT_ENVIRONMENT)
    
    # Auto-detect environment if not set
    if not env or env == DEFAULT_ENVIRONMENT:
        if getattr(settings, 'DEBUG', False):
            return 'development'
        elif 'RENDER' in os.environ:
            return 'render'
        elif 'HEROKU' in os.environ:
            return 'heroku'
        elif 'AWS_EXECUTION_ENV' in os.environ:
            return 'aws'
    
    return env


def get_release() -> Optional[str]:
    """
    Get the release version with fallback detection.
    
    Returns:
        str: Release version or None
    """
    release = getattr(settings, 'SENTRY_RELEASE', None)
    
    if not release:
        # Try to get from environment
        release = os.environ.get('SENTRY_RELEASE')
    
    if not release:
        # Try to get from git (if available)
        try:
            import subprocess
            release = subprocess.check_output(
                ['git', 'rev-parse', 'HEAD'],
                cwd=settings.BASE_DIR,
                stderr=subprocess.DEVNULL
            ).strip().decode('utf-8')[:12]
        except (subprocess.CalledProcessError, FileNotFoundError, Exception):
            pass
    
    return release


def before_send(event: Dict, hint: Dict) -> Optional[Dict]:
    """
    Filter and modify events before sending to Sentry.
    
    Args:
        event: The event data
        hint: Additional context
    
    Returns:
        dict: Modified event or None to drop
    """
    # Don't send events from health checks
    if 'request' in event and 'url' in event['request']:
        url = event['request']['url']
        if '/health/' in url or '/healthz/' in url:
            return None
    
    # Don't send events from debug endpoints
    if 'request' in event and 'url' in event['request']:
        url = event['request']['url']
        if '/sentry-debug/' in url or '/debug/' in url:
            return None
    
    # Remove sensitive data from URLs
    if 'request' in event and 'url' in event['request']:
        import re
        # Remove API keys from URLs
        event['request']['url'] = re.sub(
            r'(?<=[?&])api_key=[^&]+',
            'api_key=[REDACTED]',
            event['request']['url']
        )
        # Remove tokens from URLs
        event['request']['url'] = re.sub(
            r'(?<=[?&])token=[^&]+',
            'token=[REDACTED]',
            event['request']['url']
        )
    
    return event


def before_breadcrumb(crumb: Dict, hint: Dict) -> Dict:
    """
    Filter and modify breadcrumbs before sending.
    
    Args:
        crumb: The breadcrumb data
        hint: Additional context
    
    Returns:
        dict: Modified breadcrumb or None to drop
    """
    # Don't include health check breadcrumbs
    if crumb.get('category') == 'http' and '/health/' in str(crumb.get('data', {})):
        return None
    
    # Don't include static file requests
    if crumb.get('category') == 'http' and '/static/' in str(crumb.get('data', {})):
        return None
    
    return crumb


# ============================================================================
# SENTRY INITIALIZATION
# ============================================================================

def init_sentry() -> bool:
    """
    Initialize Sentry with production configuration.
    
    Returns:
        bool: True if Sentry initialized successfully, False otherwise
    """
    # Check if Sentry should be enabled
    if not is_sentry_enabled():
        logger.info("Sentry is disabled")
        return False
    
    try:
        config = get_sentry_config()
        
        # Get environment and release
        environment = get_environment()
        release = get_release()
        
        logger.info(f"Initializing Sentry for environment: {environment}")
        
        # Build integrations list
        integrations = [
            DjangoIntegration(),
            RedisIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR,
            ),
        ]
        
        # Add Celery integration if available (optional)
        try:
            import celery  # noqa
            from sentry_sdk.integrations.celery import CeleryIntegration
            integrations.append(CeleryIntegration())
        except ImportError:
            pass
        
        # Initialize Sentry
        sentry_sdk.init(
            dsn=config['dsn'],
            integrations=integrations,
            environment=environment,
            release=release,
            traces_sample_rate=config['traces_sample_rate'],
            profiles_sample_rate=config['profiles_sample_rate'],
            send_default_pii=config['send_default_pii'],
            attach_stacktrace=config['attach_stacktrace'],
            max_breadcrumbs=config['max_breadcrumbs'],
            enable_tracing=config['enable_tracing'],
            debug=config['debug'],
            before_send=before_send,
            before_breadcrumb=before_breadcrumb,
            # Enable Spotlight for local development
            spotlight=getattr(settings, 'DEBUG', False),
        )
        
        # ================================================================
        # ✅ ENHANCEMENT 1: Set Global Tags for Business Metrics
        # ================================================================
        
        # Application metadata
        sentry_sdk.set_tag('app_name', 'Tickflow Sentiment')
        sentry_sdk.set_tag('app_version', APP_VERSION)
        sentry_sdk.set_tag('python_version', sys.version.split()[0])
        sentry_sdk.set_tag('django_version', getattr(settings, 'DJANGO_VERSION', 'unknown'))
        
        # Deployment metadata
        sentry_sdk.set_tag('deployment_type', 'container' if 'RENDER' in os.environ else 'local')
        sentry_sdk.set_tag('environment', environment)
        
        # ================================================================
        # ✅ ENHANCEMENT 2: Set Business Context
        # ================================================================
        
        sentry_sdk.set_context('app', {
            'name': 'Tickflow Sentiment',
            'version': APP_VERSION,
            'environment': environment,
            'release': release,
        })
        
        sentry_sdk.set_context('deployment', {
            'platform': 'render' if 'RENDER' in os.environ else 'local',
            'python_version': sys.version.split()[0],
            'debug_mode': getattr(settings, 'DEBUG', False),
        })
        
        # Capture initialization message
        sentry_sdk.capture_message(
            f"Sentry initialized for environment: {environment} (v{APP_VERSION})",
            level="info"
        )
        
        logger.info(f"Sentry initialized successfully for environment: {environment}")
        return True
        
    except ImportError as e:
        logger.warning(f"Sentry import error: {e}")
        return False
    except Exception as e:
        logger.error(f"Sentry initialization failed: {e}", exc_info=True)
        return False


# ============================================================================
# ✅ ENHANCEMENT 3: Performance Monitoring for Critical Endpoints
# ============================================================================

def start_transaction(name: str, op: str = 'api.endpoint'):
    """
    Start a Sentry transaction for performance monitoring.
    
    Usage:
        with start_transaction('stock_analysis', 'api.analysis'):
            # Your code here
            pass
    
    Args:
        name: Transaction name
        op: Operation type
    
    Returns:
        Context manager for transaction
    """
    return sentry_sdk.start_transaction(op=op, name=name)


def set_transaction_name(name: str):
    """
    Set the current transaction name.
    
    Args:
        name: Transaction name
    """
    sentry_sdk.set_transaction_name(name)


# ============================================================================
# HELPER FUNCTIONS FOR APPLICATION USE
# ============================================================================

def set_user_context(user):
    """
    Set user context for Sentry.
    
    Args:
        user: Django User instance
    """
    if not user or not user.is_authenticated:
        return
    
    try:
        sentry_sdk.set_user({
            'id': str(user.id),
            'username': getattr(user, 'username', None),
            'email': getattr(user, 'email', None),
            'tier': getattr(user, 'tier', None),
            'persona': getattr(user, 'persona', None),
        })
    except Exception as e:
        logger.warning(f"Failed to set user context: {e}")


def set_request_context(request):
    """
    Set request context for Sentry.
    
    Args:
        request: Django request object
    """
    try:
        sentry_sdk.set_context('request', {
            'method': request.method,
            'path': request.path,
            'ip': request.META.get('REMOTE_ADDR'),
            'user_agent': request.META.get('HTTP_USER_AGENT'),
        })
    except Exception as e:
        logger.warning(f"Failed to set request context: {e}")


def capture_exception_with_context(exception, context=None):
    """
    Capture an exception with additional context.
    
    Args:
        exception: Exception to capture
        context: Additional context dict
    """
    with sentry_sdk.push_scope() as scope:
        if context:
            for key, value in context.items():
                scope.set_context(key, value)
        sentry_sdk.capture_exception(exception)


def capture_message_with_level(message, level='info', context=None):
    """
    Capture a message with a specific level.
    
    Args:
        message: Message string
        level: Log level ('debug', 'info', 'warning', 'error')
        context: Additional context dict
    """
    level_map = {
        'debug': 'debug',
        'info': 'info',
        'warning': 'warning',
        'error': 'error',
        'critical': 'fatal',
    }
    
    with sentry_sdk.push_scope() as scope:
        if context:
            for key, value in context.items():
                scope.set_context(key, value)
        sentry_sdk.capture_message(message, level=level_map.get(level, 'info'))


def add_breadcrumb(message, category='default', level='info', data=None):
    """
    Add a breadcrumb for debugging.
    
    Args:
        message: Breadcrumb message
        category: Category of breadcrumb
        level: Log level
        data: Additional data
    """
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {},
    )


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    'init_sentry',
    'set_user_context',
    'set_request_context',
    'capture_exception_with_context',
    'capture_message_with_level',
    'add_breadcrumb',
    'is_sentry_enabled',
    'get_environment',
    'get_release',
    'start_transaction',
    'set_transaction_name',
]