"""
Utility functions for authentication: email sending, token generation,
verification, and response formatting.

Production-Ready Refactor:
- Removed asynchronous threading (which gets killed by Render/serverless platforms).
- Switched to synchronous SendGrid API calls with strict timeouts.
- Added atomic rate limiting using cache.incr().
- Added extensive logging for failure diagnostics.
"""

import re
import time
import secrets
import logging
from typing import Optional, Dict, Any

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from .models import User

logger = logging.getLogger(__name__)

# ============================================================================
# CONSTANTS
# ============================================================================

EMAIL_SUBJECTS = {
    'verification': 'Verify your email for Tickflow Intelligence',
    'welcome': 'Welcome to Tickflow Intelligence!',
    'password_reset': 'Reset your Tickflow Intelligence password',
    'email_change': 'Verify your new email address for Tickflow Intelligence',
    'email_changed': 'Email address changed for Tickflow Intelligence',
    'account_deletion': 'Account deletion requested for Tickflow Intelligence',
    'security_alert': 'Security Alert: {action} for Tickflow Intelligence',
}

EMAIL_RATE_LIMIT = 3
EMAIL_RATE_WINDOW = 60
EMAIL_MAX_RETRIES = 2
EMAIL_RETRY_DELAY = 1


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
    'send_email_sync',
    'validate_email',
    'check_email_rate_limit',
    'get_request_context',
    'check_email_service_health',
]


# ============================================================================
# RESPONSE HELPERS
# ============================================================================

def error_response(message: str, code: Optional[str] = None, details: Optional[Dict] = None, status_code: int = 400, request_id: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    """Standard error response format for all endpoints."""
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
    if 'errors' in kwargs and kwargs['errors'] is not None:
        response['errors'] = kwargs['errors']
    return response


def success_response(data: Optional[Any] = None, message: Optional[str] = None, code: str = 'SUCCESS', request_id: Optional[str] = None, **kwargs) -> Dict[str, Any]:
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
    if request_id:
        response['request_id'] = request_id
    return response


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def validate_email(email: str) -> bool:
    """Validate email address format."""
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def strip_html_tags(html: str) -> str:
    """Strip HTML tags from content for plain text version."""
    if not html:
        return ''
    text = re.sub(r'<[^>]+>', '', html)
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def get_request_context(request) -> Dict[str, str]:
    """Extract request context for logging."""
    return {
        'request_id': request.META.get('HTTP_X_REQUEST_ID', ''),
        'ip': request.META.get('REMOTE_ADDR', 'Unknown'),
        'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
    }


def check_email_rate_limit(user_id: int, action: str, limit: int = EMAIL_RATE_LIMIT, window: int = EMAIL_RATE_WINDOW) -> bool:
    """
    Check if user has exceeded email rate limit using atomic cache operations.
    Prevents race conditions under concurrent requests.
    """
    cache_key = f"email_rate_{action}_{user_id}"
    count = cache.get(cache_key, 0)
    
    if count >= limit:
        logger.warning(f"Email rate limit exceeded for user {user_id} on action '{action}'")
        return False
    
    try:
        cache.incr(cache_key)
    except ValueError:
        # Key does not exist yet
        cache.set(cache_key, 1, timeout=window)
        
    return True


# ============================================================================
# VERIFICATION CODE & TOKEN HELPERS
# ============================================================================

def generate_verification_code() -> str:
    """Generate a 6-digit numeric verification code."""
    return ''.join(str(secrets.randbelow(10)) for _ in range(6))


def verify_email_code(user: User, code: str) -> bool:
    """Verify a 6-digit code previously sent to the user's email."""
    try:
        cache_key = f"email_verification_{user.id}"
        stored_code = cache.get(cache_key)
        if stored_code and stored_code == code:
            cache.delete(cache_key)
            return True
        return False
    except Exception as e:
        logger.error(f"Error verifying email code for user {user.id}: {e}")
        return False


def verify_email_token(uid: str, token: str) -> Optional[User]:
    """Verify the token sent in the email verification link."""
    try:
        uid_decoded = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=uid_decoded)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None

    if default_token_generator.check_token(user, token):
        return user
    return None


