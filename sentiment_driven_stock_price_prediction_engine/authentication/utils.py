# authentication/utils.py
"""
Utility functions for authentication: email sending, token generation,
verification, and response formatting.

All functions are production‑ready with robust error handling,
logging, and HTML+plain text email support.
"""
import os
import secrets
import logging
from datetime import datetime
import threading
from django.conf import settings

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
# RESPONSE HELPERS
# ============================================================================

def error_response(message, code=400, errors=None, status_code=400):
    """
    Standard error response format for all endpoints.

    Args:
        message (str): User‑friendly error message.
        code (int): Application‑specific error code.
        errors (dict, optional): Field‑level validation errors.
        status_code (int): HTTP status code.

    Returns:
        dict: Standardised error payload.
    """
    return {
        'success': False,
        'error': message,
        'code': code,
        'errors': errors,
        'timestamp': timezone.now().isoformat()
    }


def success_response(data=None, message=None, code=200):
    """
    Standard success response format.

    Args:
        data (any, optional): Payload to return.
        message (str, optional): Success message.
        code (int): Application‑specific success code.

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
    return response


# ============================================================================
# VERIFICATION CODE HELPERS
# ============================================================================

def generate_verification_code():
    """
    Generate a 6‑digit numeric verification code using cryptographically
    secure random numbers.

    Returns:
        str: 6‑digit code (e.g., "482719").
    """
    return ''.join(str(secrets.randbelow(10)) for _ in range(6))


def verify_email_code(user, code):
    """
    Verify a 6‑digit code previously sent to the user's email.

    The code is stored in the cache with a 10‑minute TTL.

    Args:
        user (User): The user to verify.
        code (str): The 6‑digit code entered by the user.

    Returns:
        bool: True if the code is valid and not expired, False otherwise.
    """
    try:
        cache_key = f"email_verification_{user.id}"
        stored_code = cache.get(cache_key)
        if stored_code and stored_code == code:
            cache.delete(cache_key)  # one‑time use
            return True
        return False
    except Exception as e:
        logger.error(f"Error verifying email code for user {user.id}: {e}")
        return False


def verify_email_token(uid, token):
    """
    Verify the token sent in the email verification link.

    Args:
        uid (str): Base64‑encoded user ID.
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

    This uses the same token generator but is kept as a separate function
    to clearly separate the two flows.

    Args:
        uid (str): Base64‑encoded user ID.
        token (str): Django default token.

    Returns:
        User | None: The user if the token is valid, otherwise None.
    """
    # Re‑use the same logic as email verification; the token generator is
    # the same, but we keep the function name distinct for clarity.
    return verify_email_token(uid, token)


# ============================================================================
# EMAIL SENDING FUNCTIONS
# ============================================================================

def send_verification_email(user, request):
    """Send verification email asynchronously in a background thread."""
    def _send():
        try:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            code = generate_verification_code()

            cache_key = f"email_verification_{user.id}"
            cache.set(cache_key, code, timeout=600)

            # ✅ Use settings.FRONTEND_URL
            frontend_url = settings.FRONTEND_URL
            verification_link = f"{frontend_url}/verify-email?token={token}&uid={uid}"

            subject = 'Verify your email for Tickflow Sentiment'

            html_message = render_to_string('email/verify_email.html', {
                'user': user,
                'verification_link': verification_link,
                'code': code,
                'expires_in': 10,
            })

            plain_message = render_to_string('email/verify_email.txt', {
                'user': user,
                'verification_link': verification_link,
                'code': code,
                'expires_in': 10,
            })

            send_mail(
                subject,
                plain_message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Verification email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")

    # Start the email in a background thread
    thread = threading.Thread(target=_send)
    thread.daemon = True
    thread.start()
    logger.info(f"Verification email queued for {user.email}")


def send_password_reset_email(user, request):
    """
    Send a password reset link to the user.

    Features:
        - HTML + plain text email.
        - Secure token‑based link.
        - 24‑hour expiry (Django default).

    Args:
        user (User): The user requesting the reset.
        request (HttpRequest): The current request.

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    try:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        reset_link = request.build_absolute_uri(
            reverse('reset-password-confirm') + f'?token={token}&uid={uid}'
        )

        subject = 'Reset your Tickflow Sentiment password'

        html_message = render_to_string('email/reset_password.html', {
            'user': user,
            'reset_link': reset_link,
        })

        plain_message = render_to_string('email/reset_password.txt', {
            'user': user,
            'reset_link': reset_link,
        })

        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Password reset email sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {e}")
        return False


