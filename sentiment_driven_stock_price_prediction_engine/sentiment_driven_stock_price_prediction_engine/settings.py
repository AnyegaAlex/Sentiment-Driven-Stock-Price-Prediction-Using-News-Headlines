"""
Django settings for sentiment_driven_stock_price_prediction_engine project.
Production-ready for Render free tier – lightweight, no Celery, minimal memory.
"""
from pathlib import Path
import os
import logging
from dotenv import load_dotenv
import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from .logging_config import CustomJsonFormatter

# Load environment variables first
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'
BASE_DIR = Path(__file__).resolve().parent.parent

# Determine if we're in production (use JSON logs)
USE_JSON_LOGS = os.getenv('USE_JSON_LOGS', 'false').lower() == 'true'

# --- Hugging Face cache directory (persistent across deploys) ---
os.environ['TRANSFORMERS_CACHE'] = str(BASE_DIR / '.cache' / 'huggingface')
os.environ['HF_HOME'] = str(BASE_DIR / '.cache' / 'huggingface')

# --- Security: Secret Key ---
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured("SECRET_KEY environment variable is not set.")

# --- Debug & Hosts ---
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# --- Database Connection Settings ---
# Prevent connection issues on Render free tier
CONN_MAX_AGE = 0  # Close connections after each request
CONN_HEALTH_CHECKS = True  # Check connection health before using

# ALLOWED_HOSTS - combine environment variable with required defaults
env_hosts = os.getenv("ALLOWED_HOSTS", "").split(",")
env_hosts = [h.strip() for h in env_hosts if h.strip()]

# Always allow these hosts (Render requires these)
required_hosts = [
    "localhost",
    "127.0.0.1", 
    "0.0.0.0",
    "sentiment-driven-stock-price-prediction.onrender.com",
    ".onrender.com",  # Allows any Render subdomain
]

# Combine and remove duplicates
ALLOWED_HOSTS = list(set(required_hosts + env_hosts))

# --- Paths ---
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    

    # Third-party apps
    'rest_framework',
    'corsheaders',
    'django_redis',  # for Redis cache
    'drf_spectacular',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist', 

    # Local apps
    'authentication',
    'news',
    'stocks',
    'health',
]

AUTH_USER_MODEL = 'authentication.User'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'authentication.middleware.RequestLoggingMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    # Custom: Security & Authentication (Order matters: Deprecation can be before or after auth)
    'authentication.middleware.APIKeyMiddleware',      # Auth
    'authentication.middleware.RateLimitHeadersMiddleware', # Headers after auth
    'authentication.middleware.DeprecationMiddleware', # Headers
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

# --- Database ---
import urllib.parse

database_url = os.environ.get('DATABASE_URL')

if database_url:
    # Parse the URL
    parsed = urllib.parse.urlparse(database_url)
    
    # Convert postgres:// to postgresql://
    if parsed.scheme == 'postgres':
        database_url = database_url.replace('postgres://', 'postgresql://')
    
    # Add sslmode=require
    if '?' in database_url:
        if 'sslmode' not in database_url:
            database_url += '&sslmode=require'
    else:
        database_url += '?sslmode=require'
    
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path[1:],
            'USER': parsed.username,
            'PASSWORD': parsed.password,
            'HOST': parsed.hostname,
            'PORT': parsed.port or 5432,
            'CONN_MAX_AGE': 0,  # Close connections after each request
            'OPTIONS': {
                'sslmode': 'require',
                'connect_timeout': 10,
            },
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- Static Files ---
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Whitenoise compression for all environments
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
WHITENOISE_MAX_AGE = 86400
WHITENOISE_IMMUTABLE_FILES = True

# --- Security (Prod Only) ---
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# --- REST Framework ---
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny', 
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'authentication.throttles.APIKeyRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'apikey': '200/minute'  # Per API key
    },
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # JWT first
        'authentication.authentication.APIKeyAuthentication',        # API key fallback
    ],

    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# JWT settings
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

# ============================================================
# EMAIL CONFIGURATION (SendGrid SMTP)
# ============================================================

# Use Django's built-in SMTP backend with SendGrid
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.sendgrid.net"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "apikey"  # Literally the string "apikey" - this is required
EMAIL_HOST_PASSWORD = os.getenv("SENDGRID_API_KEY")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "info@tickflowcapital.com")
DEFAULT_FROM_NAME = os.getenv("DEFAULT_FROM_NAME", "Tickflow Sentiment")

