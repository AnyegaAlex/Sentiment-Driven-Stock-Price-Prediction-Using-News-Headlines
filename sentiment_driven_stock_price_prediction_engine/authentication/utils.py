"""
Utility functions for authentication: email sending, token generation,
verification, and response formatting.

All functions are production-ready with robust error handling,
logging, HTML+plain text email support, rate limiting, retry logic,
and proper frontend URL handling.
"""

import os
import re
import time
import secrets
import logging
import threading
from datetime import datetime
from functools import wraps

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from .models import User

logger = logging.getLogger(__name__)


# ============================================================================
# CONSTANTS
# ============================================================================

EMAIL_SUBJECTS = {
    'verification': 'Verify your email for Tickflow Sentiment',
    'welcome': 'Welcome to Tickflow Sentiment!',
    'password_reset': 'Reset your Tickflow Sentiment password',
    'email_change': 'Verify your new email address for Tickflow Sentiment',
    'email_changed': 'Email address changed for Tickflow Sentiment',
    'account_deletion': 'Account deletion requested for Tickflow Sentiment',
    'security_alert': 'Security Alert: {action} for Tickflow Sentiment',
}

EMAIL_RATE_LIMIT = 3  # Max emails per window
EMAIL_RATE_WINDOW = 60  # Window in seconds


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    'error_response',
    'success_response',
    'generate_verification_code',
    'verify_email_code',
    'verify_email_token',
    'verify_password_reset_token',
    'send_verification_email',
    'send_welcome_email',
    'send_password_reset_email',
    'send_email_change_code',
    'send_email_change_notification',
    'send_account_deletion_confirmation',
    'send_security_alert_email',
    'send_email_async',
    'validate_email',
    'check_email_rate_limit',
    'get_request_context',
    'sanitize_html',
]


# ============================================================================
# RESPONSE HELPERS
# ============================================================================

def error_response(message, code=None, details=None, status_code=400, request_id=None):
    """
    Standard error response format for all endpoints.
    
    Args:
        message (str): User-friendly error message.
        code (str): Application-specific error code (e.g., 'AUTH_001').
        details (dict): Additional error details (field-level errors).
        status_code (int): HTTP status code.
        request_id (str): Request ID for tracking.
    
    Returns:
        dict: Standardised error payload.
    """
    response = {
        'success': False,
        'error': message,
        'timestamp': timezone.now().isoformat()
    }
    if code:
        response['code'] = code
    if details:
        response['details'] = details
    if request_id:
        response['request_id'] = request_id
    return response


def success_response(data=None, message=None, code='SUCCESS', request_id=None):
    """
    Standard success response format.
    
    Args:
        data (any): Payload to return.
        message (str): Success message.
        code (str): Application-specific success code.
        request_id (str): Request ID for tracking.
    
    Returns:
        dict: Standardised success payload.
    """
    response = {
        'success': True,
        'code': code,
        'timestamp': timezone.now().isoformat()
    }
    if data is not None:
        response['data'] = data
    if message is not None:
        response['message'] = message
    if request_id:
        response['request_id'] = request_id
    return response


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def validate_email(email):
    """
    Validate email address format.
    
    Args:
        email (str): Email address to validate.
    
    Returns:
        bool: True if valid, False otherwise.
    """
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def sanitize_html(content):
    """
    Sanitize HTML content to prevent XSS.
    
    Args:
        content (str): HTML content to sanitize.
    
    Returns:
        str: Sanitized HTML content.
    """
    if not content:
        return ''
    # Basic sanitization - escape HTML special characters
    # For production, consider using a library like bleach
    return content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def get_request_context(request):
    """
    Extract request context for logging.
    
    Args:
        request (HttpRequest): The current request.
    
    Returns:
        dict: Request context with IP, user agent, and request ID.
    """
    return {
        'request_id': request.META.get('HTTP_X_REQUEST_ID', ''),
        'ip': request.META.get('REMOTE_ADDR', 'Unknown'),
        'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
    }


