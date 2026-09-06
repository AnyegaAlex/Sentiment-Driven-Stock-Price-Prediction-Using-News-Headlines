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

# Wait for database
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    until python manage.py check --database default &>/dev/null || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
        RETRY_COUNT=$((RETRY_COUNT+1))
        echo "Database not ready (attempt $RETRY_COUNT/$MAX_RETRIES)..."
        sleep 2
    done
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "ERROR: Database not available after $MAX_RETRIES attempts."
        exit 1
    fi
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