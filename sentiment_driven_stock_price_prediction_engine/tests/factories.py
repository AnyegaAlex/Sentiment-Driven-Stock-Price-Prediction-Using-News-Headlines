"""
Factory classes for generating test data.

Uses factory-boy and Faker to create realistic, edge‑case‑ready test data.

Author: Tickflow Capital
Version: 2.0.0
"""

import hashlib
import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from faker import Faker

from authentication.models import User, UserAPIKey, UserPreferences, AuditLog
from stocks.models import Prediction, Subscription, ModelPerformanceSnapshot
from news.models import ProcessedNews, SymbolSearchCache

fake = Faker()
User = get_user_model()


# ============================================================================
# USER FACTORIES
# ============================================================================

class UserFactory(DjangoModelFactory):
    """Standard active, verified user with preferences."""

    class Meta:
        model = User
        django_get_or_create = ("email",)

    username = factory.Sequence(lambda n: f"testuser_{n}")
    email = factory.Sequence(lambda n: f"user_{n}@example.com")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True
    email_verified = True
    is_superuser = False
    is_staff = False

    @factory.post_generation
    def with_preferences(self, create, extracted, **kwargs):
        """
        Create associated UserPreferences unless skip_preferences is True.
        Usage: UserFactory(skip_preferences=True)
        """
        if create and not kwargs.get('skip_preferences', False):
            UserPreferences.objects.get_or_create(user=self)

    @factory.post_generation
    def with_api_key(self, create, extracted, **kwargs):
        """Create an API key for the user."""
        if create:
            name = extracted or "Test API Key"
            UserAPIKey.create_key(self, name)


class UnverifiedUserFactory(UserFactory):
    """User with unverified email."""
    email_verified = False


class InactiveUserFactory(UserFactory):
    """Deactivated user."""
    is_active = False


class AdminUserFactory(UserFactory):
    """Superuser admin."""
    is_superuser = True
    is_staff = True


class DeletionPendingUserFactory(UserFactory):
    """User with pending deletion."""
    is_active = False
    deletion_requested_at = factory.LazyFunction(timezone.now)
    deletion_scheduled_for = factory.LazyFunction(
        lambda: timezone.now() + timezone.timedelta(days=30)
    )


# ============================================================================
# USER API KEY FACTORY (Fixed with post_generation)
# ============================================================================

class UserAPIKeyFactory(DjangoModelFactory):
    """Factory for active API keys."""

    class Meta:
        model = UserAPIKey

    user = factory.SubFactory(UserFactory)
    name = factory.Faker("word")
    is_active = True
    expires_at = None

    @factory.post_generation
    def create_key(self, create, extracted, **kwargs):
        """Generate the actual API key using the model's method."""
        if create:
            key_obj, raw_key = UserAPIKey.create_key(self.user, self.name)
            # Copy over any other fields
            for attr in ("is_active", "expires_at"):
                if hasattr(self, attr):
                    setattr(key_obj, attr, getattr(self, attr))
            key_obj.save()
            self.pk = key_obj.pk
            self._raw_key = raw_key


class ExpiredUserAPIKeyFactory(UserAPIKeyFactory):
    """API key that has expired."""
    expires_at = factory.LazyFunction(
        lambda: timezone.now() - timezone.timedelta(days=1)
    )


# ============================================================================
# AUDIT LOG FACTORY (New)
# ============================================================================

class AuditLogFactory(DjangoModelFactory):
    """Factory for audit log entries."""

    class Meta:
        model = AuditLog

    user = factory.SubFactory(UserFactory)
    action = factory.Iterator([
        "LOGIN_SUCCESS", "LOGIN_FAILED", "PASSWORD_CHANGED",
        "EMAIL_CHANGED", "API_KEY_CREATED", "API_KEY_REVOKED"
    ])
    details = factory.LazyAttribute(
        lambda _: {"ip": "127.0.0.1", "user_agent": "pytest/1.0"}
    )
    timestamp = factory.LazyFunction(timezone.now)


# ============================================================================
# PREDICTION FACTORY
# ============================================================================