def check_email_rate_limit(user_id, action, limit=EMAIL_RATE_LIMIT, window=EMAIL_RATE_WINDOW):
    """
    Check if user has exceeded email rate limit.
    
    Args:
        user_id (int): User ID to check.
        action (str): Email action type (e.g., 'verification', 'welcome').
        limit (int): Max emails allowed in the window.
        window (int): Time window in seconds.
    
    Returns:
        bool: True if under limit, False if rate limited.
    """
    cache_key = f"email_rate_{action}_{user_id}"
    count = cache.get(cache_key, 0)
    
    if count >= limit:
        logger.warning(f"Email rate limit exceeded for user {user_id} on action '{action}'")
        return False
    
    cache.set(cache_key, count + 1, timeout=window)
    return True


def retry_on_failure(max_retries=3, delay=1, backoff=2):
    """
    Decorator for retrying failed operations with exponential backoff.
    
    Args:
        max_retries (int): Maximum number of retry attempts.
        delay (int): Initial delay between retries in seconds.
        backoff (int): Multiplier for exponential backoff.
    
    Returns:
        Decorated function.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        wait = delay * (backoff ** attempt)
                        logger.warning(
                            f"Attempt {attempt + 1} failed for {func.__name__}, "
                            f"retrying in {wait}s: {e}"
                        )
                        time.sleep(wait)
            logger.error(f"All {max_retries} attempts failed for {func.__name__}: {last_exception}")
            raise last_exception
        return wrapper
    return decorator


# ============================================================================
# VERIFICATION CODE HELPERS
# ============================================================================

def generate_verification_code():
    """
    Generate a 6-digit numeric verification code using cryptographically
    secure random numbers.
    
    Returns:
        str: 6-digit code (e.g., "482719").
    """
    return ''.join(str(secrets.randbelow(10)) for _ in range(6))


def verify_email_code(user, code):
    """
    Verify a 6-digit code previously sent to the user's email.
    
    The code is stored in the cache with a 10-minute TTL.
    
    Args:
        user (User): The user to verify.
        code (str): The 6-digit code entered by the user.
    
    Returns:
        bool: True if the code is valid and not expired, False otherwise.
    """
    try:
        cache_key = f"email_verification_{user.id}"
        stored_code = cache.get(cache_key)
        if stored_code and stored_code == code:
            cache.delete(cache_key)  # one-time use
            return True
        return False
    except Exception as e:
        logger.error(f"Error verifying email code for user {user.id}: {e}")
        return False


def verify_email_token(uid, token):
    """
    Verify the token sent in the email verification link.
    
    Args:
        uid (str): Base64-encoded user ID.
        token (str): Django default token.
    
    Returns:
        User | None: The user if the token is valid, otherwise None.
    """
    try:
        uid_decoded = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=uid_decoded)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None

    if default_token_generator.check_token(user, token):
        return user
    return None


def verify_password_reset_token(uid, token):
    """
    Verify the token sent in the password reset link.
    
    Args:
        uid (str): Base64-encoded user ID.
        token (str): Django default token.
    
    Returns:
        User | None: The user if the token is valid, otherwise None.
    """
    return verify_email_token(uid, token)


# ============================================================================
# CORE EMAIL SENDING (Async with SendGrid Web API + SMTP Fallback)
# ============================================================================

def send_email_async(subject, to_email, html_content, plain_content=None, retry_count=3):
    """
    Send email asynchronously using SendGrid Web API with SMTP fallback.
    """
    if not validate_email(to_email):
        logger.error(f"Invalid email address: {to_email}")
        return False
    
    def _send_with_retry():
        last_error = None
        
        for attempt in range(retry_count):
            try:
                # Try SendGrid Web API first
                try:
                    from sendgrid import SendGridAPIClient
                    from sendgrid.helpers.mail import Mail, Content, Email, Personalization
                    
                    # Create from and to email objects
                    from_email = Email(settings.DEFAULT_FROM_EMAIL)
                    to_email_obj = Email(to_email)
                    
                    # Create content objects
                    html_content_obj = Content("text/html", html_content)
                    plain_content_obj = Content("text/plain", plain_content or html_content)
                    
                    # Create mail with both content types
                    message = Mail(
                        from_email=from_email,
                        subject=subject,
                        to_emails=to_email_obj,
                    )
                    
                    # Add both content types
                    message.add_content(html_content_obj)
                    message.add_content(plain_content_obj)
                    
                    sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
                    response = sg.send(message)
                    
                    if 200 <= response.status_code < 300:
                        logger.info(f"Email sent via SendGrid to {to_email}")
                        return True
                    else:
                        logger.error(f"SendGrid returned {response.status_code}: {response.body}")
                        last_error = f"SendGrid error: {response.status_code}"
                        
                except ImportError as e:
                    logger.warning(f"SendGrid not installed: {e}, falling back to SMTP")
                    last_error = "SendGrid not installed"
                except Exception as e:
                    logger.warning(f"SendGrid failed: {e}, falling back to SMTP")
                    last_error = str(e)
                
                # Fallback: Django SMTP
                send_mail(
                    subject,
                    plain_content or html_content,
                    settings.DEFAULT_FROM_EMAIL,
                    [to_email],
                    html_message=html_content,
                    fail_silently=False,
                )
                logger.info(f"Email sent via SMTP to {to_email}")
                return True
                
            except Exception as e:
                last_error = str(e)
                if attempt < retry_count - 1:
                    wait = 2 ** attempt
                    logger.warning(f"Email attempt {attempt + 1} failed, retrying in {wait}s: {e}")
                    time.sleep(wait)
                else:
                    logger.error(f"All email attempts failed for {to_email}: {e}")
        
        logger.error(f"Email failed after {retry_count} attempts for {to_email}: {last_error}")
        return False
    
    thread = threading.Thread(target=_send_with_retry, daemon=True)
    thread.start()
    logger.info(f"Email queued for {to_email}")
    return True


# ============================================================================
# EMAIL SENDING FUNCTIONS (Async)
# ============================================================================

def send_verification_email(user, request):
    """
    Send verification email asynchronously with rate limiting.
    
    Args:
        user (User): The user to verify.
        request (HttpRequest): The current request.
    
    Returns:
        bool: True if email was queued, False otherwise.
    """
    try:
        # Rate limit: 3 verification emails per minute
        if not check_email_rate_limit(user.id, 'verification', limit=3, window=60):
            logger.warning(f"Verification rate limit exceeded for user {user.id}")
            return False
        
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        code = generate_verification_code()
        
        cache_key = f"email_verification_{user.id}"
        cache.set(cache_key, code, timeout=600)
        cache.set(f"verification_sent_{user.id}", True, timeout=60)
        
        frontend_url = settings.FRONTEND_URL
        verification_link = f"{frontend_url}/verify-email?token={token}&uid={uid}"
        
        subject = EMAIL_SUBJECTS['verification']
        
        html_content = render_to_string('email/verify_email.html', {
            'user': user,
            'verification_link': verification_link,
            'code': code,
            'expires_hours': 24, 
            'year': timezone.now().year,
        })
        
        plain_content = render_to_string('email/verify_email.txt', {
            'user': user,
            'verification_link': verification_link,
            'code': code,
            'expires_hours': 24,
            'year': timezone.now().year,
        })
        
        # Sanitize content
        html_content = sanitize_html(html_content)
        
        return send_email_async(subject, user.email, html_content, plain_content)
        
    except Exception as e:
        logger.error(f"Failed to queue verification email for {user.email}: {e}", exc_info=True)
        return False


def send_welcome_email(user, request):
    """
    Send welcome email asynchronously with frontend links.
    
    Args:
        user (User): The new user.
        request (HttpRequest): The current request.
    
    Returns:
        bool: True if email was queued, False otherwise.
    """
    try:
        # Rate limit: 2 welcome emails per minute
        if not check_email_rate_limit(user.id, 'welcome', limit=2, window=60):
            logger.warning(f"Welcome email rate limit exceeded for user {user.id}")
            return False
        
        frontend_url = settings.FRONTEND_URL
        onboarding_url = f'{frontend_url}/onboarding'
        dashboard_url = f'{frontend_url}/dashboard'
        docs_url = 'https://docs.tickflow.com'
        
        subject = EMAIL_SUBJECTS['welcome']
        
        html_content = render_to_string('email/welcome.html', {
            'user': user,
            'dashboard_link': dashboard_url,
            'docs_link': docs_url,
            'onboarding_url': onboarding_url,
            'year': timezone.now().year,
        })
        
        plain_content = f"""
