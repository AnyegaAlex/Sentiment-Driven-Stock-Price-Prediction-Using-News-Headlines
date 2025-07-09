# Use Python 3.10 slim image
FROM python:3.10-slim

# Set environment variables
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=sentiment_driven_stock_price_prediction_engine.settings \
    CELERY_WORKER_CONCURRENCY=2 \
    CELERY_MAX_TASKS_PER_CHILD=50 \
    CELERYD_MAX_MEMORY_PER_CHILD=256000 \
    OMP_NUM_THREADS=1 \
    CELERYD_PREFETCH_MULTIPLIER=1

# Set working directory
WORKDIR /app

# Install system dependencies required for Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    procps \
    && rm -rf /var/lib/apt/lists/*


# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn psutil 

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p /app/{staticfiles,logs,media}


# Optional but recommended
EXPOSE 8000

# Main application and Celery worker launch script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]