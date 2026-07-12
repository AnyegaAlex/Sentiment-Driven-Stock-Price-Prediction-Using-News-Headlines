#!/bin/bash
set -e

# Create logs directory
mkdir -p /app/logs
touch /app/logs/app.log

echo "Starting entrypoint script..."

# Run migrations (continue even if they fail)
echo "Running migrations..."
python manage.py migrate --noinput || echo "⚠️ Migration failed – continuing anyway..."

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start Celery only if enabled and Celery is installed
if [ "$ENABLE_CELERY" = "true" ] && command -v celery &> /dev/null && [ -n "$REDIS_URL" ]; then
    echo "Starting Celery worker..."
    celery -A sentiment_driven_stock_price_prediction_engine worker \
        --loglevel=info \
        --pool=solo \
        --concurrency=1 \
        --max-tasks-per-child=50 &
else
    echo "Celery not enabled or not installed – skipping."
fi

# Start Gunicorn on Render's PORT (default 10000)
echo "Starting Gunicorn on port ${PORT:-10000}..."
exec gunicorn \
    --workers=1 \
    --threads=2 \
    --timeout=90 \
    --bind 0.0.0.0:${PORT:-10000} \
    --log-file - \
    sentiment_driven_stock_price_prediction_engine.wsgi:application