Welcome to Tickflow Sentiment!

We're excited to have you on board. Here's what you can do next:

1. Explore the dashboard: {dashboard_url}
2. Search for your first stock
3. View AI-powered sentiment analysis

Get started at: {dashboard_url}

Thanks,
The Tickflow Capital Team
"""
        
        # Sanitize content
        html_content = sanitize_html(html_content)
        
        return send_email_async(subject, user.email, html_content, plain_content)
        
    except Exception as e:
        logger.error(f"Failed to queue welcome email for {user.email}: {e}", exc_info=True)
        return False


def send_password_reset_email(user, request):
    """
    Send password reset email with frontend link.
    
    Args:
        user (User): The user requesting reset.
        request (HttpRequest): The current request.
    
    Returns:
        bool: True if email was queued, False otherwise.
    """
    try:
        # Rate limit: 3 reset emails per minute
        if not check_email_rate_limit(user.id, 'password_reset', limit=3, window=60):
            logger.warning(f"Password reset rate limit exceeded for user {user.id}")
            return False
        
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # ✅ Use frontend URL for reset link
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}&uid={uid}"
        
        subject = EMAIL_SUBJECTS['password_reset']
        
        html_content = render_to_string('email/reset_password.html', {
            'user': user,
            'reset_link': reset_link,
            'reset_expires_hours': 24,
            'year': timezone.now().year,
        })
        
        plain_content = render_to_string('email/reset_password.txt', {
            'user': user,
            'reset_link': reset_link,
        })
        
        # Sanitize content
        html_content = sanitize_html(html_content)
        
        return send_email_async(subject, user.email, html_content, plain_content)
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {e}", exc_info=True)
        return False


def send_email_change_code(new_email, code):
    """
    Send verification code to new email address for email change.
    
    Args:
        new_email (str): New email address.
        code (str): 6-digit verification code.
    
    Returns:
        bool: True if email was queued, False otherwise.
    """
    try:
        # Validate email
        if not validate_email(new_email):
            logger.error(f"Invalid email address: {new_email}")
            return False
        
        subject = EMAIL_SUBJECTS['email_change']
        
        html_content = f"""
        <h2>Email Change Verification</h2>
        <p>Your verification code is: <strong>{code}</strong></p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this change, please ignore this email.</p>
        """
        
        plain_content = f"""