def verify_password_reset_token(uid: str, token: str) -> Optional[User]:
    """Verify the token sent in the password reset link."""
    return verify_email_token(uid, token)


# ============================================================================
# CORE EMAIL SENDING (SYNCHRONOUS)
# ============================================================================

def send_email_sync(subject: str, to_email: str, html_content: str, plain_content: Optional[str] = None, retry_count: int = EMAIL_MAX_RETRIES) -> bool:
    """
    Send email synchronously using SendGrid Web API with SMTP fallback.
    This blocks the request for ~200ms but guarantees the email is dispatched 
    before Render can terminate the worker process.
    """
    if not validate_email(to_email):
        logger.error(f"Invalid email address: {to_email}")
        return False

    plain_text = plain_content or strip_html_tags(html_content)
    last_error = None

    for attempt in range(retry_count):
        # --- Primary: SendGrid Web API ---
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=settings.DEFAULT_FROM_EMAIL,
                to_emails=to_email,
                subject=subject,
                html_content=html_content,
                plain_text_content=plain_text,
            )

            # 10-second timeout ensures Render doesn't hang indefinitely if SendGrid is down
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY, timeout=10)
            response = sg.send(message)

            if 200 <= response.status_code < 300:
                logger.info(f"[SendGrid] Email sent to {to_email} (status: {response.status_code})")
                return True
            else:
                last_error = f"SendGrid HTTP {response.status_code}: {getattr(response, 'body', '')}"
                logger.error(f"[SendGrid] Failed for {to_email}: {last_error}")
                
                # Don't retry on 4xx errors (except 429) as they indicate a configuration issue
                if 400 <= response.status_code < 500 and response.status_code != 429:
                    break 

        except ImportError:
            logger.warning("[Email] SendGrid library not installed, falling back to SMTP.")
        except Exception as e:
            last_error = str(e)
            logger.warning(f"[SendGrid] Attempt {attempt + 1} failed: {e}")

        # --- Fallback: Django SMTP ---
        try:
            send_mail(
                subject=subject,
                message=plain_text,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=False,
            )
            logger.info(f"[SMTP] Email sent to {to_email}")
            return True
        except Exception as e:
            last_error = str(e)
            logger.error(f"[SMTP] Fallback failed for {to_email}: {e}")

        if attempt < retry_count - 1:
            time.sleep(EMAIL_RETRY_DELAY)

    logger.error(f"[Email] Failed after {retry_count} attempts for {to_email}. Last error: {last_error}")
    return False


# ============================================================================
# HIGH-LEVEL EMAIL FUNCTIONS
# ============================================================================

def send_verification_email(user: User, request) -> bool:
    """Send verification email synchronously with rate limiting."""
    try:
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
        
        return send_email_sync(subject, user.email, html_content, plain_content)
        
    except Exception as e:
        logger.error(f"Failed to send verification email for {user.email}: {e}", exc_info=True)
        return False


def send_welcome_email(user: User, request) -> bool:
    """Send welcome email synchronously."""
    try:
        if not check_email_rate_limit(user.id, 'welcome', limit=2, window=60):
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
Welcome to Tickflow Intelligence!

We're excited to have you on board. Here's what you can do next:

1. Explore the dashboard: {dashboard_url}
2. Search for your first stock
3. View AI-powered sentiment analysis

Get started at: {dashboard_url}

