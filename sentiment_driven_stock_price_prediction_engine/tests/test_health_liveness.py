"""The liveness probe must not touch the database or cache.

The platform health checker calls /api/v1/health/live/ every few seconds.
A database query on each call keeps the database compute awake, so this
endpoint must stay free of queries.
"""
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

LIVENESS_URL = '/api/v1/health/live/'


class LivenessProbeTests(TestCase):

    def test_returns_200_with_alive_status(self):
        response = self.client.get(LIVENESS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'alive'})

    def test_makes_no_database_queries(self):
        with CaptureQueriesContext(connection) as context:
            response = self.client.get(LIVENESS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            len(context.captured_queries), 0,
            f"liveness probe ran queries: {[q['sql'] for q in context.captured_queries]}",
        )

    def test_allows_unauthenticated_access(self):
        # The platform sends no credentials. The probe must not require any.
        response = self.client.get(LIVENESS_URL, HTTP_USER_AGENT='Render/1.0')
        self.assertEqual(response.status_code, 200)

    def test_readiness_still_checks_database(self):
        # The dependency check stays on /readiness/. Only the probe changed.
        response = self.client.get('/api/v1/health/readiness/')
        self.assertIn(response.status_code, (200, 503))
