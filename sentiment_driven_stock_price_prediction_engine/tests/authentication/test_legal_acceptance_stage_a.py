"""Stage-A safeguards for the GAP-03 legal-acceptance foundation."""

import pytest
from django.test import RequestFactory, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from authentication import legal, legal_config
from authentication.legal_config import LegalDocument
from authentication.models import PrivacyNoticeAcknowledgement, TermsAcceptance, User

API = "/api/v1/auth/"


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="legal_stage_a", email="legal-stage-a@example.com", password="Str0ng-pass-123"
    )


def auth_headers(user):
    token = RefreshToken.for_user(user).access_token
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


def test_stage_a_documents_are_deliberately_unconfigured():
    assert not legal_config.legal_documents_configured()
    assert legal_config.TERMS.version is None
    assert legal_config.TERMS.sha256 is None
    assert legal_config.PRIVACY_NOTICE.version is None
    assert legal_config.PRIVACY_NOTICE.sha256 is None


@pytest.mark.django_db
def test_legal_status_reports_unconfigured_without_exposing_draft_versions(user):
    client = APIClient()
    response = client.get(API + "legal/", **auth_headers(user))
    assert response.status_code == 200
    assert response.json() == {
        "configured": False,
        "terms": {"version": None, "content_hash": None},
        "privacy_notice": {"version": None, "content_hash": None},
        "accepted": False,
        "enforcement_enabled": False,
    }


@pytest.mark.django_db
def test_legal_acceptance_submission_is_blocked_until_documents_are_approved(user):
    client = APIClient()
    response = client.post(
        API + "legal/",
        {"accept_terms": True, "acknowledge_privacy_notice": True},
        format="json",
        **auth_headers(user),
    )
    assert response.status_code == 503
    assert response.json()["code"] == "legal_documents_not_configured"
    assert not TermsAcceptance.objects.filter(user=user).exists()
    assert not PrivacyNoticeAcknowledgement.objects.filter(user=user).exists()


def test_stage_a_gate_is_disabled_and_does_not_block_authenticated_users(user):
    request = RequestFactory().get(API + "preferences/")
    with override_settings(LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED=False):
        assert legal.enforce_legal_acceptance(user, request) is None


def test_exemptions_are_exact_and_method_scoped():
    factory = RequestFactory()
    assert legal.is_exempt(factory.get(API + "legal/"))
    assert legal.is_exempt(factory.post(API + "delete-account/cancel/"))
    assert legal.is_exempt(factory.get(API + "profile/"))
    assert not legal.is_exempt(factory.post(API + "profile/"))
    assert not legal.is_exempt(factory.get(API + "profile/update/"))
    assert not legal.is_exempt(factory.get(API + "delete-account/export/"))
    assert not legal.is_exempt(factory.get(API + "password-reset/confirm/extra/"))


@pytest.mark.django_db
def test_gate_can_be_enabled_only_with_pinned_documents(user, monkeypatch):
    terms = LegalDocument("terms", "approved-terms-v1", "a" * 64)
    privacy = LegalDocument("privacy", "approved-privacy-v1", "b" * 64)
    monkeypatch.setattr(legal_config, "TERMS", terms)
    monkeypatch.setattr(legal_config, "PRIVACY_NOTICE", privacy)
    monkeypatch.setattr(legal, "TERMS", terms)
    monkeypatch.setattr(legal, "PRIVACY_NOTICE", privacy)
    request = RequestFactory().get(API + "preferences/")

    with override_settings(LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED=True):
        with pytest.raises(legal.LegalAcceptanceRequired):
            legal.enforce_legal_acceptance(user, request)

        TermsAcceptance.objects.create(user=user, version=terms.version, content_hash=terms.sha256)
        PrivacyNoticeAcknowledgement.objects.create(
            user=user, version=privacy.version, content_hash=privacy.sha256,
        )
        assert legal.has_current_acceptance(user)
        assert legal.enforce_legal_acceptance(user, request) is None


def _configure_approved_docs(monkeypatch):
    terms = LegalDocument("terms", "approved-terms-v1", "c" * 64)
    privacy = LegalDocument("privacy", "approved-privacy-v1", "d" * 64)
    monkeypatch.setattr(legal_config, "TERMS", terms)
    monkeypatch.setattr(legal_config, "PRIVACY_NOTICE", privacy)
    monkeypatch.setattr(legal, "TERMS", terms)
    monkeypatch.setattr(legal, "PRIVACY_NOTICE", privacy)
    from authentication import legal_views
    monkeypatch.setattr(legal_views, "TERMS", terms)
    monkeypatch.setattr(legal_views, "PRIVACY_NOTICE", privacy)
    return terms, privacy


@pytest.mark.django_db
def test_jwt_gate_and_acceptance_endpoint_use_server_pinned_versions(user, monkeypatch):
    terms, privacy = _configure_approved_docs(monkeypatch)
    client = APIClient()
    headers = auth_headers(user)
    request = RequestFactory().get(API + "preferences/")

    with override_settings(LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED=True):
        gated_response = client.get(API + "preferences/", **headers)
        assert gated_response.status_code == 403
        assert gated_response.json()["code"] == "legal_acceptance_required"
        with pytest.raises(legal.LegalAcceptanceRequired):
            legal.enforce_legal_acceptance(user, request)

        response = client.post(
            API + "legal/",
            {"accept_terms": True, "acknowledge_privacy_notice": True},
            format="json",
            **headers,
        )
        assert response.status_code == 200
        assert TermsAcceptance.objects.get(user=user).content_hash == terms.sha256
        assert PrivacyNoticeAcknowledgement.objects.get(user=user).content_hash == privacy.sha256
        assert client.get(API + "legal/", **headers).json()["accepted"] is True


@pytest.mark.django_db
def test_api_key_gate_runs_before_usage_is_counted(user, monkeypatch):
    from authentication.models import UserAPIKey

    terms, privacy = _configure_approved_docs(monkeypatch)
    key_obj, raw_key = UserAPIKey.create_key(user, name="legal-gate-stage-a")
    client = APIClient()

    with override_settings(LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED=True):
        response = client.get(API + "preferences/", HTTP_X_API_KEY=raw_key)
        assert response.status_code == 403
        assert response.json()["code"] == "legal_acceptance_required"
        assert not TermsAcceptance.objects.filter(user=user).exists()
        assert not PrivacyNoticeAcknowledgement.objects.filter(user=user).exists()

        TermsAcceptance.objects.create(user=user, version=terms.version, content_hash=terms.sha256)
        PrivacyNoticeAcknowledgement.objects.create(
            user=user, version=privacy.version, content_hash=privacy.sha256,
        )
        response = client.get(API + "preferences/", HTTP_X_API_KEY=raw_key)
        assert response.status_code == 200
        assert UserAPIKey.objects.get(pk=key_obj.pk).is_active is True


def test_system_check_rejects_enforcement_without_approved_document_hashes():
    errors = legal.check_legal_acceptance_configuration(None)
    assert errors == []  # Stage A remains disabled and safe by default.

    with override_settings(LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED=True):
        errors = legal.check_legal_acceptance_configuration(None)
    assert len(errors) == 1
    assert errors[0].id == "authentication.E001"
