#!/bin/bash

# Exit immediately if a command exits with non-zero status
set -e

# Start Celery worker in background if enabled
if [ "$ENABLE_CELERY" = "true" ]; then
    celery -A sentiment_driven_stock_price_prediction_engine worker \
        -Q news,stocks,periodic,metrics \
        --loglevel=info \
        --pool=prefork \
        --concurrency=${CELERY_WORKER_CONCURRENCY} \
        --max-tasks-per-child=${CELERY_MAX_TASKS_PER_CHILD} \
        --prefetch-multiplier=${CELERYD_PREFETCH_MULTIPLIER} \
        --without-mingle \
        --without-gossip &
fi

# Start Gunicorn
exec gunicorn \
    --workers ${GUNICORN_WORKERS:-2} \
    --timeout 120 \
    --worker-tmp-dir /dev/shm \
    --bind 0.0.0.0:${PORT:-8000} \
    --log-file - \
    sentiment_driven_stock_price_prediction_engine.wsgi:application