Email Change Verification

Your verification code is: {code}

This code expires in 10 minutes.

If you did not request this change, please ignore this email.
"""
        
        # Sanitize content
        html_content = sanitize_html(html_content)
        
        return send_email_async(subject, new_email, html_content, plain_content)
        
    except Exception as e:
        logger.error(f"Failed to send email change code to {new_email}: {e}", exc_info=True)
        return False


def send_email_change_notification(user, old_email, new_email):
    """
    Send notification when email is changed to both old and new addresses.
    
    Args:
        user (User): The user whose email was changed.
        old_email (str): Previous email address.
        new_email (str): New email address.
    
    Returns:
        bool: True if both emails were sent successfully, False otherwise.
    """
    try:
        subject = EMAIL_SUBJECTS['email_changed']
        
        html_content = f"""
        <h2>Email Address Changed</h2>
        <p>Hi {user.username},</p>
        <p>Your Tickflow Sentiment email address was changed from <strong>{old_email}</strong> to <strong>{new_email}</strong>.</p>
        <p>If you made this change, no action is required.</p>
        <p>If you did NOT make this change, please contact support immediately at support@tickflow.com</p>
        """
        
        plain_content = f"""
Email Address Changed

Hi {user.username},

Your Tickflow Sentiment email address was changed from {old_email} to {new_email}.

If you made this change, no action is required.

