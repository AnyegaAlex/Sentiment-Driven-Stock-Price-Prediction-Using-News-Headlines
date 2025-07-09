#!/bin/bash

# Exit immediately if a command exits with non-zero status
set -e

# Optional: handle termination signals gracefully
trap 'echo "Stopping processes..."; kill -TERM "$PID" 2>/dev/null' TERM INT


# Start Celery worker in background if enabled
if [ "$ENABLE_CELERY" = "true" ]; then
    celery -A sentiment_driven_stock_price_prediction_engine worker \
        -Q news,stocks,periodic,metrics \
        --loglevel=info \
        --pool=prefork \
        --concurrency=${CELERY_WORKER_CONCURRENCY:-2} \
        --max-tasks-per-child=${CELERY_MAX_TASKS_PER_CHILD:-50} \
        --prefetch-multiplier=${CELERYD_PREFETCH_MULTIPLIER:-1} \
        --without-mingle \
        --without-gossip &
fi

# Start Gunicorn
echo "Starting Gunicorn on port ${PORT:-8000}..."
exec gunicorn \
    --workers ${GUNICORN_WORKERS:-2} \
    --timeout 120 \
    --worker-tmp-dir /dev/shm \
    --bind 0.0.0.0:${PORT:-8000} \
    --log-file - \
    sentiment_driven_stock_price_prediction_engine.wsgi:application