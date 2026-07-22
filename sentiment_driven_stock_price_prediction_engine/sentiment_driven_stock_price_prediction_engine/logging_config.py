"""
Enhanced logging configuration with structured JSON logging.
Supports both development (console) and production (JSON) formats.

Features:
- Structured JSON logging for production
- Human-readable console logging for development
- Context-aware logging with request/user IDs
- Log rotation for production
- Performance metrics and timing
- Log sampling for high-volume endpoints
- Graceful fallback if dependencies missing
"""

import os
import sys
import logging
import json
import time
from logging.handlers import RotatingFileHandler
from typing import Optional, Dict, Any, Union
from functools import wraps

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

# ============================================================================
# IMPORTS WITH FALLBACK
# ============================================================================

try:
    from pythonjsonlogger import jsonlogger
    JSON_LOGGER_AVAILABLE = True
except ImportError:
    JSON_LOGGER_AVAILABLE = False
    # Fallback: simple JSON formatter
    class jsonlogger:
        class JsonFormatter(logging.Formatter):
            pass


# ============================================================================
# CONSTANTS
# ============================================================================

LOG_LEVEL_MAP = {
    'DEBUG': logging.DEBUG,
    'INFO': logging.INFO,
    'WARNING': logging.WARNING,
    'ERROR': logging.ERROR,
    'CRITICAL': logging.CRITICAL,
}

# High-volume endpoints to sample
HIGH_VOLUME_ENDPOINTS = [
    '/health/',
    '/healthz/',
    '/api/v1/health/',
    '/static/',
    '/media/',
]


# ============================================================================
# CUSTOM JSON FORMATTER
# ============================================================================

class CustomJsonFormatter(jsonlogger.JsonFormatter if JSON_LOGGER_AVAILABLE else logging.Formatter):
    """
    Custom JSON formatter with additional fields.
    
    Features:
    - Standardized log structure
    - Timestamp in ISO format
    - Request ID tracking
    - User ID tracking
    - Trace ID for distributed tracing
    - Performance metrics
    """
    
    def __init__(self, *args, **kwargs):
        # Rename fields for consistency
        self.rename_fields = {
            'asctime': 'timestamp',
            'levelname': 'level',
            'name': 'logger',
        }
        super().__init__(*args, **kwargs)
    
    def add_fields(self, log_record: Dict, record: logging.LogRecord, message_dict: Dict) -> None:
        """
        Add custom fields to the log record.
        
        Args:
            log_record: The log record dictionary
            record: The original logging record
            message_dict: Additional message data
        """
        # Always add core fields
        if not log_record.get('timestamp'):
            log_record['timestamp'] = time.time()
        
        if not log_record.get('level'):
            log_record['level'] = record.levelname
        
        if not log_record.get('logger'):
            log_record['logger'] = record.name
        
        if not log_record.get('module'):
            log_record['module'] = record.module
        
        # Add line number only for errors
        if record.levelno >= logging.WARNING:
            log_record['line_number'] = record.lineno
            if hasattr(record, 'exc_info') and record.exc_info:
                log_record['exception_type'] = record.exc_info[0].__name__
        
        # Add request context if available
        if hasattr(record, 'request_id') and record.request_id:
            log_record['request_id'] = record.request_id
        
        if hasattr(record, 'user_id') and record.user_id:
            log_record['user_id'] = record.user_id
        
        if hasattr(record, 'trace_id') and record.trace_id:
            log_record['trace_id'] = record.trace_id
        
        # Add performance metrics if available
        if hasattr(record, 'duration_ms') and record.duration_ms:
            log_record['duration_ms'] = record.duration_ms
        
        # Add endpoint information if available
        if hasattr(record, 'method') and record.method:
            log_record['method'] = record.method
        if hasattr(record, 'path') and record.path:
            log_record['path'] = record.path
        
        # Add sample rate if log is sampled
        if hasattr(record, 'sampled') and record.sampled:
            log_record['sampled'] = True
        
        # Add environment
        log_record['environment'] = getattr(settings, 'SENTRY_ENVIRONMENT', 'production')
        log_record['service'] = 'tickflow-sentiment'
        
        # Call parent to include any additional fields
        if hasattr(super(), 'add_fields'):
            super().add_fields(log_record, record, message_dict)


# ============================================================================
# HUMAN-READABLE FORMATTER
# ============================================================================

