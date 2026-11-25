"""
Redaction helpers for log messages and Sentry events.

This module is pure Python with no Django imports, so it can be unit-tested
without settings. It is used in three places:

* ``describe_exception`` before logging provider and email errors, so the
  log line never carries credentials or recipient addresses.
* ``scrub_value`` / ``scrub_event_or_drop`` as the Sentry ``before_send`` hook.
* ``scrub_value`` as the Sentry ``before_breadcrumb`` hook.

Scrubbing here is defence in depth. Call sites should still avoid putting
secrets into messages in the first place.
"""

import re
from typing import Any, Optional

REDACTED = "[REDACTED]"
EMAIL_PLACEHOLDER = "[email]"
MAX_DETAIL_CHARS = 500

# Email addresses anywhere in text.
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

# name=value pairs in URLs or free text, e.g. ?token=abc&symbol=X or api_key=abc.
# The lookbehind stops "cache_key=" and similar names from matching "key=".
PARAM_RE = re.compile(
    r"(?i)((?<![A-Za-z0-9_])(?:token|apikey|api_key|api-key|access_token|refresh_token"
    r"|secret|password|passwd|signature|key)=)[^&\s'\"<>]+"
)

# JSON or dict style: 'password': 'x', "token": "x", password: x
JSON_STYLE_RE = re.compile(
    r"(?i)(['\"]?(?:password|passwd|token|apikey|api_key|api-key|secret|authorization"
    r"|cookie|access_token|refresh_token)['\"]?\s*[:=]\s*)(['\"]?)[^'\"\s,&}]+"
)

# Authorization header text, to the end of the line.
AUTH_HEADER_RE = re.compile(r"(?i)(authorization\s*:\s*)[^\r\n]+")

# Bearer and Basic credentials.
BEARER_RE = re.compile(r"(?i)\b(bearer|basic)\s+[A-Za-z0-9._~+/=\-]{8,}")

# Mapping keys whose values are always redacted, whatever they contain.
SENSITIVE_KEYS = frozenset({
    "password", "passwd", "token", "access_token", "refresh_token",
    "apikey", "api_key", "api-key", "x-api-key", "secret",
    "authorization", "cookie", "set-cookie",
    "email", "username", "new_email", "old_email", "new_username", "old_username",
    "ip", "ip_address", "ipaddress", "remote_addr", "remote-address",
    "x-forwarded-for", "x-real-ip", "user_agent", "user-agent", "user_id",
})

_MAX_DEPTH = 25


def scrub_text(text: str) -> str:
    """Return ``text`` with emails, credentials and secret parameters redacted."""
    out = EMAIL_RE.sub(EMAIL_PLACEHOLDER, text)
    out = AUTH_HEADER_RE.sub(lambda m: m.group(1) + REDACTED, out)
    out = BEARER_RE.sub(lambda m: m.group(1) + " " + REDACTED, out)
    out = PARAM_RE.sub(lambda m: m.group(1) + REDACTED, out)
    out = JSON_STYLE_RE.sub(lambda m: m.group(1) + m.group(2) + REDACTED, out)
    return out


def scrub_value(value: Any, _depth: int = 0) -> Any:
    """
    Recursively scrub a structure (dict, list, tuple, string).

    Structure, types and non-string scalars are preserved. Values under
    sensitive keys are replaced entirely. Structures nested deeper than
    ``_MAX_DEPTH`` are replaced rather than walked, so the function fails
    closed on pathological input.
    """
    if _depth > _MAX_DEPTH:
        return REDACTED
    if isinstance(value, str):
        return scrub_text(value)
    if isinstance(value, dict):
        scrubbed = {}
        for key, item in value.items():
            new_key = scrub_text(key) if isinstance(key, str) else key
            if isinstance(key, str) and key.lower() in SENSITIVE_KEYS:
                scrubbed[new_key] = REDACTED
            else:
                scrubbed[new_key] = scrub_value(item, _depth + 1)
        return scrubbed
    if isinstance(value, list):
        return [scrub_value(item, _depth + 1) for item in value]
    if isinstance(value, tuple):
        return tuple(scrub_value(item, _depth + 1) for item in value)
    return value


def scrub_event_or_drop(event: Any) -> Optional[Any]:
    """
    Scrub a Sentry event for ``before_send``.

    Returns the scrubbed event, or ``None`` to drop it if scrubbing fails.
    The original event is never returned on failure, so a scrubber fault
    cannot become a route for leaking data.
    """
    try:
        return scrub_value(event)
    except Exception:
        return None


def describe_exception(exc: BaseException) -> str:
    """
    Describe an exception safely for logging.

    Keeps the exception class, the HTTP status when the exception carries one,
    and the message with credentials and email addresses removed. The message
    is truncated. The original exception is never included.
    """
    name = type(exc).__name__
    status = getattr(getattr(exc, "response", None), "status_code", None)
    try:
        detail = scrub_text(str(exc))
    except Exception:
        detail = "<message unavailable>"
    if len(detail) > MAX_DETAIL_CHARS:
        detail = detail[:MAX_DETAIL_CHARS] + "…"
    status_part = f" status={status}" if status else ""
    return f"{name}{status_part}: {detail}"
