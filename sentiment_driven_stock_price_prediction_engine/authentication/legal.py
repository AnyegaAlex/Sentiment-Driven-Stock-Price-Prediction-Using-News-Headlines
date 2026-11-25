"""Versioned legal acceptance checks (GAP-03).

The gate is intentionally disabled in Stage A. Enable it only after approved
Terms and Privacy documents have been pinned by version and SHA-256 hash.
"""

import logging

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.checks import Error, register
from rest_framework import exceptions, status
from rest_framework_simplejwt.authentication import JWTAuthentication

from .legal_config import PRIVACY_NOTICE, TERMS, legal_documents_configured
from .models import PrivacyNoticeAcknowledgement, TermsAcceptance

logger = logging.getLogger(__name__)
LEGAL_ACCEPTANCE_CODE = "legal_acceptance_required"


@register()
def check_legal_acceptance_configuration(app_configs, **kwargs):
    """Prevent enabling the gate before both approved documents are pinned."""
    if (
        getattr(settings, "LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED", False)
        and not legal_documents_configured()
    ):
        return [Error(
            "Legal acceptance enforcement is enabled, but Terms/Privacy versions and SHA-256 hashes are not configured.",
            hint="Approve both documents, set their versions and canonical hashes, then enable the feature flag.",
            id="authentication.E001",
        )]
    return []
ACCEPTANCE_ENDPOINT = "/api/v1/auth/legal/"
LEGAL_ACCEPTANCE_MESSAGE = (
    "You must accept the current Terms of Service and acknowledge the Privacy Policy to continue."
)


class LegalAcceptanceRequired(exceptions.PermissionDenied):
    """403 response with a stable code and instructions for web/API clients."""

    status_code = status.HTTP_403_FORBIDDEN

    def __init__(self):
        super().__init__(
            detail={
                "detail": LEGAL_ACCEPTANCE_MESSAGE,
                "code": LEGAL_ACCEPTANCE_CODE,
                "acceptance": {
                    "endpoint": ACCEPTANCE_ENDPOINT,
                    "method": "POST",
                    "body_example": '{"accept_terms": true, "acknowledge_privacy_notice": true}',
                },
            },
            code=LEGAL_ACCEPTANCE_CODE,
        )


AUTH_PREFIX = "/api/v1/auth/"
# Exact path/method exemptions. Do not use broad path prefixes here: a new
# protected action added below one of these paths must not inherit an exemption.
EXEMPT_METHODS = {
    "legal/": {"GET", "POST", "HEAD", "OPTIONS"},
    "login/": {"POST", "OPTIONS"},
    "register/": {"POST", "OPTIONS"},
    "refresh/": {"POST", "OPTIONS"},
    "verify-email/": {"GET", "POST", "OPTIONS"},
    "resend-verification/": {"POST", "OPTIONS"},
    "password-reset/": {"POST", "OPTIONS"},
    "password-reset/confirm/": {"POST", "OPTIONS"},
    "delete-account/": {"POST", "OPTIONS"},
    "delete-account/cancel/": {"POST", "OPTIONS"},
    "profile/": {"GET", "HEAD", "OPTIONS"},
}


def is_exempt(request) -> bool:
    path = (request.path or "").lstrip("/")
    prefix = AUTH_PREFIX.lstrip("/")
    if not path.startswith(prefix):
        return False
    relative_path = path[len(prefix):]
    return request.method in EXEMPT_METHODS.get(relative_path, set())


def has_current_acceptance(user) -> bool:
    if not legal_documents_configured():
        return False
    terms_ok = TermsAcceptance.objects.filter(
        user=user, version=TERMS.version, content_hash=TERMS.sha256,
    ).exists()
    privacy_ok = PrivacyNoticeAcknowledgement.objects.filter(
        user=user, version=PRIVACY_NOTICE.version, content_hash=PRIVACY_NOTICE.sha256,
    ).exists()
    return terms_ok and privacy_ok


def enforce_legal_acceptance(user, request) -> None:
    """Enforce the gate only when explicitly enabled and documents are pinned."""
    if not getattr(settings, "LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED", False):
        return
    if not legal_documents_configured():
        raise ImproperlyConfigured(
            "Legal acceptance enforcement cannot be enabled until both legal documents have approved versions and SHA-256 hashes."
        )
    if is_exempt(request):
        return
    if not has_current_acceptance(user):
        logger.info("Legal acceptance required: user_id=%s path=%s", user.id, request.path)
        raise LegalAcceptanceRequired()


class LegalGatedJWTAuthentication(JWTAuthentication):
    """JWT authentication with the optional existing-user legal gate."""

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        user, _token = result
        enforce_legal_acceptance(user, request)
        return result