class HumanReadableFormatter(logging.Formatter):
    """
    Human-readable formatter for development.
    Includes colors for better readability.
    """
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[41m', # Red background
        'RESET': '\033[0m',     # Reset
    }
    
    def __init__(self, use_colors=True):
        self.use_colors = use_colors and sys.stdout.isatty()
        super().__init__()
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format the log record with colors.
        
        Args:
            record: The log record
            
        Returns:
            str: Formatted log message
        """
        # Add color
        if self.use_colors:
            color = self.COLORS.get(record.levelname, '')
            reset = self.COLORS['RESET']
            level = f"{color}{record.levelname}{reset}"
        else:
            level = record.levelname
        
        # Build log message
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
        logger_name = record.name
        
        # Get context
        context_parts = []
        if hasattr(record, 'request_id') and record.request_id:
            context_parts.append(f"request_id={record.request_id[:8]}")
        if hasattr(record, 'user_id') and record.user_id:
            context_parts.append(f"user_id={record.user_id}")
        if hasattr(record, 'duration_ms') and record.duration_ms:
            context_parts.append(f"duration={record.duration_ms:.2f}ms")
        
        context = f" [{', '.join(context_parts)}]" if context_parts else ""
        
        # Build the log line
        log_line = f"{timestamp} [{level}] {logger_name}{context}: {record.getMessage()}"
        
        # Add exception info if present
        if record.exc_info:
            log_line += f"\n{self.formatException(record.exc_info)}"
        
        return log_line


# ============================================================================
# LOG SAMPLING FILTER
# ============================================================================

class LogSamplingFilter(logging.Filter):
    """
    Filter that samples high-volume log records.
    
    Reduces log volume for high-traffic endpoints while
    preserving errors and warnings.
    """
    
    def __init__(self, sample_rate: float = 0.1):
        """
        Initialize the filter.
        
        Args:
            sample_rate: Sample rate for high-volume endpoints (0.0 to 1.0)
        """
        self.sample_rate = sample_rate
        self._counters = {}
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filter the log record based on sampling.
        
        Args:
            record: The log record
            
        Returns:
            bool: True if the record should be logged
        """
        # Always log errors and warnings
        if record.levelno >= logging.WARNING:
            return True
        
        # Check if this is a high-volume endpoint
        if hasattr(record, 'path') and record.path:
            path = record.path
            for endpoint in HIGH_VOLUME_ENDPOINTS:
                if path.startswith(endpoint):
                    # Sample the log
                    import random
                    return random.random() < self.sample_rate
        
        return True


# ============================================================================
# CONTEXT-AWARE LOGGER
# ============================================================================

class ContextLogger:
    """
    Context-aware logger that adds request/user context to logs.
    
    Usage:
        logger = ContextLogger('my_app')
        logger.bind(request_id='123', user_id='456').info('Processing request')
    """
    
    def __init__(self, name: str, extra: Optional[Dict] = None):
        """
        Initialize the context logger.
        
        Args:
            name: Logger name
            extra: Initial context data
        """
        self.logger = logging.getLogger(name)
        self.extra = extra or {}
    
    def bind(self, **kwargs) -> 'ContextLogger':
        """
        Bind extra context to the logger.
        
        Args:
            **kwargs: Context key-value pairs
            
        Returns:
            ContextLogger: Self for chaining
        """
        self.extra.update(kwargs)
        return self
    
    def unbind(self, *keys) -> 'ContextLogger':
        """
        Unbind context keys from the logger.
        
        Args:
            *keys: Keys to remove
            
        Returns:
            ContextLogger: Self for chaining
        """
        for key in keys:
            self.extra.pop(key, None)
        return self
    
    def _log(self, level: str, msg: str, *args, **kwargs) -> None:
        """
        Internal logging method with context.
        
        Args:
            level: Log level
            msg: Log message
            *args: Additional arguments
            **kwargs: Additional keyword arguments
        """
        # Extract special parameters
        exc_info = kwargs.pop('exc_info', None)
        stack_info = kwargs.pop('stack_info', False)
        extra = kwargs.pop('extra', {})
        
        # Merge context
        extra.update(self.extra)
        
        # Add to kwargs
        kwargs['extra'] = extra
        
        # Log with appropriate level
        log_method = getattr(self.logger, level)
        if exc_info is not None:
            log_method(msg, *args, exc_info=exc_info, stack_info=stack_info, **kwargs)
        else:
            log_method(msg, *args, stack_info=stack_info, **kwargs)
    
    def debug(self, msg: str, *args, **kwargs) -> None:
        self._log('debug', msg, *args, **kwargs)
    
    def info(self, msg: str, *args, **kwargs) -> None:
        self._log('info', msg, *args, **kwargs)
    
    def warning(self, msg: str, *args, **kwargs) -> None:
        self._log('warning', msg, *args, **kwargs)
    
    def error(self, msg: str, *args, **kwargs) -> None:
        self._log('error', msg, *args, **kwargs)
    
    def critical(self, msg: str, *args, **kwargs) -> None:
        self._log('critical', msg, *args, **kwargs)
    
    def exception(self, msg: str, *args, **kwargs) -> None:
        """Log an exception with traceback."""
        kwargs['exc_info'] = True
        self._log('error', msg, *args, **kwargs)


