from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sentiment_driven_stock_price_prediction_engine.settings')

app = Celery('sentiment_analysis')  # Shorter app name recommended

# Configuration
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Model Warmup
@app.on_after_configure.connect
def warmup_model_on_startup(sender, **kwargs):
    try:
        from news.utils import warmup_model
        warmup_model()
    except ImportError as e:
        app.logger.error(f"Model warmup failed: {str(e)}")

# Periodic Tasks
app.conf.beat_schedule = {
    'fetch_news_every_hour': {
        'task': 'news.tasks.fetch_news_for_all_symbols',
        'schedule': crontab(minute=0, hour='*/2'),
        'options': {'queue': 'periodic'}
    },
    'calculate_metrics_daily': {
        'task': 'sentiment_driven_stock_price_prediction_engine.celery_app.calculate_performance_metrics',
        'schedule': crontab(minute=0, hour=0),  # Midnight
        'options': {'queue': 'metrics'}
    }
}

# Task Implementation
@app.task(bind=True, name='calculate_performance_metrics')
def calculate_performance_metrics(self):
    """Calculate and store model performance metrics"""
    try:
        from .models import PredictionRecord, ModelPerformance
        
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
            prediction_count=len(records)
        )
    except Exception as e:
        self.retry(exc=e, countdown=60)  # Retry after 1 minute