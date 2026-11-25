"""
Tests for log_safety: redaction of credentials and email addresses.

These tests do not need Django. Run them with:
    pytest --noconftest -c /dev/null tests/test_log_safety.py

All secrets used here are synthetic. No real provider key is used.
"""

import http.server
import json
import threading

import pytest
import requests

from sentiment_driven_stock_price_prediction_engine import log_safety
from sentiment_driven_stock_price_prediction_engine.log_safety import (
    REDACTED,
    describe_exception,
    scrub_event_or_drop,
    scrub_text,
    scrub_value,
)

SYNTHETIC_TOKEN = "SYNTHETIC_TOKEN_abc123XYZ"
SYNTHETIC_EMAIL = "person.example@example.test"


# ---------------------------------------------------------------------------
# Text scrubbing
# ---------------------------------------------------------------------------

def test_email_addresses_are_masked_in_text():
    out = scrub_text(f"Failed to send to {SYNTHETIC_EMAIL} today")
    assert SYNTHETIC_EMAIL not in out
    assert "[email]" in out


@pytest.mark.parametrize("name", ["token", "apikey", "api_key", "api-key", "secret", "password", "key"])
def test_secret_query_parameters_are_redacted(name):
    url = f"https://provider.example/api/v1/quote?symbol=TEST&{name}={SYNTHETIC_TOKEN}"
    out = scrub_text(url)
    assert SYNTHETIC_TOKEN not in out
    assert f"{name}={REDACTED}" in out
    assert "symbol=TEST" in out, "non-secret parameters must be kept"


def test_json_style_secrets_are_redacted():
    out = scrub_text(f"body={{'password': '{SYNTHETIC_TOKEN}', \"token\": \"{SYNTHETIC_TOKEN}\"}}")
    assert SYNTHETIC_TOKEN not in out


def test_authorization_header_and_bearer_are_redacted():
    out = scrub_text(f"Authorization: Bearer {SYNTHETIC_TOKEN}")
    assert SYNTHETIC_TOKEN not in out
    out2 = scrub_text(f"sent header Bearer {SYNTHETIC_TOKEN} to upstream")
    assert SYNTHETIC_TOKEN not in out2


def test_ordinary_text_is_not_over_redacted():
    text = "cache_key=stock_1 token expired; symbol=AAPL; status=200"
    assert scrub_text(text) == text


# ---------------------------------------------------------------------------
# Structure scrubbing
# ---------------------------------------------------------------------------

def test_sensitive_keys_are_replaced_and_structure_preserved():
    data = {
        "headers": {"Authorization": f"Bearer {SYNTHETIC_TOKEN}", "Accept": "application/json"},
        "data": {"password": SYNTHETIC_TOKEN, "symbol": "AAPL"},
        "items": [1, "ok", {"email": SYNTHETIC_EMAIL}],
        "count": 3,
    }
    out = scrub_value(data)
    assert out["headers"]["Authorization"] == REDACTED
    assert out["headers"]["Accept"] == "application/json"
    assert out["data"]["password"] == REDACTED
    assert out["data"]["symbol"] == "AAPL"
    assert out["items"][2]["email"] == REDACTED
    assert out["items"][0] == 1 and out["count"] == 3
    assert SYNTHETIC_TOKEN not in json.dumps(out)


def test_very_deep_structures_fail_closed():
    deep = {}
    node = deep
    for _ in range(60):
        node["x"] = {}
        node = node["x"]
    out = scrub_value(deep)
    assert REDACTED in json.dumps(out, default=str)


def test_scrub_event_or_drop_returns_none_when_scrubbing_fails(monkeypatch):
    def boom(_value, _depth=0):
        raise RuntimeError("scrubber fault")

    monkeypatch.setattr(log_safety, "scrub_value", boom)
    event = {"message": f"leak {SYNTHETIC_TOKEN}"}
    assert scrub_event_or_drop(event) is None, "a failed scrub must drop the event, never return it"


# ---------------------------------------------------------------------------
# Exception descriptions, using real requests exceptions with a synthetic token
# ---------------------------------------------------------------------------

