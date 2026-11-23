"""
Django settings for sentiment_driven_stock_price_prediction_engine.

Production‑ready for Render free tier:
- Lightweight, no Celery, minimal memory.
- Uses Redis (with fallback to LocMemCache) for caching.
- JSON structured logging with request‑id tracking.
- Sentry error monitoring.
- Email via SendGrid with console fallback.
- Security headers enforced in production.

Author: Tickflow Capital
Version: 1.1.1
"""

import os
import logging
from pathlib import Path
from urllib.parse import urlparse

import dj_database_url
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------------------------
# Base directory & paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Cache for Hugging Face models (persistent across deploys)
os.environ['TRANSFORMERS_CACHE'] = str(BASE_DIR / '.cache' / 'huggingface')
os.environ['HF_HOME'] = str(BASE_DIR / '.cache' / 'huggingface')

# ---------------------------------------------------------------------------
# Security & Debug
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured("SECRET_KEY environment variable is not set.")

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# ALLOWED_HOSTS: required Render domains + environment variable overrides
REQUIRED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "sentiment-driven-stock-price-prediction.onrender.com",
    "tickflow-sentiment-staging.onrender.com",
    # Audit (item 12): wildcard kept for Render PR previews, which all get
    # *.onrender.com hostnames. Remove this entry when previews are disabled —
    # it lets any Render-hosted subdomain pass Host validation.
    ".onrender.com",
]
env_hosts = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()]
ALLOWED_HOSTS = list(set(REQUIRED_HOSTS + env_hosts))

# Security headers (applied via SecurityMiddleware)
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # Audit (item 8): SECURE_BROWSER_XSS_FILTER removed — no-op since Django 4.0.
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    X_FRAME_OPTIONS = 'DENY'

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third‑party
    'rest_framework',
    'corsheaders',
    'django_redis',
    'drf_spectacular',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',

    # Local
    'authentication',
    'news',
    'stocks',
    'health',
]

AUTH_USER_MODEL = 'authentication.User'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'authentication.middleware.RequestLoggingMiddleware',      # logs request/response
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    # Custom
    'authentication.middleware.APIKeyMiddleware',
    'authentication.middleware.RateLimitHeadersMiddleware',
    'authentication.middleware.DeprecationMiddleware',
]

ROOT_URLCONF = 'sentiment_driven_stock_price_prediction_engine.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'sentiment_driven_stock_price_prediction_engine.wsgi.application'

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
# Use dj_database_url to parse DATABASE_URL; falls back to SQLite for local dev.
# Connection pooling disabled (CONN_MAX_AGE=0) to avoid connection leaks on free tier.
# Health checks enabled (Django 4.1+).
# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

# Get DATABASE_URL from environment
database_url = os.getenv("DATABASE_URL")

if database_url:
    # Parse the URL to check if it's PostgreSQL
    parsed = urlparse(database_url)
    
    if parsed.scheme in ('postgres', 'postgresql'):
        # PostgreSQL - add SSL options for Neon
        DATABASES = {
            'default': dj_database_url.config(
                default=database_url,
                conn_max_age=0,
                ssl_require=True,  # Neon requires SSL
            )
        }
        # Audit (item 9): merge into any OPTIONS dj_database_url already parsed
        # instead of overwriting them. Previously this silently dropped URL options.
        DATABASES['default']['OPTIONS'] = {
            **DATABASES['default'].get('OPTIONS', {}),
            'connect_timeout': 10,
            'sslmode': 'require',
        }
        DATABASES['default']['CONN_HEALTH_CHECKS'] = True
    else:
        # Not PostgreSQL (SQLite, etc.)
        DATABASES = {
            'default': dj_database_url.config(
                default=database_url,
                conn_max_age=0,
            )
        }
else:
    # Fallback to SQLite for local development
    default_db = 'sqlite:///' + str(BASE_DIR / 'db.sqlite3')
    DATABASES = {
        'default': dj_database_url.config(
            default=default_db,
            conn_max_age=0,
        )
    }

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Audit (item 2): 24h, not Django's 3-day default. Verification/reset tokens
# are single-purpose and short-lived.
PASSWORD_RESET_TIMEOUT = 86400

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & media files
# ---------------------------------------------------------------------------
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# WhiteNoise with compression and immutable caching.
# Audit (item 5): STATICFILES_STORAGE was removed in Django 5.1; STORAGES is
# the replacement and must be used for WhiteNoise's manifest storage to apply.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
WHITENOISE_MAX_AGE = 86400  # 1 day
WHITENOISE_IMMUTABLE_FILES = True

