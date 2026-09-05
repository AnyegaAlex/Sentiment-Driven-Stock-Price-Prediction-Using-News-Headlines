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
Version: 1.1.0
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
    ".onrender.com",  # wildcard for any Render subdomain
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
    SECURE_BROWSER_XSS_FILTER = True
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
default_db = 'sqlite:///' + str(BASE_DIR / 'db.sqlite3')
DATABASES = {
    'default': dj_database_url.config(
        default=default_db,
        conn_max_age=0,
    )
}

# Add health checks and connection timeout for PostgreSQL
if DATABASES['default']['ENGINE'] == 'django.db.backends.postgresql':
    DATABASES['default']['OPTIONS'] = {
        'connect_timeout': 10,
        'sslmode': 'require',
    }
    DATABASES['default']['CONN_HEALTH_CHECKS'] = True  # Django 4.1+

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

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

# WhiteNoise with compression and immutable caching
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
WHITENOISE_MAX_AGE = 86400  # 1 day
WHITENOISE_IMMUTABLE_FILES = True

# ---------------------------------------------------------------------------
# REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
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
EMAIL_HOST = "smtp.sendgrid.net"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "apikey"  # literal
EMAIL_HOST_PASSWORD = os.getenv("SENDGRID_API_KEY")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "info@tickflowcapital.com")
DEFAULT_FROM_NAME = os.getenv("DEFAULT_FROM_NAME", "Tickflow Sentiment")

# If no password, fallback to console (with warning)
if not EMAIL_HOST_PASSWORD:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning("SENDGRID_API_KEY not set – using console email backend for development.")
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

# CSRF trusted origins – same as CORS
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()

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
                'IGNORE_EXCEPTIONS': True,
                'MAX_ENTRIES': 1000,
                'CULL_FREQUENCY': 3,
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
SENTRY_SEND_PII = os.getenv("SENTRY_SEND_PII", "true").lower() == "true"
SENTRY_ATTACH_STACKTRACE = os.getenv("SENTRY_ATTACH_STACKTRACE", "true").lower() == "true"
SENTRY_ENABLE_TRACING = os.getenv("SENTRY_ENABLE_TRACING", "true").lower() == "true"
SENTRY_ENABLE_PROFILING = os.getenv("SENTRY_ENABLE_PROFILING", "true").lower() == "true"
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

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
    'model_name': 'distilbert-base-uncased-finetuned-sst-2-english',
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
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "apidojo-yahoo-finance-v1.p.rapidapi.com")
TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY")
STATIC_API_KEY = os.getenv("STATIC_API_KEY", None)  # fallback for development

# Rate limiting for external calls
RATE_LIMIT_PERIOD = 60
RATE_LIMIT_MAX_REQUESTS = 100

# LSTM model
ENABLE_LSTM = True
LSTM_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'stock_prediction_model.pth')

# Other
APPEND_SLASH = True
EMAIL_VERIFICATION_EXPIRY_HOURS = 24

# ---------------------------------------------------------------------------
# API documentation (drf-spectacular)
# ---------------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    'TITLE': 'Sentiment-Driven Stock Prediction API',
    'DESCRIPTION': 'Real-time stock analysis, sentiment, and LSTM forecasts.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}