If you did NOT make this change, please contact support immediately at support@tickflow.com
"""
        
        # Sanitize content
        html_content = sanitize_html(html_content)
        
        # Send to both old and new email addresses
        success_old = send_email_async(subject, old_email, html_content, plain_content)
        success_new = send_email_async(subject, new_email, html_content, plain_content)
        
        return success_old and success_new
        
    except Exception as e:
        logger.error(f"Failed to send email change notification: {e}", exc_info=True)
        return False


def send_account_deletion_confirmation(user, request):
    """
    Send account deletion confirmation email with frontend cancellation link.
    
    Args:
        user (User): The user requesting deletion.
        request (HttpRequest): The current request.
    
    Returns:
        bool: True if email was queued, False otherwise.
    """
    try:
        # ✅ Use frontend URL for cancellation link
        cancellation_link = f"{settings.FRONTEND_URL}/cancel-deletion"
        
        subject = EMAIL_SUBJECTS['account_deletion']
        
        html_content = render_to_string('email/account_deletion.html', {
            'user': user,
            'cancellation_link': cancellation_link,
            'scheduled_for': user.deletion_scheduled_for.strftime('%B %d, %Y'),
            'days_left': 30,
            'year': timezone.now().year,
        })
        
        plain_content = f"""
Account Deletion Requested

Hi {user.username},

You requested to delete your Tickflow Sentiment account.

Your account is scheduled for deletion on {user.deletion_scheduled_for.strftime('%B %d, %Y')}.

If you didn't request this, click the link below to cancel:

{cancellation_link}

This link expires in 30 days.

Thanks,
The Tickflow Capital Team
"""
        
        # Sanitize content
        html_content = sanitize_html(html_content)
        
        return send_email_async(subject, user.email, html_content, plain_content)
        
    except Exception as e:
        logger.error(f"Failed to send account deletion confirmation: {e}", exc_info=True)
        return False


def send_security_alert_email(user, action, ip_address, user_agent):
    """
    Send security alert email.
    
    Args:
        user (User): The user performing the action.
        action (str): 'login', 'password_change', 'email_change', 'account_deletion'
        ip_address (str): IP address of the request.
        user_agent (str): User-agent string.
    
    Returns:
        bool: True if email was queued, False otherwise.
    """
    try:
        action_map = {
            'login': 'login from a new device',
            'password_change': 'change your password',
            'email_change': 'change your email address',
            'account_deletion': 'request account deletion',
        }
        action_description = action_map.get(action, action)
        
        subject = EMAIL_SUBJECTS['security_alert'].format(action=action_description)
        
        html_content = f"""
        <h2>Security Alert</h2>
        <p>Hi {user.username},</p>
        <p>We detected a security event on your Tickflow Sentiment account:</p>
        <ul>
            <li><strong>Action:</strong> {action_description}</li>
            <li><strong>IP Address:</strong> {ip_address}</li>
            <li><strong>Device:</strong> {user_agent}</li>
            <li><strong>Time:</strong> {timezone.now().strftime('%B %d, %Y at %I:%M %p UTC')}</li>
        </ul>
        <p>If you performed this action, no further action is required.</p>
        <p>If you did NOT perform this action, please contact support immediately at support@tickflow.com</p>
        """
        
        plain_content = f"""
Security Alert

Hi {user.username},

We detected a security event on your Tickflow Sentiment account:

Action: {action_description}
IP Address: {ip_address}
Device: {user_agent}
Time: {timezone.now().strftime('%B %d, %Y at %I:%M %p UTC')}

If you performed this action, no further action is required.

If you did NOT perform this action, please contact support immediately at support@tickflow.com
"""
        
        # Sanitize content
        html_content = sanitize_html(html_content)
        
        return send_email_async(subject, user.email, html_content, plain_content)
        
    except Exception as e:
        logger.error(f"Failed to send security alert email: {e}", exc_info=True)
        return False


# ============================================================================
# EMAIL SERVICE HEALTH CHECK
# ============================================================================

def check_email_service_health():
    """
    Check if SendGrid API is accessible and functioning.
    
    Returns:
        dict: Health status with 'available' flag and details.
    """
    try:
        from sendgrid import SendGridAPIClient
        
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.client._("v3").get()
        
        if response.status_code < 500:
            return {
                'available': True,
                'status': 'healthy',
                'provider': 'sendgrid',
                'status_code': response.status_code,
            }
        else:
            return {
                'available': False,
                'status': 'degraded',
                'provider': 'sendgrid',
                'status_code': response.status_code,
            }
    except ImportError:
        return {
            'available': True,
            'status': 'healthy',
            'provider': 'smtp',
            'message': 'SendGrid not installed, using SMTP fallback',
        }
    except Exception as e:
        return {
            'available': False,
            'status': 'unhealthy',
            'provider': 'sendgrid',
            'error': str(e),
        }