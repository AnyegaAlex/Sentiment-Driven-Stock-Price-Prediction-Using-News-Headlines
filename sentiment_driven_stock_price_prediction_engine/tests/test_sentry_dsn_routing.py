"""The production Sentry DSN must only be used on Render.

Local processes, including DEBUG-off runs on a developer machine, must never
send events to the production project unless SENTRY_ALLOW_PRODUCTION_DSN_LOCAL
is explicitly enabled.
"""
import os
from unittest import mock

from django.test import SimpleTestCase, override_settings

from sentiment_driven_stock_price_prediction_engine import sentry_config

PROD_DSN = "https://prod-key@o1.ingest.sentry.io/1"
DEV_DSN = "https://dev-key@o1.ingest.sentry.io/2"


def _env(**extra):
    """Patch os.environ with RENDER removed unless supplied explicitly."""
    base = {k: v for k, v in os.environ.items() if k != "RENDER"}
    base.update(extra)
    return mock.patch.dict(os.environ, base, clear=True)


class SentryDsnRoutingTests(SimpleTestCase):

    @override_settings(DEBUG=True, SENTRY_DSN=PROD_DSN, SENTRY_DEVELOPMENT_DSN="")
    def test_debug_never_falls_back_to_production_dsn(self):
        with _env():
            # An unset DSN is returned as "", which is falsy. is_sentry_enabled
            # checks with "if not dsn", so no client is created.
            self.assertFalse(sentry_config.get_sentry_dsn())

    @override_settings(DEBUG=True, SENTRY_DSN=PROD_DSN, SENTRY_DEVELOPMENT_DSN=DEV_DSN)
    def test_debug_uses_development_dsn(self):
        with _env():
            self.assertEqual(sentry_config.get_sentry_dsn(), DEV_DSN)

    @override_settings(DEBUG=False, SENTRY_DSN=PROD_DSN, SENTRY_ALLOW_PRODUCTION_DSN_LOCAL=False)
    def test_local_process_with_debug_off_does_not_use_production_dsn(self):
        with _env():
            self.assertFalse(sentry_config.get_sentry_dsn())

    @override_settings(DEBUG=False, SENTRY_DSN=PROD_DSN, SENTRY_ALLOW_PRODUCTION_DSN_LOCAL=False)
    def test_render_uses_production_dsn(self):
        with _env(RENDER="true"):
            self.assertEqual(sentry_config.get_sentry_dsn(), PROD_DSN)

    @override_settings(DEBUG=False, SENTRY_DSN=PROD_DSN, SENTRY_ALLOW_PRODUCTION_DSN_LOCAL=True)
    def test_explicit_local_opt_in_uses_production_dsn(self):
        with _env():
            self.assertEqual(sentry_config.get_sentry_dsn(), PROD_DSN)

    @override_settings(DEBUG=False, SENTRY_DSN="", SENTRY_ALLOW_PRODUCTION_DSN_LOCAL=False)
    def test_no_dsn_configured_returns_none_on_render(self):
        with _env(RENDER="true"):
            self.assertFalse(sentry_config.get_sentry_dsn())
