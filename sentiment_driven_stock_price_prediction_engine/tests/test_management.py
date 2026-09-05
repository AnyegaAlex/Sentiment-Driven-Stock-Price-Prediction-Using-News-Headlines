"""
Tier 9: Async & Background Tasks (Management Commands)

Tests all management commands:
- resolve_predictions
- prune_predictions
- refresh_stock_cache
- update_prediction_accuracy
- wait_for_db
- send_weekly_digest

We use call_command from django.core.management to invoke commands
and capture output via StringIO.

Author: Tickflow Capital
Version: 1.3.4
"""

import io
from datetime import timedelta
from unittest.mock import patch, MagicMock

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.db.utils import OperationalError
from django.utils import timezone

from tests.factories import UserFactory, PredictionFactory
from authentication.models import User
from stocks.models import Prediction

pytestmark = pytest.mark.django_db


# ============================================================================
# FIXTURE: Mock database connection methods for all commands
# ============================================================================

@pytest.fixture(autouse=True)
def mock_db_connection():
    """
    Prevent management commands from actually closing or checking
    the real database connection in tests.
    """
    with patch.object(connection, 'close') as mock_close, \
         patch.object(connection, 'close_if_unusable_or_obsolete') as mock_close_if:
        mock_close.return_value = None
        mock_close_if.return_value = None
        yield


# ============================================================================
# 1. RESOLVE PREDICTIONS
# ============================================================================

class TestResolvePredictionsCommand:
    def test_resolve_predictions_old_predictions(self):
        now = timezone.now()
        old_date = now - timedelta(days=8)
        new_date = now - timedelta(days=3)

        old_pred1 = PredictionFactory(date=old_date, is_correct=None)
        old_pred2 = PredictionFactory(date=old_date, is_correct=None)
        new_pred = PredictionFactory(date=new_date, is_correct=None)

        Prediction.objects.filter(pk=old_pred1.pk).update(date=old_date)
        Prediction.objects.filter(pk=old_pred2.pk).update(date=old_date)
        Prediction.objects.filter(pk=new_pred.pk).update(date=new_date)

        with patch('stocks.management.commands.resolve_predictions.resolve_all_pending_predictions') as mock_resolve:
            mock_resolve.return_value = {'resolved': 2, 'failed': 0}
            out = io.StringIO()
            call_command('resolve_predictions', stdout=out)
            mock_resolve.assert_called_once_with(resolution_days=7)

    def test_resolve_predictions_custom_days(self):
        with patch('stocks.management.commands.resolve_predictions.resolve_all_pending_predictions') as mock_resolve:
            mock_resolve.return_value = {'resolved': 1, 'failed': 0}
            out = io.StringIO()
            call_command('resolve_predictions', days=3, stdout=out)
            mock_resolve.assert_called_once_with(resolution_days=3)

    def test_resolve_predictions_handles_exception(self):
        with patch('stocks.management.commands.resolve_predictions.resolve_all_pending_predictions') as mock_resolve:
            mock_resolve.side_effect = Exception("DB error")
            out = io.StringIO()
            err = io.StringIO()
            with pytest.raises(CommandError, match="Command failed"):
                call_command('resolve_predictions', stdout=out, stderr=err)
            assert "Fatal error" in err.getvalue()


# ============================================================================
# 2. PRUNE PREDICTIONS
# ============================================================================

class TestPrunePredictionsCommand:
    def test_prune_predictions_dry_run(self):
        symbol = "AAPL"
        for i in range(20):
            PredictionFactory(stock_symbol=symbol, date=timezone.now() - timedelta(days=i))

        out = io.StringIO()
        call_command('prune_predictions', '--dry-run', max_per_symbol=5, stdout=out)

        output = out.getvalue()
        assert "dry" in output.lower() or "would" in output.lower()
        assert Prediction.objects.filter(stock_symbol=symbol).count() == 20

    def test_prune_predictions_actual_delete(self):
        symbol = "AAPL"
        for i in range(20):
            PredictionFactory(stock_symbol=symbol, date=timezone.now() - timedelta(days=i))

        out = io.StringIO()
        call_command('prune_predictions', '--max-per-symbol', '5', stdout=out)

        assert Prediction.objects.filter(stock_symbol=symbol).count() == 5
        output = out.getvalue()
        assert "Successfully pruned" in output

    def test_prune_predictions_quiet(self):
        symbol = "AAPL"
        for i in range(10):
            PredictionFactory(stock_symbol=symbol, date=timezone.now() - timedelta(days=i))

        out = io.StringIO()
        call_command('prune_predictions', '--quiet', max_per_symbol=5, stdout=out)
        assert out.getvalue() == ""


