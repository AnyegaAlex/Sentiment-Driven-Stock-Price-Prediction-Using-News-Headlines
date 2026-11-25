"""
GAP-03: versioned Terms acceptance, Privacy acknowledgement and the existing-user gate.

Not executed in the authoring environment (Django suite cannot run there).
Run in CI: pytest tests/authentication/test_legal_acceptance.py
"""

import hashlib
import json
from pathlib import Path

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.legal_config import PRIVACY_NOTICE, TERMS
from authentication.models import PrivacyNoticeAcknowledgement, TermsAcceptance, User

REPO_ROOT = Path(__file__).resolve().parents[3]
API = "/api/v1/auth/"


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_config_hashes_match_frontend_source():
    """The pinned hashes must match the canonical documents. Fails if a legal page changes without a version bump.

    Set REQUIRE_FRONTEND_LEGAL_CHECK=1 in CI so a missing frontend checkout fails instead of skipping."""
    import os
    for doc in (TERMS, PRIVACY_NOTICE):
        source = REPO_ROOT / doc.source_path
        if not source.exists():
            if os.getenv("REQUIRE_FRONTEND_LEGAL_CHECK") == "1":
                pytest.fail(f"frontend canonical document missing: {doc.source_path}")
            pytest.skip(f"frontend source not present: {doc.source_path}")
        assert _sha256(source) == doc.sha256, f"{doc.key} source changed; bump the version and hash"


def test_canonical_document_versions_match_server_config():
    """Frontend canonical files and server config must declare the same version."""
    import json
    import os
    for doc in (TERMS, PRIVACY_NOTICE):
        source = REPO_ROOT / doc.source_path
        if not source.exists():
            if os.getenv("REQUIRE_FRONTEND_LEGAL_CHECK") == "1":
                pytest.fail(f"frontend canonical document missing: {doc.source_path}")
            pytest.skip(f"frontend canonical document not present: {doc.source_path}")
        assert json.loads(source.read_text(encoding="utf-8"))["version"] == doc.version


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def verified_user(db):
    user = User.objects.create_user(username="legal_user", email="legal_user@example.com", password="Str0ng-pass-123")
    user.email_verified = True
    user.save(update_fields=["email_verified"])
    return user


def _auth(user):
    return {"HTTP_AUTHORIZATION": f"Bearer {RefreshToken.for_user(user).access_token}"}


