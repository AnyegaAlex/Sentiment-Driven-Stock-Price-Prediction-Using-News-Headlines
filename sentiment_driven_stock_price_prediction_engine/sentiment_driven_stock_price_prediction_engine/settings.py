"""
Django settings for sentiment_driven_stock_price_prediction_engine project.
Production-ready for Render free tier – lightweight, no Celery, minimal memory.
"""
from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

# Load environment variables first
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Hugging Face cache directory (persistent across deploys) ---
os.environ['TRANSFORMERS_CACHE'] = '/opt/render/.cache/huggingface'
os.environ['HF_HOME'] = '/opt/render/.cache/huggingface'

# --- Security: Secret Key ---
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured("SECRET_KEY environment variable is not set.")

# --- Debug & Hosts ---
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
BASE_ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split()
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"] + BASE_ALLOWED_HOSTS

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

    # Local apps
    'authentication',
    'news',
    'stocks',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
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
# Render's PostgreSQL requires SSL - enforce it for production
database_url = os.environ.get('DATABASE_URL')

if database_url:
    DATABASES = {
        'default': dj_database_url.config(
            default=database_url,
            conn_max_age=600,
            ssl_require=True  # Force SSL connection for Render PostgreSQL
        )
    }
else:
    # Fallback to SQLite for local development
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
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
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
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Sentiment-Driven Stock Prediction API',
    'DESCRIPTION': 'Real-time stock analysis, sentiment, and LSTM forecasts.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# --- CORS ---
# Get frontend URL from environment (default to Vercel URL)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://sentiment-driven-stock-price-predic.vercel.app')
CORS_ORIGIN_ALLOW_ALL = False
CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
CORS_ALLOW_METHODS = [
    'GET',
    'POST',
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
]
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]

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
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
        'file': {
            'class': 'logging.FileHandler',
            'filename': LOG_DIR / 'app.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}

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

# --- Rate Limiting (external) ---
RATE_LIMIT_PERIOD = 60  # 60 seconds
RATE_LIMIT_MAX_REQUESTS = 100  # Max requests per minute

ENABLE_LSTM = True
LSTM_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'stock_prediction_model.pth')

# Security Headers
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True