"""
Django settings for sentiment_driven_stock_price_prediction_engine project.
"""
from pathlib import Path
import os
from dotenv import load_dotenv
import dj_database_url
from celery.schedules import crontab
from django.core.exceptions import ImproperlyConfigured

# Load environment variables first
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'
BASE_DIR = Path(__file__).resolve().parent.parent

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
    'django_celery_beat',
    'django_celery_results',
    'rest_framework',
    'corsheaders',
    'drf_yasg',

    # Local apps
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
# Always use dj_database_url; it falls back to SQLite only if DATABASE_URL is missing.
# Removed the conditional override that could inadvertently switch to SQLite in production.
DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///db.sqlite3',
        conn_max_age=600,
    )
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

# Use Whitenoise compression in all environments (safe and beneficial)
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
# Default: allow read-only for unauthenticated, but we'll set AllowAny on specific views.
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}

# --- CORS ---
CORS_ORIGIN_ALLOW_ALL = False
CORS_ALLOWED_ORIGINS = [
    "https://sentiment-driven-stock-price-predic.vercel.app"
]
# Allow POST for subscription endpoint
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
CSRF_TRUSTED_ORIGINS = [
    "https://sentiment-driven-stock-price-predic.vercel.app"
]

# --- Default primary key ---
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Memory & Session ---
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 2  # 2MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 2  # 2MB
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

# --- Celery Configuration ---
CELERY_IMPORTS = ('news.tasks', 'stocks.tasks')
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# Celery memory limits
CELERYD_MAX_MEMORY_PER_CHILD = 256000  # 256MB
CELERYD_FORCE_EXECV = True
CELERY_WORKER_MAX_TASKS_PER_CHILD = 100
CELERY_WORKER_MAX_MEMORY_MB = 512
CELERY_TASK_SOFT_TIME_LIMIT = 300
CELERY_TASK_TIME_LIMIT = 600

CELERY_TASK_ANNOTATIONS = {
    'news.tasks.fetch_and_process_news': {'rate_limit': '5/m'},
    'stocks.tasks.fetch_stock_data': {'rate_limit': '10/m'},
}
CELERY_TASK_ROUTES = {
    'news.tasks.*': {'queue': 'news'},
    'stocks.tasks.*': {'queue': 'stocks'},
    '*.fetch_*': {'queue': 'periodic'},
    '*.calculate_*': {'queue': 'metrics'},
}

CELERY_BEAT_SCHEDULE = {
    'process-news-every-hour': {
        'task': 'news.tasks.fetch_news_for_all_symbols',
        'schedule': crontab(minute=0),  # hourly
        'options': {'queue': 'periodic'},
    },
}

# --- Caching Configuration ---
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/1'),
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

# --- FinBERT Config ---
FINBERT_CONFIG = {
    'model_name': 'ProsusAI/finbert',
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

# --- Rate Limiting ---
RATE_LIMIT_PERIOD = 60  # 60 seconds
RATE_LIMIT_MAX_REQUESTS = 100  # Max requests per minute

# Path to LSTM model file
LSTM_MODEL_PATH = os.path.join(BASE_DIR, 'models', 'stock_prediction_model.pth')