class PredictionFactory(DjangoModelFactory):
    """Factory for predictions (with resolution hooks)."""

    class Meta:
        model = Prediction

    user = factory.SubFactory(UserFactory)
    stock_symbol = factory.Iterator(["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"])
    predicted_movement = factory.Iterator(["UP", "DOWN", "HOLD"])
    confidence = factory.Faker("pyfloat", min_value=0.0, max_value=1.0)
    sentiment_score = factory.Faker("pyfloat", min_value=-1.0, max_value=1.0)
    headline = factory.Faker("sentence", nb_words=8)
    source = factory.Iterator(["lstm", "sentiment", "hybrid"])
    date = factory.LazyFunction(timezone.now)
    created_at = factory.LazyFunction(timezone.now)
    resolution_date = None
    is_correct = None
    price_at_prediction = factory.Faker("pyfloat", min_value=10, max_value=500)
    shap_values = None
    feature_importance = None
    prediction_explanation = factory.Faker("text", max_nb_chars=200)

    @factory.post_generation
    def resolved_correct(self, create, extracted, **kwargs):
        """Mark as resolved and correct."""
        if create and extracted:
            self.resolution_date = timezone.now()
            self.is_correct = True
            self.save()

    @factory.post_generation
    def resolved_incorrect(self, create, extracted, **kwargs):
        """Mark as resolved and incorrect."""
        if create and extracted:
            self.resolution_date = timezone.now()
            self.is_correct = False
            self.save()


# ============================================================================
# PROCESSED NEWS FACTORY
# ============================================================================

class ProcessedNewsFactory(DjangoModelFactory):
    """Factory for news articles with sentiment."""

    class Meta:
        model = ProcessedNews

    symbol = factory.Iterator(["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"])
    title = factory.Faker("sentence", nb_words=10)
    title_hash = factory.LazyAttribute(
        lambda obj: hashlib.sha256(
            (obj.title or "default").encode()
        ).hexdigest()
    )
    summary = factory.Faker("text", max_nb_chars=200)
    url = factory.Faker("url")
    provider = factory.Iterator(["Reuters", "Bloomberg", "CNBC", "Yahoo Finance"])
    source_name = factory.Iterator(["Reuters", "Bloomberg", "CNBC", "Yahoo Finance"])
    published_at = factory.LazyFunction(timezone.now)
    sentiment = factory.Iterator(["positive", "neutral", "negative"])
    confidence = factory.Faker("pyfloat", min_value=0.0, max_value=1.0)
    sentiment_score = factory.Faker("pyfloat", min_value=-1.0, max_value=1.0)
    key_phrases = factory.Faker("sentence", nb_words=5)
    source_reliability = factory.Faker("pyint", min_value=60, max_value=95)
    banner_image_url = factory.Faker("image_url")
    raw_data = factory.LazyAttribute(lambda _: {"source": "test", "data": "mock"})


# ============================================================================
# SUBSCRIPTION FACTORY
# ============================================================================

class SubscriptionFactory(DjangoModelFactory):
    """Factory for email subscriptions."""

    class Meta:
        model = Subscription
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"sub_{n}@example.com")
    is_active = True
    # created_at – it doesn't exist on the model


# ============================================================================
# SYMBOL SEARCH CACHE FACTORY
# ============================================================================

class SymbolSearchCacheFactory(DjangoModelFactory):
    """Factory for symbol search cache."""

    class Meta:
        model = SymbolSearchCache
        django_get_or_create = ("query",)

    query = factory.Sequence(lambda n: f"symbol_{n}")
    results = factory.LazyAttribute(
        lambda obj: [
            {"symbol": obj.query.upper(), "name": f"{obj.query} Inc.", "region": "US"}
        ]
    )
    expires_at = factory.LazyFunction(
        lambda: timezone.now() + timezone.timedelta(minutes=30)
    )


# ============================================================================
# MODEL PERFORMANCE SNAPSHOT FACTORY (New)
# ============================================================================

class ModelPerformanceSnapshotFactory(DjangoModelFactory):
    """Factory for model performance snapshots."""

    class Meta:
        model = ModelPerformanceSnapshot

    accuracy = factory.Faker("pyfloat", min_value=0.0, max_value=1.0)
    precision = factory.Faker("pyfloat", min_value=0.0, max_value=1.0)
    recall = factory.Faker("pyfloat", min_value=0.0, max_value=1.0)
    f1 = factory.Faker("pyfloat", min_value=0.0, max_value=1.0)
    total_predictions = factory.Faker("pyint", min_value=1, max_value=1000)
    correct_predictions = factory.Faker("pyint", min_value=1, max_value=500)
    resolution_date = factory.LazyFunction(timezone.now)



# ============================================================================
# USER PREFERENCES FACTORY
# ============================================================================

class UserPreferencesFactory(DjangoModelFactory):
    """Factory for UserPreferences models."""

    class Meta:
        model = UserPreferences

    user = factory.SubFactory(UserFactory)
    investment_goal = factory.Iterator(['growth', 'income', 'value'])
    risk_tolerance = factory.Iterator(['conservative', 'moderate', 'aggressive'])
    experience_level = factory.Iterator(['beginner', 'intermediate', 'advanced'])
    watchlist = factory.LazyAttribute(lambda _: ['AAPL', 'MSFT'])
    email_notifications = True
    price_alerts = True
    news_alerts = True
    theme = 'system'
    language = 'en'
    timezone = 'UTC'
    weekly_digest = True