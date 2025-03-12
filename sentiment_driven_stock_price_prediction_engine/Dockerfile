# Use Python 3.10 slim image
FROM python:3.10-slim

# Set environment variables
ENV PIP_ROOT_USER_ACTION=ignore
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

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

# Collect static files (required for Django production)
RUN python manage.py collectstatic --noinput

# Run application (with Render-compatible settings)
CMD gunicorn \
    --workers 2 \
    --timeout 120 \
    --worker-tmp-dir /dev/shm \
    --bind 0.0.0.0:${PORT:-8000} \
    sentiment_driven_stock_price_prediction_engine.wsgi:application