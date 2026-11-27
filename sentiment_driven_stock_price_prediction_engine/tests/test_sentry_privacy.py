"""Regression tests for Sentry's privacy-preserving configuration."""

import pytest


def test_sentry_profiling_is_disabled_by_default(monkeypatch):
    from sentiment_driven_stock_price_prediction_engine import sentry_config

    monkeypatch.setattr(sentry_config.settings, "SENTRY_ENABLE_PROFILING", False, raising=False)
    monkeypatch.setattr(sentry_config.settings, "SENTRY_PROFILES_SAMPLE_RATE", 0.25, raising=False)

    assert sentry_config.get_sentry_config()["profiles_sample_rate"] == 0.0


def test_sentry_profiling_requires_explicit_enablement(monkeypatch):
    from sentiment_driven_stock_price_prediction_engine import sentry_config

    monkeypatch.setattr(sentry_config.settings, "SENTRY_ENABLE_PROFILING", True, raising=False)
    monkeypatch.setattr(sentry_config.settings, "SENTRY_PROFILES_SAMPLE_RATE", 0.25, raising=False)

    assert sentry_config.get_sentry_config()["profiles_sample_rate"] == 0.25


def test_sentry_before_send_removes_request_query_and_personal_fields():
    from sentiment_driven_stock_price_prediction_engine.sentry_config import before_send

    event = {
        "message": "Failed for user@example.test",
        "request": {
            "url": "https://intelligence.tickflowcapital.com/reset/opaque?email=user@example.test&token=secret#fragment",
            "headers": {
                "Authorization": "Bearer synthetic-secret-token",
                "X-Forwarded-For": "203.0.113.10",
                "Accept": "application/json",
            },
        },
        "user": {
            "email": "user@example.test",
            "ip_address": "203.0.113.10",
        },
    }

    result = before_send(event, {})

    assert result["request"]["url"] == "https://intelligence.tickflowcapital.com/reset/opaque"
    assert result["request"]["headers"]["Authorization"] == "[REDACTED]"
    assert result["request"]["headers"]["X-Forwarded-For"] == "[REDACTED]"
    assert result["request"]["headers"]["Accept"] == "application/json"
    assert result["user"]["email"] == "[REDACTED]"
    assert result["user"]["ip_address"] == "[REDACTED]"
    assert "user@example.test" not in str(result)
    assert "203.0.113.10" not in str(result)
    assert "synthetic-secret-token" not in str(result)


@pytest.mark.parametrize("send_pii", [False, True])
def test_set_user_context_never_attaches_account_identity(monkeypatch, send_pii):
    from sentiment_driven_stock_price_prediction_engine import sentry_config

    calls = []
    monkeypatch.setattr(sentry_config.settings, "SENTRY_SEND_PII", send_pii, raising=False)
    monkeypatch.setattr(sentry_config.sentry_sdk, "set_user", lambda value: calls.append(value))

    class User:
        id = 123
        is_authenticated = True
        email = "user@example.test"
        username = "person"

    sentry_config.set_user_context(User())

    assert calls == [None]



def test_local_debug_disables_sentry_unless_explicitly_enabled(monkeypatch):
    from types import SimpleNamespace
    from sentiment_driven_stock_price_prediction_engine import sentry_config

    local_settings = SimpleNamespace(
        TESTING=False,
        DEBUG=True,
        SENTRY_DSN="https://production@example.invalid/1",
        SENTRY_DEVELOPMENT_DSN="",
        SENTRY_ENABLE_IN_DEBUG=False,
    )
    monkeypatch.setattr(sentry_config, "settings", local_settings)

    assert sentry_config.is_sentry_enabled() is False

    # Opt-in alone must not send local events to the production project.
    local_settings.SENTRY_ENABLE_IN_DEBUG = True
    assert sentry_config.is_sentry_enabled() is False

    local_settings.SENTRY_DEVELOPMENT_DSN = "https://development@example.invalid/2"
    assert sentry_config.is_sentry_enabled() is True
    assert sentry_config.get_sentry_config()["dsn"] == local_settings.SENTRY_DEVELOPMENT_DSN


def test_production_runtime_uses_only_production_sentry_dsn(monkeypatch):
    from types import SimpleNamespace
    from sentiment_driven_stock_price_prediction_engine import sentry_config

    production_settings = SimpleNamespace(
        TESTING=False,
        DEBUG=False,
        SENTRY_DSN="https://production@example.invalid/1",
        SENTRY_DEVELOPMENT_DSN="https://development@example.invalid/2",
        SENTRY_ENABLE_IN_DEBUG=False,
    )
    monkeypatch.setattr(sentry_config, "settings", production_settings)

    assert sentry_config.is_sentry_enabled() is True
    assert sentry_config.get_sentry_config()["dsn"] == production_settings.SENTRY_DSN


def test_explicit_production_environment_is_not_relabelled_as_render(monkeypatch):
    from sentiment_driven_stock_price_prediction_engine import sentry_config

    monkeypatch.setenv("SENTRY_ENVIRONMENT", "production")
    monkeypatch.setenv("RENDER", "true")
    assert sentry_config.get_environment() == "production"


def test_local_debug_environment_defaults_to_development(monkeypatch):
    from sentiment_driven_stock_price_prediction_engine import sentry_config

    monkeypatch.delenv("SENTRY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("RENDER", raising=False)
    monkeypatch.setattr(sentry_config.settings, "DEBUG", True, raising=False)
    assert sentry_config.get_environment() == "development"