# ---------------------------------------------------------------------------
# REST Framework
# ---------------------------------------------------------------------------
# Audit (item 3): must match the real proxy hop count for X-Forwarded-For
# parsing. Render terminates TLS one hop in front of the app.
# Wrong value here (or absent) makes DRF's AnonRateThrottle bucket everyone
# under the proxy IP and lets an attacker spoof identity via X-Forwarded-For.
NUM_PROXIES = 1

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    # Audit (item 6): stock throttles retained deliberately.
    # The custom `CustomAnonRateThrottle` / `CustomUserRateThrottle` in
    # authentication.throttles are left unreferenced because
    # CustomAnonRateThrottle reads REMOTE_ADDR first (the Render proxy IP),
    # which would bucket all anonymous traffic into one bucket. Stock
    # AnonRateThrottle, combined with NUM_PROXIES above, correctly identifies
    # the client IP. CustomUserRateThrottle is functional but redundant.
    # Both classes are candidates for deletion in a future throttles.py cleanup.
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'authentication.throttles.APIKeyRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'apikey': '200/minute',
    },
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'authentication.authentication.APIKeyAuthentication',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ---------------------------------------------------------------------------
# Email (SendGrid SMTP)
# ---------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp-relay.brevo.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "c49d83001@smtp-brevo.com"  # Brevo SMTP login
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_HOST_PASSWORD = os.getenv("BREVO_SMTP_KEY")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "info@tickflowcapital.com")
DEFAULT_FROM_NAME = os.getenv("DEFAULT_FROM_NAME", "Tickflow Sentiment")

# Audit (item 1): bound the SMTP fallback. Without this, SMTP uses
# timeout=None, and Render free blocks port 587 — each connect waits ~127s.
EMAIL_TIMEOUT = 10

# If no password, fallback to console (with warning)
if not EMAIL_HOST_PASSWORD:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning("BREVO_SMTP_KEY not set – using console email backend for development.")
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
CONTACT_EMAIL = os.getenv('CONTACT_EMAIL', 'info@tickflowcapital.com')
# ---------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing)
# ---------------------------------------------------------------------------
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://sentiment-driven-stock-price-predic.vercel.app')

# Combine all allowed origins; deduplicate
CORS_ALLOWED_ORIGINS = list(set([
    FRONTEND_URL,
    "https://sentiment-driven-stock-price-predic.vercel.app",
    "https://sentiment-driven-stock-price-pr-git-bce111-anyegaalexs-projects.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
]))
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'
]
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type', 'dnt',
    'origin', 'user-agent', 'x-csrftoken', 'x-requested-with', 'x-api-key',
    'x-request-id', 'idempotency-key', 'x-client-version'
]
CORS_EXPOSE_HEADERS = ['content-disposition', 'x-request-id']
CORS_PREFLIGHT_MAX_AGE = 86400

# CSRF trusted origins.
# Audit (item 11): in production, CSRF_TRUSTED_ORIGINS should not contain
# localhost/127.0.0.1. In DEBUG (local dev), keep them for convenience so the
# local frontend can call the local backend. CORS_ALLOWED_ORIGINS above is
# intentionally left untouched (per item 11 preferred option).
if DEBUG:
    CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()
else:
    CSRF_TRUSTED_ORIGINS = [
        origin for origin in CORS_ALLOWED_ORIGINS
        if not origin.startswith(('http://localhost', 'http://127.0.0.1'))
    ]

# ---------------------------------------------------------------------------
# Sessions & caching
# ---------------------------------------------------------------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024  # 2 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

# Redis cache with LocMemCache fallback
REDIS_URL = os.getenv('REDIS_URL')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'SOCKET_CONNECT_TIMEOUT': 10,
                'SOCKET_TIMEOUT': 5,
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                # Audit (item 4): IGNORE_EXCEPTIONS=False so Redis failures
                # surface instead of silently turning throttles, lockouts,
                # verification codes, and cache.add() into fail-open paths.
                # TRADEOFF: any caller that relied on silent failure (throttles,
                # cached_db session reads, resend cooldown) must now handle
                # exceptions or implement fail-closed counters. That follow-up
                # is out of scope for this file — see Risks.
                'IGNORE_EXCEPTIONS': False,
                # Audit (item 10): MAX_ENTRIES and CULL_FREQUENCY removed —
                # they are LocMemCache-only options and django-redis ignores them.
            },
            'KEY_PREFIX': 'sentiment_analysis',
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
USE_JSON_LOGS = os.getenv('USE_JSON_LOGS', 'false').lower() == 'true'