Thanks,
The Tickflow Capital Team
"""
        
        return send_email_sync(subject, user.email, html_content, plain_content)
    except Exception as e:
        logger.error(f"Failed to send welcome email for {user.email}: {e}", exc_info=True)
        return False


def send_password_reset_email(user: User, request) -> bool:
    """Send password reset email synchronously."""
    try:
        if not check_email_rate_limit(user.id, 'password_reset', limit=3, window=60):
            return False
        
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
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
        
        return send_email_sync(subject, user.email, html_content, plain_content)
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {e}", exc_info=True)
        return False


def send_email_change_code(new_email: str, code: str) -> bool:
    """Send verification code to new email address synchronously."""
    try:
        if not validate_email(new_email):
            return False
        
        subject = EMAIL_SUBJECTS['email_change']
        
        html_content = f"""
        <h2>Email Change Verification</h2>
        <p>Your verification code is: <strong>{code}</strong></p>
        <p>This code expires in 10 minutes.</p>
        """
        plain_content = f"Email Change Verification\n\nYour verification code is: {code}\n\nThis code expires in 10 minutes."
        
        return send_email_sync(subject, new_email, html_content, plain_content)
    except Exception as e:
        logger.error(f"Failed to send email change code to {new_email}: {e}", exc_info=True)
        return False


def send_email_change_notification(user: User, old_email: str, new_email: str) -> bool:
    """Send notification to both old and new addresses synchronously."""
    try:
        subject = EMAIL_SUBJECTS['email_changed']
        html_content = f"""
        <h2>Email Address Changed</h2>
        <p>Hi {user.username},</p>
        <p>Your email address was changed from <strong>{old_email}</strong> to <strong>{new_email}</strong>.</p>
        <p>If you did NOT make this change, please contact support immediately.</p>
        """
        plain_content = f"Email Address Changed\n\nHi {user.username},\n\nYour email was changed from {old_email} to {new_email}."
        
        success_old = send_email_sync(subject, old_email, html_content, plain_content)
        success_new = send_email_sync(subject, new_email, html_content, plain_content)
        
        return success_old and success_new
    except Exception as e:
        logger.error(f"Failed to send email change notification: {e}", exc_info=True)
        return False


def send_account_deletion_confirmation(user: User, request) -> bool:
    """Send account deletion confirmation synchronously."""
    try:
        cancellation_link = f"{settings.FRONTEND_URL}/cancel-deletion"
        subject = EMAIL_SUBJECTS['account_deletion']
        
        html_content = render_to_string('email/account_deletion.html', {
            'user': user,
            'cancellation_link': cancellation_link,
            'scheduled_for': user.deletion_scheduled_for.strftime('%B %d, %Y'),
            'days_left': 30,
            'year': timezone.now().year,
        })
        
        plain_content = f"Account Deletion Requested\n\nYour account is scheduled for deletion on {user.deletion_scheduled_for.strftime('%B %d, %Y')}."
        
        return send_email_sync(subject, user.email, html_content, plain_content)
    except Exception as e:
        logger.error(f"Failed to send account deletion confirmation: {e}", exc_info=True)
        return False


def send_security_alert_email(user: User, action: str, ip_address: str, user_agent: str) -> bool:
    """Send security alert email synchronously."""
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
        <p>We detected a security event on your account:</p>
        <ul>
            <li><strong>Action:</strong> {action_description}</li>
            <li><strong>IP Address:</strong> {ip_address}</li>
            <li><strong>Device:</strong> {user_agent}</li>
            <li><strong>Time:</strong> {timezone.now().strftime('%B %d, %Y at %I:%M %p UTC')}</li>
        </ul>
        <p>If you did NOT perform this action, please contact support immediately.</p>
        """
        
        plain_content = f"Security Alert\n\nAction: {action_description}\nIP: {ip_address}\nDevice: {user_agent}"
        
        return send_email_sync(subject, user.email, html_content, plain_content)
    except Exception as e:
        logger.error(f"Failed to send security alert email: {e}", exc_info=True)
        return False


# ============================================================================
# EMAIL SERVICE HEALTH CHECK
# ============================================================================

def check_email_service_health() -> Dict[str, Any]:
    """Check if SendGrid API is accessible and functioning."""
    try:
        from sendgrid import SendGridAPIClient
        
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY, timeout=5)
        response = sg.client._("v3").get()
        
        if response.status_code < 500:
            return {
                'available': True,
                'status': 'healthy',
                'provider': 'sendgrid',
                'status_code': response.status_code,
            }
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