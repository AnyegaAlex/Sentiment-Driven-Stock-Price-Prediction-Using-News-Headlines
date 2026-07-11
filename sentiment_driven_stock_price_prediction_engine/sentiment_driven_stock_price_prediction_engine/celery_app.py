from __future__ import absolute_import, unicode_literals

import os
from celery import Celery

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "sentiment_driven_stock_price_prediction_engine.settings"
)

app = Celery("sentiment_driven_stock_price_prediction_engine")

# Read CELERY_* from Django settings.py
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Worker safety defaults (fine for Render-style deploys)
app.conf.update(
    worker_max_tasks_per_child=50,
    worker_max_memory_per_child=800000,  # KB (~800MB)
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    broker_pool_limit=10,
)