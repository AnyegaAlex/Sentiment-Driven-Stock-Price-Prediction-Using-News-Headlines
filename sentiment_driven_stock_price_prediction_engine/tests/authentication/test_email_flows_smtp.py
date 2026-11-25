"""
Email flows through the SMTP transport (the path Brevo uses), with SendGrid unset.

Brevo itself is not contacted: the production key is never used in tests. A local
SMTP server receives the real SMTP conversation, which exercises the same Django
SMTP backend and send path used in production. Actual Brevo delivery must be
confirmed separately with the production key by an authorised person.
"""

import smtplib
import threading
from unittest import mock

import pytest
from aiosmtpd.controller import Controller
from django.test import RequestFactory
from django.core import mail

from authentication import utils
from authentication.models import User



@pytest.fixture(autouse=True)
def mock_sendgrid():
    """Override the suite-wide autouse mock in tests/conftest.py, which patches
    send_email_sync for every test. These tests must run the real send path."""
    yield None


def _free_port() -> int:
    """A free local port, so parallel CI jobs cannot collide."""
    import socket
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class _Collector:
    def __init__(self):
        self.messages = []
        self.port = None

    async def handle_DATA(self, server, session, envelope):
        self.messages.append((envelope.mail_from, list(envelope.rcpt_tos), envelope.content))
        return "250 OK"


@pytest.fixture
def smtp_server():
    handler = _Collector()
    handler.port = _free_port()
    controller = Controller(handler, hostname="127.0.0.1", port=handler.port)
    controller.start()
    try:
        yield handler
    finally:
        controller.stop()


@pytest.fixture
def user(db):
    from datetime import timedelta
    from django.utils import timezone
    u = User.objects.create_user(username="brevo_flow", email="brevo_flow@example.com", password="Str0ng-pass-123")
    # Account deletion emails read the scheduled date; set it as the real request flow does.
    u.deletion_requested_at = timezone.now()
    u.deletion_scheduled_for = timezone.now() + timedelta(days=30)
    u.save(update_fields=["deletion_requested_at", "deletion_scheduled_for"])
    return u


@pytest.fixture
def request_obj():
    return RequestFactory().get("/", HTTP_HOST="testserver")


def _use_smtp(settings, port):
    """Point Django at the local SMTP server for this test (pytest-django settings fixture)."""
    for key, value in BREVO_SMTP_SETTINGS.items():
        setattr(settings, key, value)
    settings.EMAIL_PORT = port


BREVO_SMTP_SETTINGS = dict(
    EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
    EMAIL_HOST="127.0.0.1",
    EMAIL_USE_TLS=False,       # local test server only; production uses TLS to Brevo
    EMAIL_USE_SSL=False,
    EMAIL_HOST_USER="",
    EMAIL_HOST_PASSWORD="",
    SENDGRID_API_KEY="",       # SendGrid deliberately unset: SMTP only
)


def test_brevo_configuration_points_at_brevo_relay(settings):
    """The resolved Django settings name the Brevo relay on the submission port (no network)."""
    assert settings.EMAIL_HOST == "smtp-relay.brevo.com"
    assert settings.EMAIL_PORT == 587


@pytest.mark.django_db
def test_verification_email_delivered_over_smtp(settings, smtp_server, user, request_obj):
    _use_smtp(settings, smtp_server.port)
    assert utils.send_verification_email(user, request_obj) is True
    assert len(mail.outbox) == 0, "in-memory backend was used, not SMTP"
    assert smtp_server.messages, "no SMTP message received"
    _sender, recipients, content = smtp_server.messages[-1]
    assert recipients == ["brevo_flow@example.com"]
    assert b"verify" in content.lower()


@pytest.mark.django_db
def test_password_reset_email_delivered_over_smtp(settings, smtp_server, user, request_obj):
    _use_smtp(settings, smtp_server.port)
    assert utils.send_password_reset_email(user, request_obj) is True
    assert smtp_server.messages
    assert smtp_server.messages[-1][1] == ["brevo_flow@example.com"]


@pytest.mark.django_db
def test_welcome_and_deletion_emails_delivered_over_smtp(settings, smtp_server, user, request_obj):
    _use_smtp(settings, smtp_server.port)
    assert utils.send_welcome_email(user, request_obj) is True
    assert utils.send_account_deletion_confirmation(user, request_obj) is True
    assert len(smtp_server.messages) >= 2


@pytest.mark.django_db
def test_email_change_code_delivered_over_smtp(settings, smtp_server):
    _use_smtp(settings, smtp_server.port)
    assert utils.send_email_change_code("new_address@example.com", "123456") is True
    assert smtp_server.messages[-1][1] == ["new_address@example.com"]


@pytest.mark.django_db
def test_all_required_flows_render_and_reach_outbox(settings, user, request_obj):
    """Subject, recipient and body are produced for every required flow (in-memory backend)."""
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.SENDGRID_API_KEY = ""
    mail.outbox = []
    results = [
        utils.send_verification_email(user, request_obj),
        utils.send_password_reset_email(user, request_obj),
        utils.send_welcome_email(user, request_obj),
        utils.send_account_deletion_confirmation(user, request_obj),
        utils.send_email_change_code("new_address@example.com", "654321"),
    ]
    assert all(results)
    assert len(mail.outbox) == 5
    for msg in mail.outbox:
        assert msg.subject
        assert msg.to
        assert msg.body
