from __future__ import absolute_import, unicode_literals
from celery.schedules import crontab
import os
from celery import Celery

# Set the default Django settings module for Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sentiment_driven_stock_price_prediction_engine.settings')

app = Celery('sentiment_driven_stock_price_prediction_engine')

# Load task modules from all registered apps
app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

# Warm up the model when Celery starts
@app.on_after_configure.connect
def warmup_model_on_startup(sender, **kwargs):
    from news.finbert_sentiment import warmup_model
    warmup_model()

#Celery Beat for Periodic Execution
app.conf.beat_schedule = {
    'fetch_news_every_hour': {
        'task': 'news.tasks.fetch_news_for_all_symbols',
        'schedule': crontab(minute=0, hour='*/2'),  # Runs every 2hours
    },
}

# Auto-discover tasks from all installed Django apps
app.autodiscover_tasks()