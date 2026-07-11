#!/bin/bash
set -e

# Create logs directory
mkdir -p /app/logs
touch /app/logs/app.log

# Run migrations and collect static
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Only start Celery if explicitly enabled (and Redis is available)
if [ "$ENABLE_CELERY" = "true" ] && [ -n "$REDIS_URL" ]; then
    echo "Starting Celery worker..."
    celery -A sentiment_driven_stock_price_prediction_engine worker \
        --loglevel=info \
        --pool=solo \
        --concurrency=1 \
        --max-tasks-per-child=50 &
fi

# Start Gunicorn
echo "Starting Gunicorn on port ${PORT:-8000}..."
exec gunicorn \
    --workers=1 \
    --threads=2 \
    --timeout=90 \
    --bind 0.0.0.0:${PORT:-8000} \
    --log-file - \
    sentiment_driven_stock_price_prediction_engine.wsgi:application