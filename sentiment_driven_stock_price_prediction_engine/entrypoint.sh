#!/bin/bash
set -e

# ============================================================
# Configuration
# ============================================================
APP_USER="appuser"
APP_GROUP="appuser"
LOG_DIR="/app/logs"
STATIC_DIR="/app/staticfiles"
MEDIA_DIR="/app/media"
GUNICORN_WORKERS="${GUNICORN_WORKERS:-1}"
GUNICORN_THREADS="${GUNICORN_THREADS:-2}"
GUNICORN_TIMEOUT="${GUNICORN_TIMEOUT:-90}"
PORT="${PORT:-10000}"

# ============================================================
# Create necessary directories and set ownership
# ============================================================
mkdir -p "$LOG_DIR" "$STATIC_DIR" "$MEDIA_DIR"
touch "$LOG_DIR/app.log"
chown -R "$APP_USER:$APP_GROUP" /app

echo "=========================================="
echo "Tickflow Intelligence - Starting up..."
echo "=========================================="

# ============================================================
# Wait for database to be ready (if DATABASE_URL is set)
# ============================================================
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

# ============================================================
# Run migrations and collect static files
# ============================================================
echo "Running migrations..."
# Temporary workaround: skip migration 0002 (stuck) and continue
python manage.py migrate authentication 0002 --fake 2>/dev/null || true
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Static files collection skipped"

# ============================================================
# Create superuser only if explicit environment variables are set
# ============================================================
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput \
        --username "$DJANGO_SUPERUSER_USERNAME" \
        --email "$DJANGO_SUPERUSER_EMAIL" 2>/dev/null || echo "Superuser already exists"
else
    echo "Skipping superuser creation (missing environment variables)."
fi

# ============================================================
# Generate API key (if admin user exists)
# ============================================================
echo "Checking for API key..."
python manage.py shell << 'EOF'
import os
from django.contrib.auth import get_user_model
from authentication.models import UserAPIKey

User = get_user_model()
admin_user = User.objects.filter(is_superuser=True).first()
if admin_user:
    existing_key = UserAPIKey.objects.filter(user=admin_user, is_active=True).first()
    if existing_key:
        print(f"✅ Existing API Key: {existing_key.name}")
    else:
        key_obj, raw_key = UserAPIKey.create_key(admin_user, "Production Frontend")
        print("=" * 60)
        print("🔑 NEW API KEY GENERATED")
        print("=" * 60)
        print(f"   Name: {key_obj.name}")
        print(f"   Key:  {raw_key}")
        print("=" * 60)
        print("⚠️  IMPORTANT: Save this key now.")
        print("   Add to environment: API_KEY=" + raw_key)
        print("=" * 60)
else:
    print("ℹ️  No admin user found – skipping API key generation.")
EOF

# ============================================================
# Start Gunicorn as the non‑root user
# ============================================================
echo "=========================================="
echo "Starting Gunicorn on port $PORT..."
echo "=========================================="

# Use `exec` to replace the shell with Gunicorn, running as appuser
exec su -c "gunicorn \
    --workers=$GUNICORN_WORKERS \
    --threads=$GUNICORN_THREADS \
    --timeout=$GUNICORN_TIMEOUT \
    --bind 0.0.0.0:$PORT \
    --log-file - \
    sentiment_driven_stock_price_prediction_engine.wsgi:application" -s /bin/bash "$APP_USER"