# Custom JSON formatter – only created if USE_JSON_LOGS is True
json_formatter = None
if USE_JSON_LOGS:
    try:
        from .logging_config import CustomJsonFormatter
        json_formatter = CustomJsonFormatter(
            fmt='%(level)s %(timestamp)s %(logger)s %(module)s %(line_number)s %(message)s %(request_id)s %(user_id)s %(trace_id)s'
        )
    except (ImportError, TypeError) as e:
        import json
        import logging
        from datetime import datetime

        class SimpleJsonFormatter(logging.Formatter):
            def format(self, record):
                log_record = {
                    'level': record.levelname,
                    'timestamp': datetime.utcnow().isoformat(),
                    'logger': record.name,
                    'module': record.module,
                    'line_number': record.lineno,
                    'message': record.getMessage(),
                    'request_id': getattr(record, 'request_id', None),
                    'user_id': getattr(record, 'user_id', None),
                    'trace_id': getattr(record, 'trace_id', None),
                }
                return json.dumps(log_record)

        json_formatter = SimpleJsonFormatter()

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose' if not USE_JSON_LOGS else 'json',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': str(LOG_DIR / 'app.log'),
            'formatter': 'verbose' if not USE_JSON_LOGS else 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'authentication': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'stocks': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'news': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
    },
}

# Only add the 'json' formatter if we're using JSON logs
if USE_JSON_LOGS and json_formatter:
    LOGGING['formatters']['json'] = {'()': lambda: json_formatter}

# ---------------------------------------------------------------------------
# Sentry (error monitoring)
# ---------------------------------------------------------------------------
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
SENTRY_TRACES_SAMPLE_RATE = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
SENTRY_PROFILES_SAMPLE_RATE = float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1"))
SENTRY_ENVIRONMENT = os.getenv("SENTRY_ENVIRONMENT", "production")
SENTRY_RELEASE = os.getenv("SENTRY_RELEASE", None)
# Audit (item 7): PII off by default. The old "true" default shipped headers
# (Authorization bearer tokens, cookies) and user context to Sentry.
SENTRY_SEND_PII = os.getenv("SENTRY_SEND_PII", "false").lower() == "true"
SENTRY_ATTACH_STACKTRACE = os.getenv("SENTRY_ATTACH_STACKTRACE", "true").lower() == "true"
SENTRY_ENABLE_TRACING = os.getenv("SENTRY_ENABLE_TRACING", "true").lower() == "true"
SENTRY_ENABLE_PROFILING = os.getenv("SENTRY_ENABLE_PROFILING", "true").lower() == "true"
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
SENTRY_DEBUG = os.getenv("SENTRY_DEBUG", "False").lower() == "true"

if SENTRY_DSN:
    try:
        from .sentry_config import init_sentry
        init_sentry()
    except ImportError:
        logger = logging.getLogger(__name__)
        logger.warning("sentry_config.py not found – Sentry initialization skipped")
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Sentry initialization failed: {e}")

# ---------------------------------------------------------------------------
# Custom application settings
# ---------------------------------------------------------------------------
# Sentiment model (FinBERT) configuration – memory‑saving defaults
FINBERT_CONFIG = {
    'model_name': 'ProsusAI/finbert',
    'min_text_length': 25,
    'max_text_length': 1500,
    'confidence_threshold': 0.45,
    'model_options': {
        'device_map': 'auto',
        'low_cpu_mem_usage': True,
        'torch_dtype': 'auto',
    },
    'circuit_breaker': {
        'failure_threshold': 5,
        'recovery_timeout': 300,
    },
}

# External API keys (server‑side only)
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

# P0.3 licensed-news gate. Both default off. NEWS_PUBLIC_ACCESS lets non-staff
# users see provider news; enable only after the provider license permits it.
# NEWS_INGESTION_ENABLED lets fetch_news call providers at all.
NEWS_PUBLIC_ACCESS = os.getenv("NEWS_PUBLIC_ACCESS", "false").lower() in ("1", "true", "yes")
NEWS_INGESTION_ENABLED = os.getenv("NEWS_INGESTION_ENABLED", "false").lower() in ("1", "true", "yes")
# P0.3 price-data gate. Off by default: live provider prices and technicals are
# served to staff only until the provider permissions allow public use.
PRICE_DATA_PUBLIC_ACCESS = os.getenv("PRICE_DATA_PUBLIC_ACCESS", "false").lower() in ("1", "true", "yes")

# PREDICTION_GENERATION_ENABLED lets generate_predictions write price-derived predictions.
# Off until provider terms, datasets and output storage are reviewed. Default off.
PREDICTION_GENERATION_ENABLED = os.getenv("PREDICTION_GENERATION_ENABLED", "false").lower() in ("1", "true", "yes")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "apidojo-yahoo-finance-v1.p.rapidapi.com")
TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY")
STATIC_API_KEY = os.getenv("STATIC_API_KEY", None)  # fallback for development

# Other
APPEND_SLASH = True

# ---------------------------------------------------------------------------
# API documentation (drf-spectacular)
# ---------------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    'TITLE': 'Sentiment-Driven Stock Prediction API',
    'DESCRIPTION': 'Real-time stock analysis, sentiment, and LSTM forecasts.',
    # Audit (item 14): derive from APP_VERSION so OpenAPI, Sentry, and the
    # module docstring cannot drift from each other.
    'VERSION': APP_VERSION,
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}