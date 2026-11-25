"""
Server-owned legal document versions.

The server, not the client, decides which Terms and Privacy versions are
current. Clients send only affirmative acceptance flags.

Each hash is the SHA-256 of the canonical document file the frontend renders
(frontend/src/legal/documents/<doc>.json). The rendered page shows
document.version, so the displayed version matches the version the server records.

Pure Python on purpose: importable without Django so the hash check can run
in isolation.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class LegalDocument:
    key: str
    version: str
    sha256: str
    source_path: str  # relative to the repository root


# Version identifier pending confirmation of the published effective dates.
TERMS = LegalDocument(
    key="terms",
    version="2026-11-24",
    sha256="6f11b95cd6d8f92823f951da79dad977316fc4947e65910db1e26ca7fc778b2d",
    source_path="frontend/src/legal/documents/terms.json",
)

PRIVACY_NOTICE = LegalDocument(
    key="privacy",
    version="2026-11-24",
    sha256="b931e1d97cbddb667c707668b2050a793e2a48367cb243d9239ff4f4881da3ee",
    source_path="frontend/src/legal/documents/privacy.json",
)
