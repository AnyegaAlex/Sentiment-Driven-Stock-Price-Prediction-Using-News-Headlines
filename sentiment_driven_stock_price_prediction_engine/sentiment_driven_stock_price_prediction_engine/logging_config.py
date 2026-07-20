"""
Enhanced logging configuration with structured JSON logging.
Supports both development (console) and production (JSON) formats.
"""

import logging
import json
import time
from pythonjsonlogger import jsonlogger
from django.conf import settings


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter with additional fields.
    """
    
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        if not log_record.get('timestamp'):
            log_record['timestamp'] = time.time()
        
        # Add level
        if not log_record.get('level'):
            log_record['level'] = record.levelname
        
        # Add logger name
        if not log_record.get('logger'):
            log_record['logger'] = record.name
        
        # Add module and line number
        if not log_record.get('module'):
            log_record['module'] = record.module
            log_record['line_number'] = record.lineno
        
        # Add request ID if available (from middleware)
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id
        
        # Add user ID if available
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id
        
        # Add trace ID if available
        if hasattr(record, 'trace_id'):
            log_record['trace_id'] = record.trace_id


class ContextLogger:
    """
    Context-aware logger that adds request/user context to logs.
    """
    
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        self.extra = {}
    
    def bind(self, **kwargs):
        """Bind extra context to the logger."""
        self.extra.update(kwargs)
        return self
    
    def _log(self, level, msg, *args, **kwargs):
        """Internal logging method with context."""
        extra = kwargs.get('extra', {})
        extra.update(self.extra)
        kwargs['extra'] = extra
        getattr(self.logger, level)(msg, *args, **kwargs)
    
    def debug(self, msg, *args, **kwargs):
        self._log('debug', msg, *args, **kwargs)
    
    def info(self, msg, *args, **kwargs):
        self._log('info', msg, *args, **kwargs)
    
    def warning(self, msg, *args, **kwargs):
        self._log('warning', msg, *args, **kwargs)
    
    def error(self, msg, *args, **kwargs):
        self._log('error', msg, *args, **kwargs)
    
    def critical(self, msg, *args, **kwargs):
        self._log('critical', msg, *args, **kwargs)


def get_logger(name):
    """Get a context-aware logger."""
    return ContextLogger(name)