def _register_payload(**overrides):
    payload = {
        "username": "new_legal_user",
        "email": "new_legal_user@example.com",
        "password": "Str0ng-pass-123",
        "password2": "Str0ng-pass-123",
        "accept_terms": True,
        "acknowledge_privacy_notice": True,
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_registration_requires_terms_acceptance(client):
    resp = client.post(API + "register/", _register_payload(accept_terms=False), format="json")
    assert resp.status_code == 400
    assert "accept_terms" in resp.json()


@pytest.mark.django_db
def test_registration_requires_privacy_acknowledgement(client):
    resp = client.post(API + "register/", _register_payload(acknowledge_privacy_notice=False), format="json")
    assert resp.status_code == 400
    assert "acknowledge_privacy_notice" in resp.json()


@pytest.mark.django_db
def test_registration_records_server_versions_not_client_values(client):
    payload = _register_payload(terms_version="1999-01-01", content_hash="bogus")
    resp = client.post(API + "register/", payload, format="json")
    assert resp.status_code in (200, 201), resp.content
    user = User.objects.get(username="new_legal_user")
    terms = TermsAcceptance.objects.get(user=user)
    privacy = PrivacyNoticeAcknowledgement.objects.get(user=user)
    assert (terms.version, terms.content_hash) == (TERMS.version, TERMS.sha256)
    assert (privacy.version, privacy.content_hash) == (PRIVACY_NOTICE.version, PRIVACY_NOTICE.sha256)


@pytest.mark.django_db
def test_existing_user_without_acceptance_is_gated(client, verified_user):
    resp = client.get(API + "preferences/", **_auth(verified_user))
    assert resp.status_code == 403
    assert resp.json().get("code") == "legal_acceptance_required" or "legal_acceptance_required" in resp.content.decode()


@pytest.mark.django_db
def test_gate_exempts_legal_status_and_profile_read(client, verified_user):
    assert client.get(API + "legal/", **_auth(verified_user)).status_code == 200
    assert client.get(API + "profile/", **_auth(verified_user)).status_code == 200


@pytest.mark.django_db
def test_accept_then_normal_endpoints_open(client, verified_user):
    headers = _auth(verified_user)
    resp = client.post(API + "legal/", {"accept_terms": True, "acknowledge_privacy_notice": True}, format="json", **headers)
    assert resp.status_code == 200
    assert client.get(API + "preferences/", **headers).status_code == 200


@pytest.mark.django_db
def test_accept_rejects_partial_flags(client, verified_user):
    resp = client.post(API + "legal/", {"accept_terms": True}, format="json", **_auth(verified_user))
    assert resp.status_code == 400
    assert not TermsAcceptance.objects.filter(user=verified_user).exists()


# ---------------------------------------------------------------------------
# API-key clients (GAP-03 decision: gated like web users)
# ---------------------------------------------------------------------------

from datetime import timedelta
from unittest import mock

from django.utils import timezone

from authentication.models import UserAPIKey


def _key_headers(raw_key):
    return {"HTTP_X_API_KEY": raw_key}


@pytest.fixture(autouse=True)
def _clear_auth_cache():
    """API-key lookups and rate limits are cached; keep tests independent."""
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_key(verified_user):
    _obj, raw = UserAPIKey.create_key(verified_user, name="integration")
    return raw, _obj


@pytest.mark.django_db
def test_api_key_without_acceptance_gets_403_with_code_and_endpoint(client, verified_user, api_key):
    raw, _ = api_key
    resp = client.get(API + "preferences/", **_key_headers(raw))
    assert resp.status_code == 403
    body = resp.json()
    assert body["code"] == "legal_acceptance_required"
    assert body["acceptance"]["endpoint"] == "/api/v1/auth/legal/"
    assert body["acceptance"]["method"] == "POST"
    assert json.loads(body["acceptance"]["body_example"]) == {"accept_terms": True, "acknowledge_privacy_notice": True}


@pytest.mark.django_db
def test_api_key_owner_accepts_with_same_key_and_access_is_restored(client, verified_user, api_key):
    raw, key_obj = api_key
    headers = _key_headers(raw)
    assert client.get(API + "preferences/", **headers).status_code == 403

    resp = client.post(
        API + "legal/",
        {"accept_terms": True, "acknowledge_privacy_notice": True},
        format="json",
        **headers,
    )
    assert resp.status_code == 200
    # Same key, no replacement needed.
    assert client.get(API + "preferences/", **headers).status_code == 200
    assert UserAPIKey.objects.get(pk=key_obj.pk).is_active is True


@pytest.mark.django_db
def test_revoked_api_key_cannot_accept(client, verified_user, api_key):
    raw, key_obj = api_key
    key_obj.revoke()
    resp = client.post(
        API + "legal/",
        {"accept_terms": True, "acknowledge_privacy_notice": True},
        format="json",
        **_key_headers(raw),
    )
    assert resp.status_code == 401
    assert not TermsAcceptance.objects.filter(user=verified_user).exists()
    assert not PrivacyNoticeAcknowledgement.objects.filter(user=verified_user).exists()


@pytest.mark.django_db
def test_expired_api_key_cannot_accept(client, verified_user):
    _obj, raw = UserAPIKey.create_key(
        verified_user, name="old", expires_at=timezone.now() - timedelta(days=1)
    )
    resp = client.post(
        API + "legal/",
        {"accept_terms": True, "acknowledge_privacy_notice": True},
        format="json",
        **_key_headers(raw),
    )
    assert resp.status_code == 401
    assert not TermsAcceptance.objects.filter(user=verified_user).exists()


@pytest.mark.django_db
def test_invalid_api_key_cannot_accept(client, verified_user):
    resp = client.post(
        API + "legal/",
        {"accept_terms": True, "acknowledge_privacy_notice": True},
        format="json",
        **_key_headers("not-a-real-key"),
    )
    assert resp.status_code == 401
    assert not TermsAcceptance.objects.filter(user=verified_user).exists()


# ---------------------------------------------------------------------------
# Exemptions and gated routes
# ---------------------------------------------------------------------------

EXEMPT_CALLS = [
    ("get", "legal/", None),
    ("get", "profile/", None),
    ("post", "password-reset/", {"email": "legal_user@example.com"}),
    ("post", "resend-verification/", {"email": "legal_user@example.com"}),
    ("get", "delete-account/", None),
]

GATED_CALLS = [
    ("get", "preferences/", None),
    ("get", "watchlist/", None),
    ("get", "api-keys/", None),
    ("post", "profile/change-password/", {"old_password": "x", "new_password": "y", "new_password2": "y"}),
]


@pytest.mark.django_db
@pytest.mark.parametrize("method,path,data", EXEMPT_CALLS)
def test_exempt_paths_are_not_gated(client, verified_user, method, path, data):
    kwargs = {"format": "json"} if data is not None else {}
    resp = getattr(client, method)(API + path, data or {}, **kwargs, **_auth(verified_user)) \
        if method == "post" else client.get(API + path, **_auth(verified_user))
    assert "legal_acceptance_required" not in resp.content.decode()


@pytest.mark.django_db
@pytest.mark.parametrize("method,path,data", GATED_CALLS)
def test_normal_routes_are_gated(client, verified_user, method, path, data):
    kwargs = {"format": "json"} if data is not None else {}
    resp = getattr(client, method)(API + path, data or {}, **kwargs, **_auth(verified_user)) \
        if method == "post" else client.get(API + path, **_auth(verified_user))
    assert resp.status_code == 403
    assert resp.json()["code"] == "legal_acceptance_required"


@pytest.mark.django_db
def test_partial_acceptance_still_gated(client, verified_user):
    TermsAcceptance.objects.create(user=verified_user, version=TERMS.version, content_hash=TERMS.sha256)
    resp = client.get(API + "preferences/", **_auth(verified_user))
    assert resp.status_code == 403


@pytest.mark.django_db
def test_stale_version_does_not_count_as_acceptance(client, verified_user):
    TermsAcceptance.objects.create(user=verified_user, version="1999-01-01", content_hash="old")
    PrivacyNoticeAcknowledgement.objects.create(user=verified_user, version="1999-01-01", content_hash="old")
    resp = client.get(API + "preferences/", **_auth(verified_user))
    assert resp.status_code == 403


@pytest.mark.django_db
def test_accept_is_idempotent(client, verified_user):
    headers = _auth(verified_user)
    for _ in range(2):
        assert client.post(
            API + "legal/", {"accept_terms": True, "acknowledge_privacy_notice": True},
            format="json", **headers,
        ).status_code == 200
    assert TermsAcceptance.objects.filter(user=verified_user).count() == 1
    assert PrivacyNoticeAcknowledgement.objects.filter(user=verified_user).count() == 1


# ---------------------------------------------------------------------------
# Atomic registration
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_registration_rolls_back_account_if_terms_record_fails(client):
    with mock.patch("authentication.views.TermsAcceptance.objects.create", side_effect=RuntimeError("boom")):
        resp = client.post(API + "register/", _register_payload(username="rollback_user",
                                                               email="rollback@example.com"), format="json")
    assert resp.status_code == 400
    assert not User.objects.filter(username="rollback_user").exists()


@pytest.mark.django_db
def test_registration_rolls_back_account_if_privacy_record_fails(client):
    with mock.patch("authentication.views.PrivacyNoticeAcknowledgement.objects.create",
                    side_effect=RuntimeError("boom")):
        resp = client.post(API + "register/", _register_payload(username="rollback_user2",
                                                               email="rollback2@example.com"), format="json")
    assert resp.status_code == 400
    assert not User.objects.filter(username="rollback_user2").exists()
    assert not TermsAcceptance.objects.filter(user__username="rollback_user2").exists()


# ---------------------------------------------------------------------------
# Real key lifecycle (no patched lookup): cached keys must still be revocable
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_valid_key_regains_access_only_after_acceptance(client, verified_user):
    _obj, raw = UserAPIKey.create_key(verified_user, name="lifecycle")
    headers = _key_headers(raw)
    assert client.get(API + "preferences/", **headers).status_code == 403
    assert client.post(
        API + "legal/", {"accept_terms": True, "acknowledge_privacy_notice": True},
        format="json", **headers,
    ).status_code == 200
    assert client.get(API + "preferences/", **headers).status_code == 200


@pytest.mark.django_db
def test_key_revoked_after_being_cached_is_rejected(client, verified_user):
    _accept(verified_user)
    key_obj, raw = UserAPIKey.create_key(verified_user, name="cached")
    headers = _key_headers(raw)
    assert client.get(API + "preferences/", **headers).status_code == 200  # populates cache
    key_obj.revoke()
    assert client.get(API + "preferences/", **headers).status_code == 401


@pytest.mark.django_db
def test_key_expired_after_being_cached_is_rejected(client, verified_user):
    _accept(verified_user)
    key_obj, raw = UserAPIKey.create_key(verified_user, name="cached-exp")
    headers = _key_headers(raw)
    assert client.get(API + "preferences/", **headers).status_code == 200
    UserAPIKey.objects.filter(pk=key_obj.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    assert client.get(API + "preferences/", **headers).status_code == 401


def _accept(user):
    TermsAcceptance.objects.create(user=user, version=TERMS.version, content_hash=TERMS.sha256)
    PrivacyNoticeAcknowledgement.objects.create(user=user, version=PRIVACY_NOTICE.version, content_hash=PRIVACY_NOTICE.sha256)


@pytest.mark.django_db
def test_same_version_new_hash_requires_and_accepts_reacceptance(client, verified_user):
    """A stale row for the same version string (old hash) must not gate the user forever."""
    TermsAcceptance.objects.create(user=verified_user, version=TERMS.version, content_hash="stale-hash")
    PrivacyNoticeAcknowledgement.objects.create(user=verified_user, version=PRIVACY_NOTICE.version, content_hash="stale-hash")
    headers = _auth(verified_user)
    assert client.get(API + "preferences/", **headers).status_code == 403

    resp = client.post(API + "legal/", {"accept_terms": True, "acknowledge_privacy_notice": True}, format="json", **headers)
    assert resp.status_code == 200
    assert client.get(API + "preferences/", **headers).status_code == 200
    assert TermsAcceptance.objects.get(user=verified_user).content_hash == TERMS.sha256


@pytest.mark.django_db
def test_acceptance_is_atomic_when_second_write_fails(client, verified_user):
    """If the privacy acknowledgement fails, the terms acceptance must not persist alone."""
    with mock.patch("authentication.legal_views.PrivacyNoticeAcknowledgement.objects.update_or_create",
                    side_effect=RuntimeError("boom")):
        with pytest.raises(RuntimeError):
            client.post(API + "legal/", {"accept_terms": True, "acknowledge_privacy_notice": True},
                        format="json", **_auth(verified_user))
    assert not TermsAcceptance.objects.filter(user=verified_user).exists()


@pytest.mark.django_db
def test_cached_key_is_revalidated_on_hit_after_revocation(client, verified_user):
    """Dispositive check for the cached branch: a cache hit must still query is_active,
    so a revoked key is rejected without trusting the cached id alone.

    This test pins the cache key format (api_key_lookup_<sha256 of raw key>) used by
    APIKeyAuthentication._validate_api_key. If the format changes, update this test and
    the authenticator together; do not weaken the cache.get assertion.
    """
    from django.core.cache import cache
    from django.db import connection
    from django.test.utils import CaptureQueriesContext
    import hashlib

    _accept(verified_user)
    key_obj, raw = UserAPIKey.create_key(verified_user, name="cache-claim")
    headers = _key_headers(raw)
    assert client.get(API + "preferences/", **headers).status_code == 200  # fresh lookup populates cache

    cache_key = f"api_key_lookup_{hashlib.sha256(raw.strip().encode()).hexdigest()}"
    assert cache.get(cache_key) == key_obj.id, "cache must hold the key id after a fresh lookup"

    key_obj.revoke()
    with CaptureQueriesContext(connection) as ctx:
        resp = client.get(API + "preferences/", **headers)
    assert resp.status_code == 401
    cached_lookups = [q["sql"] for q in ctx.captured_queries if "authentication_userapikey" in q["sql"]]
    assert cached_lookups, "cache hit must still query the key table"
    assert any("is_active" in sql for sql in cached_lookups), "cached branch must filter on is_active"


@pytest.mark.django_db
def test_overwrite_warning_fires_only_on_hash_change(client, verified_user):
    """Attach a handler directly: the project's logging config stops propagation, so caplog misses it."""
    import logging

    class _Collect(logging.Handler):
        def __init__(self):
            super().__init__(level=logging.WARNING)
            self.records = []

        def emit(self, record):
            self.records.append(record)

    target = logging.getLogger("authentication.legal_views")
    collector = _Collect()
    target.addHandler(collector)
    try:
        headers = _auth(verified_user)
        payload = {"accept_terms": True, "acknowledge_privacy_notice": True}

        client.post(API + "legal/", payload, format="json", **headers)  # fresh: no warning
        assert not [r for r in collector.records if "legal acceptance overwrite" in r.getMessage()]

        TermsAcceptance.objects.filter(user=verified_user).update(content_hash="stale-hash")
        client.post(API + "legal/", payload, format="json", **headers)
        warnings = [r for r in collector.records if "legal acceptance overwrite" in r.getMessage()]
        assert warnings and warnings[0].levelno == logging.WARNING
        assert "old_hash=stale-hash" in warnings[0].getMessage()
    finally:
        target.removeHandler(collector)
