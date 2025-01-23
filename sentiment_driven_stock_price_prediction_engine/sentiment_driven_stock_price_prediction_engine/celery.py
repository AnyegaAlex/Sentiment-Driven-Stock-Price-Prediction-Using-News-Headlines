from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

# Set the default Django settings module for Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sentiment_driven_stock_price_prediction_engine.settings')

app = Celery('sentiment_driven_stock_price_prediction_engine')

# Load task modules from all registered apps
app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()
