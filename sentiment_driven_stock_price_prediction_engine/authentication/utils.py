from datetime import datetime
from django.utils import timezone

def error_response(message, code=400, errors=None, status_code=400):
    """Standard error response format for all endpoints."""
    return {
        'success': False,
        'error': message,
        'code': code,
        'errors': errors,  # Optional field-level validation errors
        'timestamp': timezone.now().isoformat()
    }

def success_response(data=None, message=None, code=200):
    """Standard success response format."""
    response = {
        'success': True,
        'code': code,
        'timestamp': timezone.now().isoformat()
    }
    if data is not None:
        response['data'] = data
    if message is not None:
        response['message'] = message
    return response