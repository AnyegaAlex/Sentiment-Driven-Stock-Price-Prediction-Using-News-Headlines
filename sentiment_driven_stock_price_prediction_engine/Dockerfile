# Use Python 3.10 slim image for minimal size
FROM python:3.10-slim

# Set environment variables
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=sentiment_driven_stock_price_prediction_engine.settings

# Optional Celery (if used) – remove if not needed
# ENV CELERY_WORKER_CONCURRENCY=2 \
#     CELERY_MAX_TASKS_PER_CHILD=50 \
#     CELERYD_MAX_MEMORY_PER_CHILD=256000 \
#     CELERYD_PREFETCH_MULTIPLIER=1

# Set working directory
WORKDIR /app

# Install system dependencies (only what is strictly required)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create a non‑root user to run the application
RUN adduser --disabled-password --no-create-home appuser

# Copy requirements first to leverage Docker cache
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn psutil \
    && rm -rf /root/.cache/pip

# Copy the rest of the application code
COPY . .

# Create required directories and set ownership
RUN mkdir -p /app/staticfiles /app/logs /app/media \
    && chown -R appuser:appuser /app

# Switch to non‑root user
USER appuser

# Healthcheck (optional – uncomment if you want Render to monitor)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#   CMD curl -f http://localhost:8000/api/v1/health/ || exit 1

# Expose the port Gunicorn will bind to
EXPOSE 8000

# Copy and set the entrypoint script
COPY entrypoint.sh /entrypoint.sh
# The entrypoint needs root to run migrations? Actually we can run as appuser but migrations need write access to DB, not files.
# We'll keep entrypoint as root for now if migrations need to run before switching user.
# Better: Run entrypoint as root, then use gosu or exec to drop privileges.
# Simpler: Keep as root, but we already switched to appuser above.
# We'll revert to root for entrypoint, then switch inside entrypoint if needed.
# So we need to re-run as root for entrypoint, then drop in the script.

# Since we already switched to appuser above, but entrypoint needs to run as root to do migrations, we'll change:
# We'll not switch user here; we'll do it in entrypoint.
# So remove the USER appuser line and instead use gosu in entrypoint.
# Let's revert to root for the image, and use a helper to drop privileges in entrypoint.

# Remove the USER line and instead install gosu or use su-exec.
# We'll use a simpler approach: entrypoint runs as root, runs migrations/collectstatic, then exec gunicorn as appuser.
# So we need to keep root.

# Remove the USER line above. Let's rewrite:
# We'll not create appuser in this layer; we'll do it in entrypoint.
# However, best practice is to create user in image. We'll do both.

# Let's redefine the image:

# --- Revised Dockerfile from here ---

FROM python:3.10-slim

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=sentiment_driven_stock_price_prediction_engine.settings

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create a non‑root user (will be used in entrypoint)
RUN adduser --disabled-password --no-create-home appuser

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn psutil \
    && rm -rf /root/.cache/pip

COPY . .

RUN mkdir -p /app/staticfiles /app/logs /app/media \
    && chown -R appuser:appuser /app

EXPOSE 8000

# Copy and make entrypoint executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]