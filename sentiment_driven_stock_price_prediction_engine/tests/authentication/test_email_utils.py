import pytest
from unittest.mock import patch
from django.core import mail
from authentication.utils import send_email_sync, validate_email, check_email_service_health


@pytest.mark.django_db
class TestEmailUtils:
    def test_brevo_smtp_is_primary(self, settings):
        settings.DEFAULT_FROM_EMAIL = "test@tickflow.com"
        settings.SENDGRID_API_KEY = "SG.optional-fallback"
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

        with patch("authentication.utils._send_via_sendgrid") as fallback:
            result = send_email_sync("Test Subject", "test@example.com", "<h1>Hi</h1>")

        assert result is True
        assert len(mail.outbox) == 1
        fallback.assert_not_called()

    def test_sendgrid_is_used_only_after_brevo_fails(self, settings):
        settings.DEFAULT_FROM_EMAIL = "test@tickflow.com"
        settings.SENDGRID_API_KEY = "SG.optional-fallback"

        with patch("authentication.utils.send_mail", side_effect=OSError("SMTP unavailable")) as smtp:
            with patch("authentication.utils._send_via_sendgrid", return_value=True) as fallback:
                result = send_email_sync("Fallback", "fallback@example.com", "<h1>Fallback</h1>", retry_count=1)

        assert result is True
        smtp.assert_called_once()
        fallback.assert_called_once()

    def test_false_when_both_providers_fail(self, settings):
        settings.DEFAULT_FROM_EMAIL = "test@tickflow.com"
        settings.SENDGRID_API_KEY = None
        with patch("authentication.utils.send_mail", side_effect=OSError("SMTP unavailable")):
            assert send_email_sync("Failure", "test@example.com", "<p>Hi</p>", retry_count=1) is False

    def test_invalid_email_is_rejected_without_provider_calls(self):
        with patch("authentication.utils.send_mail") as smtp:
            assert send_email_sync("Test", "not-an-email", "<h1>Hi</h1>") is False
        smtp.assert_not_called()

    def test_validate_email(self):
        assert validate_email("test@example.com") is True
        assert validate_email("invalid-email") is False
        assert validate_email("") is False

    def test_health_reports_primary_and_optional_fallback(self, settings):
        settings.EMAIL_HOST = "smtp-relay.brevo.com"
        settings.EMAIL_HOST_USER = "brevo-login"
        settings.EMAIL_HOST_PASSWORD = "configured"
        settings.SENDGRID_API_KEY = None
        health = check_email_service_health()
        assert health["available"] is True
        assert health["provider"] == "brevo_smtp"
        assert health["fallback_configured"] is False
        assert health["check_type"] == "configuration_only"
