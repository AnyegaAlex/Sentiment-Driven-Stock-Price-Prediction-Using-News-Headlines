# tests/authentication/test_email_utils.py
import pytest
from unittest.mock import patch
from django.core import mail
from authentication.utils import send_email_sync, validate_email


@pytest.mark.django_db
class TestEmailUtils:
    def test_send_email_sync_uses_configured_backend(self, settings):
        settings.DEFAULT_FROM_EMAIL = "test@tickflow.com"
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

        result = send_email_sync("Test Subject", "test@example.com", "<h1>Hi</h1>")

        assert result is True
        assert len(mail.outbox) == 1
        assert mail.outbox[0].subject == "Test Subject"
        assert mail.outbox[0].to == ["test@example.com"]
        assert mail.outbox[0].alternatives[0][0] == "<h1>Hi</h1>"

    def test_send_email_sync_retries_configured_backend(self, settings):
        settings.DEFAULT_FROM_EMAIL = "test@tickflow.com"
        with patch("authentication.utils.send_mail", side_effect=[OSError("SMTP unavailable"), 1]) as send:
            with patch("authentication.utils.time.sleep"):
                result = send_email_sync("Retry", "retry@example.com", "<p>Retry</p>")

        assert result is True
        assert send.call_count == 2

    def test_send_email_sync_returns_false_after_retries(self):
        with patch("authentication.utils.send_mail", side_effect=OSError("SMTP unavailable")) as send:
            with patch("authentication.utils.time.sleep"):
                result = send_email_sync("Failure", "failure@example.com", "<p>Failure</p>")

        assert result is False
        assert send.call_count == 2

    def test_send_email_sync_invalid_email(self):
        result = send_email_sync("Test", "not-an-email", "<h1>Hi</h1>")
        assert result is False

    def test_validate_email(self):
        assert validate_email("test@example.com") is True
        assert validate_email("invalid-email") is False
        assert validate_email("") is False
