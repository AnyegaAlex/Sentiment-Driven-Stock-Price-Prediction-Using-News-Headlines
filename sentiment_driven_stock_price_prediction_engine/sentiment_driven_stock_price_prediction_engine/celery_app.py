from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
import gc  # For manual garbage collection

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sentiment_driven_stock_price_prediction_engine.settings')

app = Celery('sentiment_analysis')  # Shorter app name recommended

# Configuration
# Memory-Optimized Configuration
app.conf.update(
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks to prevent leaks
    worker_max_memory_per_child=800000,  # 800MB per worker (in KB)
    task_acks_late=True,  # Prevents losing tasks during crashes
    task_reject_on_worker_lost=True,
    task_track_started=True,
    broker_pool_limit=10,  # Reduced connection pool size
)

app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Model Warmup
@app.on_after_configure.connect
def warmup_model_on_startup(sender, **kwargs):
    try:
        from news.utils import warmup_model
        warmup_model()
        gc.collect()
    except ImportError as e:
        app.logger.error(f"Model warmup failed: {str(e)}")

# Periodic Tasks
app.conf.beat_schedule = {
    'fetch_news_every_hour': {
        'task': 'news.tasks.fetch_news_for_all_symbols',
        'schedule': crontab(minute=0, hour='*/2'),
        'options': {
            'queue': 'periodic',
            'expires': 3600,  # Expire if not run within 1 hour
            'time_limit': 300,  # 5 minute timeout
        }
    },
    'calculate_metrics_daily': {
        'task': 'sentiment_driven_stock_price_prediction_engine.celery_app.calculate_performance_metrics',
        'schedule': crontab(minute=0, hour=0),  # Midnight
        'options': {
            'queue': 'metrics',
            'time_limit': 600,  # 10 minute timeout
            'soft_time_limit': 480,  # 8 minute soft limit
        }
    }
}

# Task Implementation
# Optimized Performance Metrics Task
@app.task(
    bind=True,
    name='calculate_performance_metrics',
    autoretry_for=(Exception,),
    max_retries=3,
    retry_backoff=60
)
def calculate_performance_metrics(self):
    """Calculate and store model performance metrics"""
    try:
        from .models import PredictionRecord, ModelPerformance
        from django.db import connection
        
        # Process in batches to reduce memory
        batch_size = 200
        metrics = {
            'y_true': [],
            'y_pred': [],
            'count': 0
        }
        
        queryset = PredictionRecord.objects.filter(
            actual_outcome__isnull=False
        ).order_by('-created_at').values_list('actual_outcome', 'prediction')
        
        for i in range(0, queryset.count(), batch_size):
            batch = queryset[i:i+batch_size]
            metrics['y_true'].extend([item[0] for item in batch])
            metrics['y_pred'].extend([item[1] for item in batch])
            metrics['count'] += len(batch)
            
            # Clear memory between batches
            del batch
            gc.collect()
        
        if metrics['count'] == 0:
            return
        
        # Create performance record
        ModelPerformance.objects.create(
            accuracy=accuracy_score(metrics['y_true'], metrics['y_pred']),
            f1_score=f1_score(metrics['y_true'], metrics['y_pred'], pos_label='UP'),
            precision=precision_score(metrics['y_true'], metrics['y_pred'], pos_label='UP'),
            recall=recall_score(metrics['y_true'], metrics['y_pred'], pos_label='UP'),
            prediction_count=metrics['count']
        )
        
        # Clean up
        connection.close()
        del metrics
        gc.collect()
        
    except Exception as e:
        self.retry(exc=e, countdown=60)