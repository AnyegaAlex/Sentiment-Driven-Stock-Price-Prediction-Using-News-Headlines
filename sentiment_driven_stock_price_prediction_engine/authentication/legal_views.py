"""Legal acceptance endpoints (GAP-03). Kept out of legal.py so DRF can import
the gate class without a circular import through rest_framework.views."""

import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .legal import has_current_acceptance
from .legal_config import PRIVACY_NOTICE, TERMS
from .models import PrivacyNoticeAcknowledgement, TermsAcceptance


logger = logging.getLogger(__name__)


def _warn_if_overwriting(user, model, document, label):
    """A row for this version with a different hash means the hash changed without a version bump.
    update_or_create will overwrite it. That should not happen (the hash test blocks it), so log it."""
    existing = model.objects.filter(user=user, version=document.version).first()
    if existing and existing.content_hash != document.sha256:
        when = getattr(existing, "accepted_at", None) or getattr(existing, "acknowledged_at", None)
        logger.warning(
            "legal acceptance overwrite: user_id=%s doc=%s version=%s old_hash=%s new_hash=%s at=%s",
            user.id, label, document.version, existing.content_hash, document.sha256, when,
        )


class LegalStatusView(APIView):
    """GET: current document versions and whether the user has accepted them.
    POST: record acceptance of the current versions (both flags required)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "terms": {"version": TERMS.version, "content_hash": TERMS.sha256},
            "privacy_notice": {"version": PRIVACY_NOTICE.version, "content_hash": PRIVACY_NOTICE.sha256},
            "accepted": has_current_acceptance(request.user),
        })

    def post(self, request):
        if request.data.get("accept_terms") is not True or request.data.get("acknowledge_privacy_notice") is not True:
            return Response(
                {"error": "Both accept_terms and acknowledge_privacy_notice must be true."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Versions are always the server's current ones; the client never supplies them.
        # Atomic: either both acknowledgements are recorded or neither is. update_or_create
        # lets a user re-accept when the hash for the same version string has changed,
        # which get_or_create could not do (it returned the stale row unchanged).
        with transaction.atomic():
            _warn_if_overwriting(request.user, TermsAcceptance, TERMS, "terms")
            _warn_if_overwriting(request.user, PrivacyNoticeAcknowledgement, PRIVACY_NOTICE, "privacy")
            TermsAcceptance.objects.update_or_create(
                user=request.user, version=TERMS.version,
                defaults={"content_hash": TERMS.sha256, "accepted_at": timezone.now()},
            )
            PrivacyNoticeAcknowledgement.objects.update_or_create(
                user=request.user, version=PRIVACY_NOTICE.version,
                defaults={"content_hash": PRIVACY_NOTICE.sha256, "acknowledged_at": timezone.now()},
            )
        return Response({"accepted": True}, status=status.HTTP_200_OK)
