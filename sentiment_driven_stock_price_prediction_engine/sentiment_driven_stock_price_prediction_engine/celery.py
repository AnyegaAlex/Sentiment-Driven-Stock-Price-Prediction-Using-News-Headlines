from __future__ import absolute_import, unicode_literals
from celery.schedules import crontab
import os
from celery import Celery

# Set the default Django settings module for Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sentiment_driven_stock_price_prediction_engine.settings')

app = Celery('sentiment_driven_stock_price_prediction_engine')

# Load task modules from all registered apps using Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed Django apps
app.autodiscover_tasks()

# Warm up the FinBERT model when Celery starts
@app.on_after_configure.connect
def warmup_model_on_startup(sender, **kwargs):
    from news.utils import warmup_model  # Updated import: using utils instead of finbert_sentiment
    warmup_model()

# Celery Beat for Periodic Execution: schedule the news-fetch task every 2 hours
app.conf.beat_schedule = {
    'fetch_news_every_hour': {
        'task': 'news.tasks.fetch_news_for_all_symbols',
        'schedule': crontab(minute=0, hour='*/2'),  # Runs every 2 hours
    },
}


@app.task
def calculate_performance_metrics():
    from .models import PredictionRecord, ModelPerformance
    from sklearn.metrics import accuracy_score, f1_score
    
    records = PredictionRecord.objects.filter(
        actual_outcome__isnull=False
    ).order_by('-created_at')[:1000]
    
    if not records.exists():
        return
    
    y_true = [r.actual_outcome for r in records]
    y_pred = [r.prediction for r in records]
    
    ModelPerformance.objects.create(
        accuracy=accuracy_score(y_true, y_pred),
        f1_score=f1_score(y_true, y_pred, pos_label='UP'),
        precision=precision_score(y_true, y_pred, pos_label='UP'),
        recall=recall_score(y_true, y_pred, pos_label='UP'),
        prediction_count=len(records),
        sharpe_ratio=calculate_sharpe(records)
    )