"""Server-owned legal document configuration.

Stage A deliberately leaves the documents unconfigured: legal wording, effective
dates and canonical hashes must be approved before acceptance can be collected
or the existing-user gate enabled. Never accept versions or hashes from clients.
"""

from dataclasses import dataclass
import re


@dataclass(frozen=True)
class LegalDocument:
    key: str
    version: str | None
    sha256: str | None
    source_path: str | None = None

    @property
    def configured(self) -> bool:
        return bool(self.version and self.sha256 and re.fullmatch(r"[0-9a-f]{64}", self.sha256))


TERMS = LegalDocument(key="terms", version=None, sha256=None)
PRIVACY_NOTICE = LegalDocument(key="privacy", version=None, sha256=None)


def legal_documents_configured() -> bool:
    return TERMS.configured and PRIVACY_NOTICE.configured
