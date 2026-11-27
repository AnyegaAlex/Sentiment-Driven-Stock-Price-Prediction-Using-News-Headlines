#!/bin/bash
set -e

# Performance environment variables (must be set early)
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
export TRANSFORMERS_CACHE=/app/.cache/huggingface

# ============================================================
# Configuration (hardcoded for low memory)
# ============================================================
APP_USER="appuser"
APP_GROUP="appuser"
LOG_DIR="/app/logs"
STATIC_DIR="/app/staticfiles"
MEDIA_DIR="/app/media"
GUNICORN_WORKERS=1        # Force 1 worker
GUNICORN_THREADS=1        # Force 1 thread
GUNICORN_TIMEOUT=300      # 5 minutes
PORT="${PORT:-10000}"

mkdir -p "$LOG_DIR" "$STATIC_DIR" "$MEDIA_DIR"
touch "$LOG_DIR/app.log"
chown -R "$APP_USER:$APP_GROUP" /app

echo "=========================================="
echo "Tickflow Intelligence - Starting up..."
echo "=========================================="

# Startup checks
# 1. Configuration: a settings or import error will not fix itself by waiting,
#    so fail immediately and show the real error instead of retrying.
# 2. Database: retry for connectivity only, and show the last error on failure.
if [ -n "$DATABASE_URL" ]; then
    echo "Checking Django configuration..."
    if ! CONFIG_OUT=$(python manage.py check 2>&1); then
        echo "ERROR: Django configuration check failed. Not retrying. Fix the configuration and redeploy."
        echo "$CONFIG_OUT" | tail -n 30
        exit 1
    fi

    echo "Waiting for database..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    until DB_OUT=$(python manage.py check --database default 2>&1); do
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            echo "ERROR: Database not available after $MAX_RETRIES attempts. Last error:"
            echo "$DB_OUT" | tail -n 20
            exit 1
        fi
        echo "Database not ready (attempt $RETRY_COUNT/$MAX_RETRIES): $(echo "$DB_OUT" | tail -n 1)"
        sleep 2
    done
    echo "Database is ready."
fi

echo "Running migrations..."
if ! timeout 120 python manage.py migrate --noinput; then
    echo "Migration timed out. Retrying after 10s..."
    sleep 10
    timeout 120 python manage.py migrate --noinput || echo "Migration failed – check logs."
fi

echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Static files collection skipped"

# Superuser creation REMOVED – do it manually if needed

echo "=========================================="
echo "Starting Gunicorn on port $PORT..."
echo "=========================================="

exec su -c "gunicorn \
    --workers=1 \
    --threads=1 \
    --timeout=300 \
    --bind 0.0.0.0:$PORT \
    --log-file - \
    sentiment_driven_stock_price_prediction_engine.wsgi:application" -s /bin/bash "$APP_USER"