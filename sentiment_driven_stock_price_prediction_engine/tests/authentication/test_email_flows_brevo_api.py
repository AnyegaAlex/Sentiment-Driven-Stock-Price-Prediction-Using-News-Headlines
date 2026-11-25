from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.test import RequestFactory
from django.utils import timezone

from authentication import utils
from authentication.models import User


@pytest.fixture(autouse=True)
def mock_transactional_email():
    # Override the suite-wide fixture so these tests exercise the real API sender.
    yield None


@pytest.fixture
def user(db):
    account = User.objects.create_user(
        username='brevo_flow',
        email='brevo_flow@example.com',
        password='Str0ng-pass-123',
    )
    account.deletion_requested_at = timezone.now()
    account.deletion_scheduled_for = timezone.now() + timedelta(days=30)
    account.save(update_fields=['deletion_requested_at', 'deletion_scheduled_for'])
    return account


@pytest.fixture
def request_obj():
    return RequestFactory().get('/', HTTP_HOST='testserver')


@pytest.mark.django_db
def test_verification_email_uses_brevo_api(settings, user, request_obj):
    settings.BREVO_API_KEY = 'test-brevo-api-key'
    with patch('authentication.utils.requests.post', return_value=SimpleNamespace(status_code=201)) as post:
        assert utils.send_verification_email(user, request_obj) is True
    payload = post.call_args.kwargs['json']
    assert payload['to'] == [{'email': 'brevo_flow@example.com'}]
    assert 'verify' in payload['htmlContent'].lower()


@pytest.mark.django_db
def test_password_reset_email_uses_brevo_api(settings, user, request_obj):
    settings.BREVO_API_KEY = 'test-brevo-api-key'
    with patch('authentication.utils.requests.post', return_value=SimpleNamespace(status_code=201)) as post:
        assert utils.send_password_reset_email(user, request_obj) is True
    assert post.call_args.kwargs['json']['to'][0]['email'] == 'brevo_flow@example.com'


@pytest.mark.django_db
def test_welcome_and_deletion_emails_use_brevo_api(settings, user, request_obj):
    settings.BREVO_API_KEY = 'test-brevo-api-key'
    with patch('authentication.utils.requests.post', return_value=SimpleNamespace(status_code=201)) as post:
        assert utils.send_welcome_email(user, request_obj) is True
        assert utils.send_account_deletion_confirmation(user, request_obj) is True
    assert post.call_count == 2
    deletion_html = post.call_args_list[1].kwargs['json']['htmlContent']
    assert '/cancel-deletion?uid=' in deletion_html or 'cancel-deletion?uid=' in deletion_html


@pytest.mark.django_db
def test_email_change_code_uses_brevo_api(settings):
    settings.BREVO_API_KEY = 'test-brevo-api-key'
    with patch('authentication.utils.requests.post', return_value=SimpleNamespace(status_code=201)) as post:
        assert utils.send_email_change_code('new_address@example.com', '123456') is True
    assert post.call_args.kwargs['json']['to'] == [{'email': 'new_address@example.com'}]


@pytest.mark.django_db
def test_all_required_email_flows_use_brevo_api(settings, user, request_obj):
    settings.BREVO_API_KEY = 'test-brevo-api-key'
    with patch('authentication.utils.requests.post', return_value=SimpleNamespace(status_code=201)) as post:
        results = [
            utils.send_verification_email(user, request_obj),
            utils.send_password_reset_email(user, request_obj),
            utils.send_welcome_email(user, request_obj),
            utils.send_account_deletion_confirmation(user, request_obj),
            utils.send_email_change_code('new_address@example.com', '654321'),
        ]
    assert all(results)
    assert post.call_count == 5
    assert all(call.kwargs['json']['sender']['email'] == settings.DEFAULT_FROM_EMAIL for call in post.call_args_list)