# ============================================================================
# 3. REFRESH STOCK CACHE
# ============================================================================

class TestRefreshStockCacheCommand:
    @patch('stocks.views.get_technical_indicators')
    @patch('stocks.views.get_fallback_analysis')
    @patch('django.core.cache.cache.set')
    def test_refresh_stock_cache_success(self, mock_cache_set, mock_analysis, mock_tech):
        mock_analysis.return_value = {"data": "test"}
        mock_tech.return_value = {"current_price": 100}

        out = io.StringIO()
        call_command('refresh_stock_cache', stdout=out)

        output = out.getvalue()
        assert "cached successfully" in output
        assert mock_cache_set.call_count >= 1

    @patch('stocks.views.get_technical_indicators')
    @patch('stocks.views.get_fallback_analysis')
    @patch('django.core.cache.cache.get')
    def test_refresh_stock_cache_force(self, mock_cache_get, mock_analysis, mock_tech):
        mock_cache_get.return_value = {"cached": "data"}
        mock_analysis.return_value = {"data": "test"}
        mock_tech.return_value = {"current_price": 100}

        with patch('django.core.cache.cache.set') as mock_set:
            call_command('refresh_stock_cache', '--force', stdout=io.StringIO())
            assert mock_set.call_count > 0

    def test_refresh_stock_cache_custom_symbols(self):
        with patch('stocks.views.get_technical_indicators') as mock_tech, \
             patch('stocks.views.get_fallback_analysis') as mock_analysis, \
             patch('django.core.cache.cache.set') as mock_set:
            mock_analysis.return_value = {"data": "test"}
            mock_tech.return_value = {"current_price": 100}
            call_command('refresh_stock_cache', '--symbols', 'AAPL', 'MSFT', stdout=io.StringIO())
            assert mock_set.call_count >= 4


# ============================================================================
# 4. UPDATE PREDICTION ACCURACY
# ============================================================================

class TestUpdatePredictionAccuracyCommand:
    def test_update_accuracy_updates_users(self):
        user1 = UserFactory()
        user2 = UserFactory()
        PredictionFactory(user=user1, is_correct=True)
        PredictionFactory(user=user1, is_correct=False)
        PredictionFactory(user=user2, is_correct=True)

        # Mock the aggregate to return the expected averages
        # This avoids the PostgreSQL AVG(boolean) error.
        with patch('django.db.models.query.QuerySet.aggregate') as mock_aggregate:
            # Return 0.5 for user1, 1.0 for user2
            def side_effect(*args, **kwargs):
                # We cannot easily differentiate per user, but we know the order of calls.
                # Alternatively, we can let the command run and mock only the inner aggregate.
                # A simpler approach: patch the whole aggregate to return a value.
                # Since the test expects 50% and 100%, we can just let the real command run if the command is fixed.
                pass
            # Actually, we can patch the aggregate to return a dict with 'avg' key.
            # We'll use a context manager to patch the aggregate on the queryset of the user.
            # But the command uses user.predictions...aggregate(...), so we need to patch the aggregate method on the QuerySet.
            # Since we are in a test, we can just let the real command run if the command is fixed.
            # To be safe, we'll patch it to avoid the error.

        # Better: we'll let the command run assuming the command has been fixed to cast boolean.
        # If the command is not fixed, this will raise an error. We'll instruct the user to fix the command.
        out = io.StringIO()
        call_command('update_prediction_accuracy', stdout=out)

        user1.refresh_from_db()
        user2.refresh_from_db()
        assert user1.prediction_accuracy == 50.0
        assert user2.prediction_accuracy == 100.0
        output = out.getvalue()
        assert "Successfully updated" in output

    def test_update_accuracy_dry_run(self):
        user = UserFactory()
        PredictionFactory(user=user, is_correct=True)

        out = io.StringIO()
        call_command('update_prediction_accuracy', '--dry-run', stdout=out)

        user.refresh_from_db()
        assert user.prediction_accuracy == 0.0
        assert "Dry-run mode" in out.getvalue()

    def test_update_accuracy_batch_size(self):
        users = [UserFactory() for _ in range(5)]
        for user in users:
            PredictionFactory(user=user, is_correct=True)

        out = io.StringIO()
        call_command('update_prediction_accuracy', '--batch-size', '2', stdout=out)

        for user in users:
            user.refresh_from_db()
            assert user.prediction_accuracy == 100.0


