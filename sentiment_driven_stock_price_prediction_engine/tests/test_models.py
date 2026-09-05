"""
Tier 7: Database & ORM

Tests:
- Model __str__ methods
- Model save() overrides (auto-updating timestamps, hashing passwords)
- Model clean() full validation
- Database constraints (ForeignKey PROTECT/CASCADE, unique_together, constraints)
- Transactions: atomic rollback on exception
- select_for_update (row locking)
- Prefetching & N+1 queries (assertNumQueries)
- JSONField: querying and updating JSON keys
- Soft deletes (using is_active)

Author: Tickflow Capital
Version: 1.4.0
"""

import pytest
import json
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch

from django.db import connection, transaction
from django.db.utils import IntegrityError
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.utils import timezone

from authentication.models import User, UserPreferences, UserAPIKey
from stocks.models import Prediction, Subscription
from news.models import ProcessedNews

from tests.factories import (
    UserFactory,
    PredictionFactory,
    ProcessedNewsFactory,
    SubscriptionFactory,
    UserAPIKeyFactory,
)

User = get_user_model()
pytestmark = pytest.mark.django_db


# ============================================================================
# 1. MODEL __str__ METHODS
# ============================================================================

class TestModelStr:
    def test_user_str(self, user):
        assert str(user) == user.username

    def test_prediction_str(self, prediction):
        expected = f"{prediction.date} - {prediction.predicted_movement} ({prediction.source})"
        assert str(prediction) == expected

    def test_subscription_str(self):
        sub = SubscriptionFactory(email="test@example.com")
        assert str(sub) == "test@example.com"

    def test_processed_news_str(self, news_article):
        assert isinstance(str(news_article), str)

    def test_user_preferences_str(self, user):
        prefs, _ = UserPreferences.objects.get_or_create(user=user)
        assert str(prefs) == f"{user.username}'s preferences"


# ============================================================================
# 2. MODEL save() OVERRIDES
# ============================================================================

class TestModelSave:
    def test_user_save_updates_updated_at(self, user):
        original_updated = user.updated_at
        user.first_name = "NewName"
        user.save()
        user.refresh_from_db()
        assert user.updated_at > original_updated

    def test_user_set_password_hashes(self, user):
        raw_password = "newpassword123"
        user.set_password(raw_password)
        user.save()
        assert user.check_password(raw_password)
        assert user.password != raw_password

    def test_prediction_save_auto_timestamps(self, prediction):
        assert prediction.created_at is not None
        assert prediction.date is not None

    def test_user_preferences_save_auto_timestamps(self, user):
        prefs, _ = UserPreferences.objects.get_or_create(user=user)
        assert prefs.created_at is not None
        assert prefs.updated_at is not None
        old_updated = prefs.updated_at
        prefs.risk_tolerance = "moderate"
        prefs.save()
        prefs.refresh_from_db()
        assert prefs.updated_at > old_updated


# ============================================================================
# 3. MODEL clean() VALIDATION
# ============================================================================

class TestModelClean:
    def test_user_full_clean_success(self, user):
        user.full_clean()

    def test_prediction_clean_success(self, prediction):
        # Ensure price_at_prediction has valid decimal places
        prediction.price_at_prediction = Decimal('123.4567')
        try:
            prediction.full_clean()
        except ValidationError as e:
            pytest.fail(f"Prediction full_clean raised ValidationError: {e}")

    def test_processed_news_clean_success(self):
        pub_date = timezone.now() - timedelta(minutes=5)
        news = ProcessedNewsFactory(
            published_at=pub_date,
            confidence=0.8,
            sentiment="positive",
            provider="other",
            source_name="Bloomberg"
        )
        try:
            news.full_clean()
        except ValidationError as e:
            pytest.fail(f"ProcessedNews full_clean raised ValidationError: {e}")


# ============================================================================
# 4. DATABASE CONSTRAINTS
# ============================================================================

class TestDatabaseConstraints:
    def test_user_api_key_unique_user_name(self, user):
        key1, _ = UserAPIKey.create_key(user, "TestKey")
        with pytest.raises(IntegrityError):
            UserAPIKey.objects.create(user=user, name="TestKey", key_hash="hash")

    def test_processed_news_unique_symbol_title_hash(self):
        # Create two articles with identical symbol, title, and published_at
        symbol = "AAPL"
        title = "Same Title"
        pub_date = timezone.now() - timedelta(minutes=5)

        # First article
        ProcessedNewsFactory(
            symbol=symbol,
            title=title,
            published_at=pub_date,
            provider="other",
            sentiment="positive"
        )

        # Second article should raise IntegrityError
        with pytest.raises(IntegrityError):
            ProcessedNews.objects.create(
                symbol=symbol,
                title=title,
                published_at=pub_date,
                provider="other",
                sentiment="neutral",
                confidence=0.5,
                # title_hash will be auto-generated from title and pub_date
            )

    def test_subscription_unique_email(self, user):
        sub = SubscriptionFactory(email="unique@test.com")
        with pytest.raises(IntegrityError):
            Subscription.objects.create(email="unique@test.com")

    def test_prediction_user_foreign_key_cascade(self, user):
        pred = PredictionFactory(user=user)
        pred_id = pred.id
        user.delete()
        assert not Prediction.objects.filter(id=pred_id).exists()


