# Use Python 3.10 slim image
FROM python:3.10-slim

# Set environment variables
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=sentiment_driven_stock_price_prediction_engine.settings

# Install system dependencies required for Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create the logs directory
RUN mkdir -p /app/logs

# Create required directories
RUN mkdir -p /app/{staticfiles,logs}

# Conditional collectstatic (only in production)
ARG BUILD_ENV=production
RUN if [ "$BUILD_ENV" = "production" ]; then \
      python manage.py collectstatic --noinput; \
    fi


# Run application
CMD ["gunicorn", \
    "--workers", "2", \
    "--timeout", "120", \
    "--worker-tmp-dir", "/dev/shm", \
    "--bind", "0.0.0.0:${PORT:-8000}", \
    "--log-file", "-", \
    "sentiment_driven_stock_price_prediction_engine.wsgi:application"]