# ============================================================================
# 5. WAIT FOR DATABASE
# ============================================================================

class TestWaitForDBCommand:
    def test_wait_for_db_success(self):
        out = io.StringIO()
        call_command('wait_for_db', stdout=out)
        assert "Database available" in out.getvalue()

    def test_wait_for_db_timeout(self):
        with patch('time.sleep') as mock_sleep:
            # Force every cursor() call to raise OperationalError
            with patch('django.db.connection.cursor') as mock_cursor:
                mock_cursor.side_effect = OperationalError("DB not ready")
                err = io.StringIO()
                with pytest.raises(CommandError, match="Database not available"):
                    call_command('wait_for_db', '--timeout', '1', stderr=err)
                assert "timeout" in err.getvalue().lower()

    def test_wait_for_db_quiet(self):
        out = io.StringIO()
        call_command('wait_for_db', '--quiet', stdout=out)
        assert out.getvalue() == ""


# ============================================================================
# 6. SEND WEEKLY DIGEST
# ============================================================================

class TestSendWeeklyDigestCommand:
    def test_send_weekly_digest_no_users(self):
        out = io.StringIO()
        call_command('send_weekly_digest', stdout=out)
        assert "No users opted in" in out.getvalue()

    def test_send_weekly_digest_with_users(self):
        user1 = UserFactory(email_verified=True)
        prefs1 = user1.user_preferences
        prefs1.weekly_digest = True
        prefs1.save()

        user2 = UserFactory(email_verified=True)
        prefs2 = user2.user_preferences
        prefs2.weekly_digest = True
        prefs2.save()

        user3 = UserFactory(email_verified=True)
        prefs3 = user3.user_preferences
        prefs3.weekly_digest = False
        prefs3.save()

        PredictionFactory(user=user1, created_at=timezone.now() - timedelta(days=2))
        PredictionFactory(user=user1, created_at=timezone.now() - timedelta(days=5))
        PredictionFactory(user=user2, created_at=timezone.now() - timedelta(days=1))

        # Patch the local import inside the command module
        with patch('stocks.management.commands.send_weekly_digest.send_email_async') as mock_send:
            mock_send.return_value = True
            out = io.StringIO()
            call_command('send_weekly_digest', stdout=out)
            assert mock_send.call_count == 2
            assert "Successfully sent" in out.getvalue()

    def test_send_weekly_digest_dry_run(self):
        user = UserFactory(email_verified=True)
        prefs = user.user_preferences
        prefs.weekly_digest = True
        prefs.save()

        with patch('stocks.management.commands.send_weekly_digest.send_email_async') as mock_send:
            out = io.StringIO()
            call_command('send_weekly_digest', '--dry-run', stdout=out)
            mock_send.assert_not_called()
            assert "Dry-run mode" in out.getvalue()

    def test_send_weekly_digest_handles_email_failure(self):
        user = UserFactory(email_verified=True)
        prefs = user.user_preferences
        prefs.weekly_digest = True
        prefs.save()

        with patch('stocks.management.commands.send_weekly_digest.send_email_async') as mock_send:
            mock_send.side_effect = Exception("SMTP error")
            out = io.StringIO()
            call_command('send_weekly_digest', stdout=out)
            assert "failed: 1" in out.getvalue()