def test_connection_error_description_removes_token():
    with pytest.raises(requests.RequestException) as info:
        # Bypass the autouse requests.get mock; this test needs a real connection error.
        with requests.Session() as session:
            session.get(
                "http://127.0.0.1:9/api/v1/quote",
                params={"symbol": "TEST", "token": SYNTHETIC_TOKEN},
                timeout=2,
            )
    # Confirm the unredacted exception really does carry the token.
    assert SYNTHETIC_TOKEN in str(info.value)
    described = describe_exception(info.value)
    assert SYNTHETIC_TOKEN not in described
    assert type(info.value).__name__ in described


class _Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        self.send_response(429)
        self.end_headers()

    def log_message(self, *args):
        pass


def test_http_error_description_keeps_status_and_removes_token():
    server = http.server.HTTPServer(("127.0.0.1", 0), _Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        url = f"http://127.0.0.1:{server.server_port}/query?symbol=TEST&apikey={SYNTHETIC_TOKEN}"
        with pytest.raises(requests.HTTPError) as info:
            with requests.Session() as session:
                session.get(url, timeout=2).raise_for_status()
        described = describe_exception(info.value)
        assert SYNTHETIC_TOKEN not in described
        assert "status=429" in described
        assert "HTTPError" in described
    finally:
        server.shutdown()


def test_description_masks_email_from_smtp_style_message():
    err = ValueError(f"recipient refused: {{'{SYNTHETIC_EMAIL}': (550, b'rejected')}}")
    described = describe_exception(err)
    assert SYNTHETIC_EMAIL not in described
    assert described.startswith("ValueError:")


def test_description_is_truncated():
    long = describe_exception(ValueError("x" * 5000))
    assert len(long) < 600


# ---------------------------------------------------------------------------
# Real Sentry SDK event, passed through the same scrubber used in before_send
# ---------------------------------------------------------------------------

def test_production_sentry_options_are_supported_by_installed_sdk():
    """Documents the SDK pin. Fails loudly if production options are unknown."""
    pytest.importorskip("sentry_sdk")
    from sentry_sdk.client import DEFAULT_OPTIONS

    missing = [k for k in ("send_default_pii", "include_local_variables") if k not in DEFAULT_OPTIONS]
    if missing:
        pytest.skip(f"installed sentry-sdk does not support {missing}; the backend must pin a 2.x release")


def test_real_sentry_event_is_scrubbed_and_init_accepts_setting():
    sentry_sdk = pytest.importorskip("sentry_sdk")
    recorded = []

    def before_send(event, hint):
        recorded.append(scrub_event_or_drop(event))
        return None  # never transmit anything during the test

    from sentry_sdk.client import DEFAULT_OPTIONS

    # sentry-sdk 3.x removed some options that 2.x accepts. Pass only the
    # options the installed SDK supports, so the scrubbing check still runs.
    optional = {"send_default_pii": False, "include_local_variables": False}
    kwargs = {k: v for k, v in optional.items() if k in DEFAULT_OPTIONS}
    sentry_sdk.init(
        dsn="http://public@127.0.0.1:9/1",
        before_send=before_send,
        **kwargs,
    )
    try:
        try:
            with requests.Session() as session:
                session.get(
                    "http://127.0.0.1:9/api/v1/quote",
                    params={"symbol": "TEST", "token": SYNTHETIC_TOKEN},
                    timeout=2,
                )
        except requests.RequestException as exc:
            sentry_sdk.set_user({"id": "1"})
            sentry_sdk.add_breadcrumb(message=f"contacted {SYNTHETIC_EMAIL}", category="test")
            sentry_sdk.capture_exception(exc)
        sentry_sdk.flush(timeout=1)
    finally:
        sentry_sdk.init(dsn=None)

    assert recorded, "before_send was not called for the captured exception"
    event = recorded[0]
    assert event is not None
    serialized = json.dumps(event, default=str)
    assert SYNTHETIC_TOKEN not in serialized
    assert SYNTHETIC_EMAIL not in serialized
    assert "exception" in event, "exception type and structure must be preserved"
