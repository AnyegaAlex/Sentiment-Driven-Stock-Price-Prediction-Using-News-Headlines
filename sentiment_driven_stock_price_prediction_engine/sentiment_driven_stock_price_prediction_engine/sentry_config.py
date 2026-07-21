"""
Sentry configuration for Tickflow Sentiment.
Provides error tracking, performance monitoring, and release tracking.
"""

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def init_sentry():
    """Initialize Sentry with production configuration."""
    sentry_dsn = getattr(settings, 'SENTRY_DSN', None)
    
    if not sentry_dsn:
        logger.warning("SENTRY_DSN not configured – Sentry disabled")
        return
    
    # Configure Sentry
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            DjangoIntegration(request_bodies='small'),
            RedisIntegration(),
            LoggingIntegration(
                level=logging.INFO,  # Capture info and above as breadcrumbs
                event_level=logging.ERROR  # Send errors as events
            ),
        ],
        # Set traces_sample_rate to 0.1 for production (10% of transactions)
        traces_sample_rate=getattr(settings, 'SENTRY_TRACES_SAMPLE_RATE', 0.1),
        # Set profiles_sample_rate to 0.1 for production
        profiles_sample_rate=getattr(settings, 'SENTRY_PROFILES_SAMPLE_RATE', 0.1),
        # Release tracking
        release=getattr(settings, 'SENTRY_RELEASE', None),
        environment=getattr(settings, 'SENTRY_ENVIRONMENT', 'production'),
        # Send default PII (user IP, username) for debugging
        send_default_pii=True,
        # Enable performance monitoring
        enable_tracing=True,
        # Breadcrumbs for Django
        attach_stacktrace=True,
    )
    
    # Set user context for all events if authenticated
    sentry_sdk.set_context('app', {
        'name': 'Tickflow Sentiment',
        'version': getattr(settings, 'APP_VERSION', '1.0.0'),
    })
    
    logger.info(f"Sentry initialized for environment: {getattr(settings, 'SENTRY_ENVIRONMENT', 'production')}")