# ============================================================================
# LOGGER FACTORY
# ============================================================================

def get_logger(name: str, extra: Optional[Dict] = None) -> ContextLogger:
    """
    Get a context-aware logger.
    
    Args:
        name: Logger name (e.g., 'authentication', 'stocks')
        extra: Initial context data
        
    Returns:
        ContextLogger: Context-aware logger instance
        
    Example:
        logger = get_logger('authentication', {'service': 'api'})
        logger.bind(request_id='abc123').info('User logged in')
    """
    return ContextLogger(name, extra)


# ============================================================================
# PERFORMANCE LOGGING DECORATOR
# ============================================================================

def log_performance(logger_name: str = None):
    """
    Decorator to log function performance.
    
    Args:
        logger_name: Logger name (optional)
    
    Returns:
        Decorated function
    
    Example:
        @log_performance('stocks.analysis')
        def analyze_stock(symbol):
            # ... code ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = get_logger(logger_name or func.__module__)
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                logger.bind(
                    function=func.__name__,
                    duration_ms=round(duration_ms, 2),
                ).debug(f"{func.__name__} completed in {duration_ms:.2f}ms")
                
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                logger.bind(
                    function=func.__name__,
                    duration_ms=round(duration_ms, 2),
                ).error(f"{func.__name__} failed after {duration_ms:.2f}ms: {e}", exc_info=True)
                raise
        
        return wrapper
    return decorator


# ============================================================================
# LOGGING CONFIGURATION SETUP
# ============================================================================

def configure_logging():
    """
    Configure Django logging with production-ready settings.
    
    Returns:
        dict: Logging configuration
    """
    # Determine if we should use JSON logs
    use_json_logs = getattr(settings, 'USE_JSON_LOGS', False)
    
    # Build handlers
    handlers = {
        'console': {
            'class': 'logging.StreamHandler',
        },
    }
    
    # Add file handler for production
    if not getattr(settings, 'DEBUG', True):
        log_dir = getattr(settings, 'LOG_DIR', '/var/log/tickflow')
        try:
            os.makedirs(log_dir, exist_ok=True)
            handlers['file'] = {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(log_dir, 'tickflow.log'),
                'maxBytes': 10 * 1024 * 1024,  # 10 MB
                'backupCount': 5,
            }
        except (OSError, PermissionError):
            pass
    
    # Configure formatters
    formatters = {}
    if use_json_logs and JSON_LOGGER_AVAILABLE:
        formatters['json'] = {
            '()': CustomJsonFormatter,
        }
    else:
        formatters['verbose'] = {
            '()': HumanReadableFormatter,
            'use_colors': getattr(settings, 'DEBUG', True),
        }
        formatters['simple'] = {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        }
    
    # Configure handler formatters
    for handler in handlers.values():
        if use_json_logs and JSON_LOGGER_AVAILABLE:
            handler['formatter'] = 'json'
        else:
            handler['formatter'] = 'verbose' if getattr(settings, 'DEBUG', True) else 'simple'
    
    # Add sampling filter for production
    if not getattr(settings, 'DEBUG', True):
        for handler in handlers.values():
            handler.setdefault('filters', []).append('sampling')
    
    # Build configuration
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'filters': {
            'sampling': {
                '()': LogSamplingFilter,
                'sample_rate': 0.1,
            },
        },
        'formatters': formatters,
        'handlers': handlers,
        'loggers': {
            'django': {
                'handlers': ['console'],
                'level': 'INFO',
                'propagate': False,
            },
            'django.request': {
                'handlers': ['console'],
                'level': 'ERROR',
                'propagate': False,
            },
            'django.db.backends': {
                'handlers': ['console'],
                'level': 'WARNING' if getattr(settings, 'DEBUG', True) else 'ERROR',
                'propagate': False,
            },
            'authentication': {
                'handlers': ['console'],
                'level': 'INFO',
                'propagate': False,
            },
            'stocks': {
                'handlers': ['console'],
                'level': 'INFO',
                'propagate': False,
            },
            'news': {
                'handlers': ['console'],
                'level': 'INFO',
                'propagate': False,
            },
        },
        'root': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    }
    
    return config


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    'CustomJsonFormatter',
    'HumanReadableFormatter',
    'LogSamplingFilter',
    'ContextLogger',
    'get_logger',
    'log_performance',
    'configure_logging',
]