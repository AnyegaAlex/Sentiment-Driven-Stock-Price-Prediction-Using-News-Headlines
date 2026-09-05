"""
Tier 24: Email Template Tests

Tests:
- Email templates render without errors.
- Required context variables are used correctly.
- Rendered output contains expected strings.
"""

import pytest
from django.template.loader import get_template
from django.utils import timezone

pytestmark = pytest.mark.django_db


class TestEmailTemplates:
    """Test that all email templates render without errors."""

    def test_verify_email_html(self, user):
        context = {
            'user': user,
            'verification_link': 'https://example.com/verify?token=abc&uid=123',
            'code': '123456',
            'expires_hours': 24,
            'year': timezone.now().year,
            'contact_email': 'support@example.com',
            'frontend_url': 'https://example.com',
        }
        template = get_template('email/verify_email.html')
        rendered = template.render(context)
        assert 'Tickflow' in rendered or 'verify' in rendered.lower()
        assert user.username in rendered or user.email in rendered

    def test_verify_email_txt(self, user):
        context = {
            'user': user,
            'verification_link': 'https://example.com/verify?token=abc&uid=123',
            'code': '123456',
            'expires_hours': 24,
            'year': timezone.now().year,
            'contact_email': 'support@example.com',
            'frontend_url': 'https://example.com',
        }
        template = get_template('email/verify_email.txt')
        rendered = template.render(context)
        assert 'Tickflow' in rendered or 'verify' in rendered.lower()
        assert user.username in rendered or user.email in rendered

    def test_reset_password_html(self, user):
        context = {
            'user': user,
            'reset_link': 'https://example.com/reset?token=abc&uid=123',
            'reset_expires_hours': 24,
            'year': timezone.now().year,
            'contact_email': 'support@example.com',
            'frontend_url': 'https://example.com',
        }
        template = get_template('email/reset_password.html')
        rendered = template.render(context)
        assert 'Tickflow' in rendered or 'reset' in rendered.lower()
        assert user.username in rendered or user.email in rendered

    def test_reset_password_txt(self, user):
        context = {
            'user': user,
            'reset_link': 'https://example.com/reset?token=abc&uid=123',
            'contact_email': 'support@example.com',
            'frontend_url': 'https://example.com',
        }
        template = get_template('email/reset_password.txt')
        rendered = template.render(context)
        assert 'Tickflow' in rendered or 'reset' in rendered.lower()
        assert user.username in rendered or user.email in rendered

    def test_welcome_html(self, user):
        context = {
            'user': user,
            'dashboard_link': 'https://example.com/dashboard',
            'docs_link': 'https://docs.example.com',
            'onboarding_url': 'https://example.com/onboarding',
            'year': timezone.now().year,
            'contact_email': 'support@example.com',
            'frontend_url': 'https://example.com',
        }
        template = get_template('email/welcome.html')
        rendered = template.render(context)
        assert 'Tickflow' in rendered or 'welcome' in rendered.lower()
        assert user.username in rendered or user.email in rendered

    def test_welcome_txt(self, user):
        context = {
            'user': user,
            'dashboard_link': 'https://example.com/dashboard',
            'docs_link': 'https://docs.example.com',
            'onboarding_url': 'https://example.com/onboarding',
            'contact_email': 'support@example.com',
            'frontend_url': 'https://example.com',
        }
        template = get_template('email/welcome.txt')
        rendered = template.render(context)
        assert 'Tickflow' in rendered or 'welcome' in rendered.lower()
        assert user.username in rendered or user.email in rendered

    def test_account_deletion_html(self, user):
        user.deletion_scheduled_for = timezone.now() + timezone.timedelta(days=30)
        context = {
            'user': user,
            'cancellation_link': 'https://example.com/cancel-deletion',
            'scheduled_for': user.deletion_scheduled_for.strftime('%B %d, %Y'),
            'days_left': 30,
            'year': timezone.now().year,
            'contact_email': 'support@example.com',
            'frontend_url': 'https://example.com',
        }
        template = get_template('email/account_deletion.html')
        rendered = template.render(context)
        assert 'Tickflow' in rendered or 'deletion' in rendered.lower()
        assert user.username in rendered or user.email in rendered

    def test_account_deletion_txt(self, user):
        user.deletion_scheduled_for = timezone.now() + timezone.timedelta(days=30)
        context = {
            'user': user,
            'cancellation_link': 'https://example.com/cancel-deletion',
            'scheduled_for': user.deletion_scheduled_for.strftime('%B %d, %Y'),
            'days_left': 30,
            'contact_email': 'support@example.com',
            'frontend_url': 'https://example.com',
        }
        template = get_template('email/account_deletion.txt')
        rendered = template.render(context)
        assert 'Tickflow' in rendered or 'deletion' in rendered.lower()
        assert user.username in rendered or user.email in rendered