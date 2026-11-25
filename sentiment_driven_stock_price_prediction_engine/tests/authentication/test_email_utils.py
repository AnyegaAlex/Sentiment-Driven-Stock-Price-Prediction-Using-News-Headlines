from types import SimpleNamespace
from unittest.mock import patch

import pytest
import requests

from authentication.utils import check_email_service_health, send_email_sync, validate_email


@pytest.mark.django_db
class TestEmailUtils:
    def test_send_email_sync_uses_brevo_api_payload(self, settings):
        settings.BREVO_API_KEY = 'test-brevo-api-key'
        settings.BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
        settings.DEFAULT_FROM_EMAIL = 'info@tickflowcapital.com'
        settings.DEFAULT_FROM_NAME = 'Tickflow Capital'
        response = SimpleNamespace(status_code=201)

        with patch('authentication.utils.requests.post', return_value=response) as post:
            result = send_email_sync('Test Subject', 'test@example.com', '<h1>Hello</h1>', 'Hello')

        assert result is True
        args, kwargs = post.call_args
        assert args[0] == settings.BREVO_API_URL
        assert kwargs['headers']['api-key'] == 'test-brevo-api-key'
        assert kwargs['timeout'] == settings.EMAIL_TIMEOUT
        assert kwargs['json']['sender'] == {
            'name': 'Tickflow Capital',
            'email': 'info@tickflowcapital.com',
        }
        assert kwargs['json']['to'] == [{'email': 'test@example.com'}]
        assert kwargs['json']['subject'] == 'Test Subject'
        assert kwargs['json']['textContent'] == 'Hello'
        assert kwargs['json']['htmlContent'] == '<h1>Hello</h1>'

    def test_send_email_sync_retries_transient_brevo_errors(self, settings):
        settings.BREVO_API_KEY = 'test-brevo-api-key'
        responses = [SimpleNamespace(status_code=503), SimpleNamespace(status_code=201)]
        with patch('authentication.utils.requests.post', side_effect=responses) as post:
            with patch('authentication.utils.time.sleep'):
                assert send_email_sync('Retry', 'retry@example.com', '<p>Retry</p>') is True
        assert post.call_count == 2

    def test_send_email_sync_does_not_retry_permanent_brevo_rejection(self, settings):
        settings.BREVO_API_KEY = 'test-brevo-api-key'
        with patch('authentication.utils.requests.post', return_value=SimpleNamespace(status_code=400)) as post:
            assert send_email_sync('Rejected', 'reject@example.com', '<p>Rejected</p>') is False
        assert post.call_count == 1

    def test_send_email_sync_returns_false_when_brevo_api_is_unavailable(self, settings):
        settings.BREVO_API_KEY = 'test-brevo-api-key'
        with patch('authentication.utils.requests.post', side_effect=requests.ConnectionError('network unavailable')):
            with patch('authentication.utils.time.sleep'):
                assert send_email_sync('Failure', 'fail@example.com', '<p>Failure</p>') is False

    def test_local_development_uses_console_when_api_key_is_missing(self, settings):
        settings.BREVO_API_KEY = None
        settings.DEBUG = True
        settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
        from django.core import mail
        mail.outbox = []
        assert send_email_sync('Local', 'local@example.com', '<p>Local</p>') is True
        assert len(mail.outbox) == 1

    def test_production_does_not_report_console_output_as_delivery(self, settings):
        settings.BREVO_API_KEY = None
        settings.DEBUG = False
        assert send_email_sync('No delivery', 'test@example.com', '<p>Test</p>') is False

    def test_health_check_uses_brevo_account_endpoint(self, settings):
        settings.BREVO_API_KEY = 'test-brevo-api-key'
        settings.BREVO_ACCOUNT_URL = 'https://api.brevo.com/v3/account'
        with patch('authentication.utils.requests.get', return_value=SimpleNamespace(status_code=200)) as get:
            result = check_email_service_health()
        assert result == {'available': True, 'status': 'healthy', 'provider': 'brevo_api'}
        assert get.call_args.args[0] == settings.BREVO_ACCOUNT_URL

    def test_send_email_sync_sendgrid_4xx_still_falls_back_to_smtp(self, settings):
        """A SendGrid 4xx (for example an unverified sender) must not skip the SMTP fallback."""
        settings.SENDGRID_API_KEY = "SG.dummy_test_key"
        settings.DEFAULT_FROM_EMAIL = "test@tickflow.com"
        settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

        with patch('sendgrid.SendGridAPIClient.send') as mock_send:
            mock_response = MagicMock()
            mock_response.status_code = 403
            mock_response.body = b'{"errors": [{"message": "sender identity not verified"}]}'
            mock_send.return_value = mock_response

            result = send_email_sync("Rejected", "rejected@example.com", "<h1>Hi</h1>")

            assert result is True
            assert len(mail.outbox) == 1
            assert mail.outbox[0].to == ["rejected@example.com"]
            assert mock_send.call_count == 1, "a 4xx must not be retried on SendGrid"

    def test_send_email_sync_invalid_email(self):
        assert send_email_sync('Test', 'not-an-email', '<h1>Hi</h1>') is False

    def test_validate_email(self):
        assert validate_email('test@example.com') is True
        assert validate_email('invalid-email') is False
        assert validate_email('') is False