logger = logging.getLogger(__name__)

EMAIL_VERIFICATION_EXPIRY_HOURS = 24  # Token expires in 24 hours

# Fallback to console if no SendGrid key (development)
if not EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    logger.warning("No SendGrid API key found – using console email backend")


SPECTACULAR_SETTINGS = {
    'TITLE': 'Sentiment-Driven Stock Prediction API',
    'DESCRIPTION': 'Real-time stock analysis, sentiment, and LSTM forecasts.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# ============================================================
# CORS CONFIGURATION (Production-Ready)
# ============================================================

FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://sentiment-driven-stock-price-predic.vercel.app')

# Allow our frontend domains
CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "https://sentiment-driven-stock-price-predic.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_ALL_ORIGINS = False

# ✅ Allow credentials (JWT tokens in Authorization header)
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
    'HEAD',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-api-key',
    'x-request-id',
]

# Expose headers to frontend
CORS_EXPOSE_HEADERS = [
    'content-disposition',
    'x-request-id',
]

# Cache preflight requests for 1 day
CORS_PREFLIGHT_MAX_AGE = 86400

# CSRF Trusted Origins (same as CORS)
CSRF_TRUSTED_ORIGINS = [
    FRONTEND_URL,
    "https://sentiment-driven-stock-price-predic.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# --- Default primary key ---
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Memory & Session ---
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 2  # 2MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 2  # 2MB
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

# --- Caching Configuration (Redis with Fallback) ---
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
                'IGNORE_EXCEPTIONS': True,  # Fail silently if Redis is down
                'MAX_ENTRIES': 1000,
                'CULL_FREQUENCY': 3,
            },
            'KEY_PREFIX': 'sentiment_analysis',
        }
    }
else:
    # Fallback to local memory cache
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }

# --- Logging ---
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            '()': CustomJsonFormatter,
            'format': '%(level)s %(timestamp)s %(logger)s %(module)s %(line_number)s %(message)s %(request_id)s %(user_id)s %(trace_id)s',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json' if USE_JSON_LOGS else 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': LOG_DIR / 'app.log',
            'formatter': 'json' if USE_JSON_LOGS else 'verbose',
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
        'authentication': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'stocks': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'news': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

MIDDLEWARE.insert(0, 'authentication.middleware.RequestLoggingMiddleware')

# --- Sentiment Model (Lightweight) ---
FINBERT_CONFIG = {
    'model_name': 'distilbert-base-uncased-finetuned-sst-2-english',  # memory-safe
    'min_text_length': 25,
    'max_text_length': 1500,
    'confidence_threshold': 0.45,
    'model_options': {
        'device_map': 'auto',
        'low_cpu_mem_usage': True,
        'torch_dtype': 'auto'
    },
    'circuit_breaker': {
        'failure_threshold': 5,
        'recovery_timeout': 300
    }
}

# --- API Keys ---
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "apidojo-yahoo-finance-v1.p.rapidapi.com")
TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY")  
# Static API key fallback (for Render environment variable)
STATIC_API_KEY = os.getenv("STATIC_API_KEY", None)

# --- Rate Limiting (external) ---
RATE_LIMIT_PERIOD = 60  # 60 seconds
RATE_LIMIT_MAX_REQUESTS = 100  # Max requests per minute

ENABLE_LSTM = True
LSTM_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'stock_prediction_model.pth')


# ============================================================
# SENTRY CONFIGURATION (Phase 0 – Critical Infrastructure)
# ============================================================

SENTRY_DSN = os.getenv("SENTRY_DSN", "")
SENTRY_TRACES_SAMPLE_RATE = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
SENTRY_PROFILES_SAMPLE_RATE = float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1"))
SENTRY_ENVIRONMENT = os.getenv("SENTRY_ENVIRONMENT", "production")
SENTRY_RELEASE = os.getenv("SENTRY_RELEASE", None)

# Initialize Sentry if DSN is configured
if SENTRY_DSN:
    try:
        from .sentry_config import init_sentry
        init_sentry()
    except ImportError:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning("sentry_config.py not found – Sentry initialization skipped")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Sentry initialization failed: {e}")


APPEND_SLASH = True