def send_welcome_email(user, request):
    """
    Send a welcome email after successful registration and verification.

    Features:
        - HTML + plain text email.
        - Onboarding link (frontend) to complete the user's profile.

    Args:
        user (User): The new user.
        request (HttpRequest): The current request.

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    try:
        subject = 'Welcome to Tickflow Sentiment!'

        # Build onboarding URL from environment (frontend)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        onboarding_url = f'{frontend_url}/onboarding'
        dashboard_link = request.build_absolute_uri('/dashboard')
        docs_link = 'https://docs.tickflow.com'

        html_message = render_to_string('email/welcome.html', {
            'user': user,
            'dashboard_link': dashboard_link,
            'docs_link': docs_link,
            'onboarding_url': onboarding_url,   
        })

        plain_message = f"""
Welcome to Tickflow Sentiment!

We're excited to have you on board. Here's what you can do next:

1. Explore the dashboard: {dashboard_link}
2. Search for your first stock
3. View AI-powered sentiment analysis

Get started at: {dashboard_link}

Thanks,
The Tickflow Capital Team
"""

        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Welcome email sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.email}: {e}")
        return False


def send_email_change_code(new_email, code):
    """
    Send a 6‑digit verification code to the **new** email address
    when a user requests to change their email.

    This is separate from the verification email because the code must
    be sent to the new address, not the old one.

    Args:
        new_email (str): The email address the user wants to change to.
        code (str): 6‑digit verification code.

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    try:
        subject = 'Verify your new email address for Tickflow Sentiment'
        message = f"""
Your verification code is: {code}

This code expires in 10 minutes.

If you did not request this change, please ignore this email.
"""
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [new_email],
            fail_silently=False,
        )
        logger.info(f"Email change code sent to {new_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email change code to {new_email}: {e}")
        return False


def send_email_change_notification(user, old_email, new_email):
    """
    Send a notification to both the old and new email addresses
    when an email change is successfully completed.

    Args:
        user (User): The user whose email was changed.
        old_email (str): The previous email address.
        new_email (str): The new email address.

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    try:
        subject = 'Email address changed for Tickflow Sentiment'
        message = f"""
Hi {user.username},

Your Tickflow Sentiment email address was changed from {old_email} to {new_email}.

If you made this change, no action is required.

If you did NOT make this change, please contact support immediately:
support@tickflow.com

Thanks,
The Tickflow Capital Team
"""

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [old_email, new_email],
            fail_silently=False,
        )

        logger.info(f"Email change notification sent to {old_email} and {new_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email change notification: {e}")
        return False


def send_account_deletion_confirmation(user, request):
    """
    Send a confirmation email when a user requests account deletion.

    Includes a cancellation link valid for 30 days.

    Args:
        user (User): The user requesting deletion.
        request (HttpRequest): The current request (used to build the
                               cancellation link).

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    try:
        subject = 'Account deletion requested for Tickflow Sentiment'

        # Build cancellation link using the request
        cancellation_link = request.build_absolute_uri(
            reverse('cancel-deletion')
        )

        html_message = render_to_string('email/account_deletion.html', {
            'user': user,
            'cancellation_link': cancellation_link,
            'scheduled_for': user.deletion_scheduled_for.strftime('%B %d, %Y'),
            'days_left': 30,
        })

        plain_message = f"""
Hi {user.username},

You requested to delete your Tickflow Sentiment account.

Your account is scheduled for deletion on {user.deletion_scheduled_for.strftime('%B %d, %Y')}.

If you didn't request this, click the link below to cancel:

{cancellation_link}

This link expires in 30 days.

Thanks,
The Tickflow Capital Team
"""

        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Account deletion confirmation sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send account deletion confirmation: {e}")
        return False


def send_security_alert_email(user, action, ip_address, user_agent):
    """
    Send a security alert email for sensitive actions (login, password change,
    email change, account deletion).

    Args:
        user (User): The user performing the action.
        action (str): One of: 'login', 'password_change', 'email_change',
                      'account_deletion'.
        ip_address (str): IP address of the request.
        user_agent (str): User‑agent string of the client.

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    try:
        action_map = {
            'login': 'login from a new device',
            'password_change': 'change your password',
            'email_change': 'change your email address',
            'account_deletion': 'request account deletion',
        }
        action_description = action_map.get(action, action)

        subject = f'Security Alert: {action_description} for Tickflow Sentiment'

        message = f"""
Hi {user.username},

We detected a security event on your Tickflow Sentiment account:

Action: {action_description}
IP Address: {ip_address}
Device: {user_agent}
Time: {timezone.now().strftime('%B %d, %Y at %I:%M %p UTC')}

If you performed this action, no further action is required.

If you did NOT perform this action, please contact support immediately:
support@tickflow.com

Thanks,
The Tickflow Capital Team
"""

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

        logger.info(f"Security alert email sent to {user.email} for action: {action}")
        return True

    except Exception as e:
        logger.error(f"Failed to send security alert email: {e}")
        return False