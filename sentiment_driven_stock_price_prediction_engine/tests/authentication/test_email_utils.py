# tests/authentication/test_email_utils.py
import pytest
from unittest.mock import patch, MagicMock
from django.core import mail
from authentication.utils import send_email_sync, validate_email

@pytest.mark.django_db
class TestEmailUtils:

    def test_send_email_sync_sendgrid_success(self, settings):
        """Test that SendGrid is called and returns True on success."""
        # ✅ INJECT a dummy SendGrid API key for this test
        settings.SENDGRID_API_KEY = "SG.dummy_test_key"
        settings.DEFAULT_FROM_EMAIL = "test@tickflow.com"

        with patch('sendgrid.SendGridAPIClient.send') as mock_send:
            mock_response = MagicMock()
            mock_response.status_code = 202
            mock_send.return_value = mock_response

            # Call the function directly
            result = send_email_sync("Test Subject", "test@example.com", "<h1>Hi</h1>")
            
            assert result is True
            assert mock_send.called
            assert len(mail.outbox) == 0 # SMTP not triggered

    def test_send_email_sync_fallback_to_smtp(self, settings):
        """Test that SMTP is used if SendGrid fails."""
        # ✅ INJECT a dummy key so SendGrid is attempted
        settings.SENDGRID_API_KEY = "SG.dummy_test_key"
        settings.DEFAULT_FROM_EMAIL = "test@tickflow.com"
        settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
        
        with patch('sendgrid.SendGridAPIClient.send') as mock_send:
            mock_send.side_effect = Exception("SendGrid is down")

            result = send_email_sync("SMTP Fallback", "fallback@example.com", "<h1>Fallback</h1>")
            
            assert result is True
            assert len(mail.outbox) == 1
            assert mail.outbox[0].subject == "SMTP Fallback"
            assert mail.outbox[0].to == ["fallback@example.com"]

    def test_send_email_sync_invalid_email(self):
        """Test that invalid emails are rejected early."""
        result = send_email_sync("Test", "not-an-email", "<h1>Hi</h1>")
        assert result is False

    def test_validate_email(self):
        assert validate_email("test@example.com") is True
        assert validate_email("invalid-email") is False
        assert validate_email("") is False