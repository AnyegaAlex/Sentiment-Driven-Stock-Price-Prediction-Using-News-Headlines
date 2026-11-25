"""Versioned legal acceptance status and acknowledgement endpoints."""

import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .legal import has_current_acceptance
from .legal_config import PRIVACY_NOTICE, TERMS, legal_documents_configured
from .models import PrivacyNoticeAcknowledgement, TermsAcceptance

logger = logging.getLogger(__name__)


def _warn_if_overwriting(user, model, document, label):
    existing = model.objects.filter(user=user, version=document.version).first()
    if existing and existing.content_hash != document.sha256:
        timestamp = getattr(existing, "accepted_at", None) or getattr(existing, "acknowledged_at", None)
        logger.warning(
            "legal acceptance overwrite: user_id=%s doc=%s version=%s old_hash=%s new_hash=%s at=%s",
            user.id, label, document.version, existing.content_hash, document.sha256, timestamp,
        )


class LegalStatusView(APIView):
    """GET current server-owned versions; POST both affirmative acknowledgements."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        configured = legal_documents_configured()
        return Response({
            "configured": configured,
            "terms": {"version": TERMS.version, "content_hash": TERMS.sha256},
            "privacy_notice": {"version": PRIVACY_NOTICE.version, "content_hash": PRIVACY_NOTICE.sha256},
            "accepted": has_current_acceptance(request.user) if configured else False,
            "enforcement_enabled": getattr(settings, "LEGAL_ACCEPTANCE_ENFORCEMENT_ENABLED", False),
        })

    def post(self, request):
        if not legal_documents_configured():
            return Response(
                {"code": "legal_documents_not_configured", "error": "Legal documents have not yet been approved and configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if request.data.get("accept_terms") is not True or request.data.get("acknowledge_privacy_notice") is not True:
            return Response(
                {"code": "legal_acceptance_incomplete", "error": "Both accept_terms and acknowledge_privacy_notice must be true."},
                status=status.HTTP_400_BAD_REQUEST,
            )
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