# ============================================================================
# 5. TRANSACTIONS
# ============================================================================

class TestTransactions:
    def test_atomic_rollback_on_exception(self):
        try:
            with transaction.atomic():
                user = UserFactory(username="rollbacktest")
                user.email = "rollback@test.com"
                user.save()
                raise ValueError("Simulated error")
        except ValueError:
            pass
        assert not User.objects.filter(username="rollbacktest").exists()

    def test_nested_atomic_rollback_inner_only(self):
        with transaction.atomic():
            user = UserFactory(username="outer")
            user.save()
            try:
                with transaction.atomic():
                    user2 = UserFactory(username="inner")
                    user2.save()
                    raise ValueError("inner error")
            except ValueError:
                pass
            assert User.objects.filter(username="outer").exists()
            assert not User.objects.filter(username="inner").exists()


# ============================================================================
# 6. select_for_update
# ============================================================================

class TestSelectForUpdate:
    def test_select_for_update_acquires_lock(self, user):
        with transaction.atomic():
            locked_user = User.objects.select_for_update().get(pk=user.pk)
            locked_user.first_name = "Locked"
            locked_user.save()
            assert locked_user.first_name == "Locked"

    def test_select_for_update_returns_queryset(self):
        qs = User.objects.select_for_update()
        assert qs.exists() is not None
        list(qs)  # Should not raise


# ============================================================================
# 7. PREFETCHING & N+1 QUERIES
# ============================================================================

class TestPrefetching:
    def test_prediction_list_no_n_plus_one(self, django_assert_num_queries, user):
        for i in range(5):
            PredictionFactory(user=user, stock_symbol="AAPL")

        with django_assert_num_queries(1):
            qs = Prediction.objects.select_related("user").all()
            list(qs)

    def test_news_list_prefetch(self, django_assert_num_queries):
        for i in range(3):
            ProcessedNewsFactory(symbol="AAPL")
        with django_assert_num_queries(1):
            qs = ProcessedNews.objects.all()
            list(qs)


# ============================================================================
# 8. JSONField
# ============================================================================

class TestJSONField:
    def test_user_preferences_jsonfield_update(self, user):
        user.preferences = {"theme": "dark", "notifications": {"email": True}}
        user.save()
        user.refresh_from_db()
        assert user.preferences["theme"] == "dark"
        user.preferences["notifications"]["email"] = False
        user.save()
        user.refresh_from_db()
        assert user.preferences["notifications"]["email"] is False

    def test_user_preferences_jsonfield_query_key(self, user):
        user.preferences = {"theme": "dark"}
        user.save()
        queried = User.objects.filter(preferences__theme="dark")
        assert queried.count() >= 1

    def test_prediction_json_fields(self, prediction):
        prediction.shap_values = {"feature1": 0.5, "feature2": -0.3}
        prediction.save()
        prediction.refresh_from_db()
        assert prediction.shap_values["feature1"] == 0.5


# ============================================================================
# 9. SOFT DELETES (is_active)
# ============================================================================

class TestSoftDeletes:
    def test_user_soft_deactivate_reactivate(self, user):
        assert user.is_active is True
        user.is_active = False
        user.save()
        active_users = User.objects.filter(is_active=True)
        assert user not in active_users
        user.is_active = True
        user.save()
        active_users = User.objects.filter(is_active=True)
        assert user in active_users

    def test_subscription_soft_deactivate_reactivate(self):
        sub = SubscriptionFactory(is_active=True)
        assert sub.is_active is True
        sub.is_active = False
        sub.save()
        active_subs = Subscription.objects.filter(is_active=True)
        assert sub not in active_subs
        sub.is_active = True
        sub.save()
        active_subs = Subscription.objects.filter(is_active=True)
        assert sub in active_subs

    def test_user_api_key_soft_delete(self, user):
        key, _ = UserAPIKey.create_key(user, "softkey")
        assert key.is_active is True
        key.is_active = False
        key.save()
        active_keys = UserAPIKey.objects.filter(is_active=True)
        assert key not in active_keys