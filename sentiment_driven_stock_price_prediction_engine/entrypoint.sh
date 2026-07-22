#!/bin/bash
set -e

# Create necessary directories
mkdir -p /app/logs /app/staticfiles /app/media
touch /app/logs/app.log

echo "=========================================="
echo "Tickflow Sentiment - Starting up..."
echo "=========================================="

# Wait for database to be ready
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    sleep 5  # Give database time to initialize
fi

# ✅ RUN MIGRATIONS FIRST
echo "Running migrations..."
python manage.py migrate --noinput

# Create superuser if environment variables are set
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput \
        --username "$DJANGO_SUPERUSER_USERNAME" \
        --email "$DJANGO_SUPERUSER_EMAIL" 2>/dev/null || echo "Superuser already exists"
fi

# ✅ Generate API key AFTER migrations
echo "Checking for API key..."
python manage.py shell << 'EOF'
import os
from django.contrib.auth import get_user_model
from authentication.models import UserAPIKey

User = get_user_model()

# Get or create admin user
admin_user = User.objects.filter(is_superuser=True).first()
if not admin_user:
    print("No admin user found. Creating default admin...")
    admin_user = User.objects.create_superuser(
        username=os.environ.get('ADMIN_USERNAME', 'admin'),
        email=os.environ.get('ADMIN_EMAIL', 'admin@tickflow.com'),
        password=os.environ.get('ADMIN_PASSWORD', 'changeme123')
    )
    print(f"✅ Default admin user created: {admin_user.username}")

# Check if API key exists
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
EOF

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Static files collection skipped"

# Start Gunicorn
echo "=========================================="
echo "Starting Gunicorn on port ${PORT:-10000}..."
echo "=========================================="
exec gunicorn \
    --workers=1 \
    --threads=2 \
    --timeout=90 \
    --bind 0.0.0.0:${PORT:-10000} \
    --log-file - \
    sentiment_driven_stock_price_prediction_engine.wsgi:application