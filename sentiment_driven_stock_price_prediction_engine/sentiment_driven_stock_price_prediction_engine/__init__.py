from __future__ import absolute_import, unicode_literals

# This ensures the app is always imported when
# Django starts so that shared tasks will use it
from .celery_app import app as celery_app

__all__ = ('celery_app',)