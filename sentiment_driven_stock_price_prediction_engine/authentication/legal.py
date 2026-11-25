"""
Existing-user legal gate (GAP-03).

An authenticated user without an acceptance of the current Terms and an
acknowledgement of the current Privacy notice receives 403
`legal_acceptance_required` on normal endpoints. Exempt paths keep the
acceptance screen, logout, recovery, email verification and account
deletion working.
"""

import logging

from rest_framework import exceptions, status
from rest_framework_simplejwt.authentication import JWTAuthentication

from .legal_config import PRIVACY_NOTICE, TERMS
from .models import PrivacyNoticeAcknowledgement, TermsAcceptance


logger = logging.getLogger(__name__)

LEGAL_ACCEPTANCE_CODE = "legal_acceptance_required"
ACCEPTANCE_ENDPOINT = "/api/v1/auth/legal/"
LEGAL_ACCEPTANCE_MESSAGE = (
    "You must accept the current Terms of Service and acknowledge the Privacy Policy to continue."
)


class LegalAcceptanceRequired(exceptions.PermissionDenied):
    """403 whose body carries a stable `code` so the frontend can show the acceptance screen."""

    status_code = status.HTTP_403_FORBIDDEN

    def __init__(self):
        super().__init__(
            detail={
                "detail": LEGAL_ACCEPTANCE_MESSAGE,
                "code": LEGAL_ACCEPTANCE_CODE,
                # Tells API and web clients exactly what to do next. Works with the same
                # API key or JWT the client already holds; no replacement key is needed.
                "acceptance": {
                    "endpoint": ACCEPTANCE_ENDPOINT,
                    "read": "GET the endpoint to see the current document versions and whether they are accepted.",
                    "submit": "POST the endpoint with accept_terms and acknowledge_privacy_notice both set to true.",
                    "method": "POST",
                    "body_example": '{"accept_terms": true, "acknowledge_privacy_notice": true}',
                },
            },
            code=LEGAL_ACCEPTANCE_CODE,
        )


# Path prefixes (relative to /api/v1/auth/) that stay reachable without
# current legal acceptance. Keep this list narrow.
EXEMPT_PATH_PREFIXES = (
    "legal/",
    "verify-email/",
    "resend-verification/",
    "password-reset/",
    "delete-account/",
    "refresh/",
    "login/",
    "register/",
)
EXEMPT_EXACT_PATHS = ("profile/",)  # GET only, see is_exempt()
AUTH_PREFIX = "/api/v1/auth/"


def is_exempt(request) -> bool:
    path = request.path or ""
    if not path.startswith(AUTH_PREFIX):
        return False
    rel = path[len(AUTH_PREFIX):]
    if any(rel.startswith(p) for p in EXEMPT_PATH_PREFIXES):
        return True
    if rel in EXEMPT_EXACT_PATHS and request.method in ("GET", "HEAD", "OPTIONS"):
        return True
    return False


def has_current_acceptance(user) -> bool:
    terms_ok = TermsAcceptance.objects.filter(user=user, version=TERMS.version, content_hash=TERMS.sha256).exists()
    privacy_ok = PrivacyNoticeAcknowledgement.objects.filter(
        user=user, version=PRIVACY_NOTICE.version, content_hash=PRIVACY_NOTICE.sha256,
    ).exists()
    return terms_ok and privacy_ok


def enforce_legal_acceptance(user, request) -> None:
    """Raise LegalAcceptanceRequired if the authenticated user lacks current acceptance."""
    if is_exempt(request):
        return
    if not has_current_acceptance(user):
        logger.info(f"Legal acceptance required: user_id={user.id} path={request.path}")
        raise LegalAcceptanceRequired()


class LegalGatedJWTAuthentication(JWTAuthentication):
    """JWT authentication that applies the legal gate after a successful token check."""

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        user, _token = result
        enforce_legal_acceptance(user, request)
        return result
