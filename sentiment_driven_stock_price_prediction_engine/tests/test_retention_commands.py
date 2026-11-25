from datetime import timedelta

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone

from authentication.models import (
    AuditLog,
    PrivacyNoticeAcknowledgement,
    SymbolUsage,
    TermsAcceptance,
    User,
    UserAPIKey,
)
from tests.factories import UserFactory


@pytest.mark.django_db
def test_purge_removes_due_account_and_user_linked_personal_records():
    user = UserFactory(is_active=False)
    user.deletion_requested_at = timezone.now() - timedelta(days=31)
    user.deletion_scheduled_for = timezone.now() - timedelta(days=1)
    user.save(update_fields=['is_active', 'deletion_requested_at', 'deletion_scheduled_for', 'updated_at'])

    AuditLog.objects.create(
        user=user,
        action='ACCOUNT_DELETION_REQUESTED',
        details={'email': user.email, 'ip': '192.0.2.1'},
    )
    SymbolUsage.objects.create(user=user, symbol='AAPL', count=1)
    key, _raw = UserAPIKey.create_key(user, 'test-key')
    terms = TermsAcceptance.objects.create(user=user, version='1.0', content_hash='a' * 64)
    privacy = PrivacyNoticeAcknowledgement.objects.create(
        user=user, version='1.0', content_hash='b' * 64
    )

    call_command('purge_scheduled_accounts')

    assert not User.objects.filter(pk=user.pk).exists()
    assert not AuditLog.objects.filter(action='ACCOUNT_DELETION_REQUESTED').exists()
    assert not SymbolUsage.objects.filter(user_id=user.pk).exists()
    assert not UserAPIKey.objects.filter(pk=key.pk).exists()
    terms.refresh_from_db()
    privacy.refresh_from_db()
    assert terms.user_id is None
    assert privacy.user_id is None


@pytest.mark.django_db
def test_purge_dry_run_does_not_delete_due_account():
    user = UserFactory(is_active=False)
    user.deletion_requested_at = timezone.now() - timedelta(days=31)
    user.deletion_scheduled_for = timezone.now() - timedelta(days=1)
    user.save(update_fields=['is_active', 'deletion_requested_at', 'deletion_scheduled_for', 'updated_at'])

    call_command('purge_scheduled_accounts', '--dry-run')

    assert User.objects.filter(pk=user.pk).exists()


@pytest.mark.django_db
@pytest.mark.parametrize('state', ['future', 'cancelled', 'active'])
def test_purge_does_not_delete_accounts_outside_due_state(state):
    user = UserFactory(is_active=(state == 'active'))
    user.deletion_requested_at = None if state == 'cancelled' else timezone.now() - timedelta(days=31)
    user.deletion_scheduled_for = (
        timezone.now() + timedelta(days=1) if state == 'future'
        else None if state == 'cancelled'
        else timezone.now() - timedelta(days=1)
    )
    user.save(update_fields=['is_active', 'deletion_requested_at', 'deletion_scheduled_for', 'updated_at'])

    call_command('purge_scheduled_accounts')

    assert User.objects.filter(pk=user.pk).exists()


@pytest.mark.django_db
def test_purge_rejects_invalid_batch_size():
    with pytest.raises(CommandError):
        call_command('purge_scheduled_accounts', batch_size=0)
