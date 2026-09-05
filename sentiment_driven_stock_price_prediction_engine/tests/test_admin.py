"""
Tier 19: Admin Interface – Full Test Suite

Tests:
- All models are registered in the admin site.
- Admin pages (index, changelist, add, change) load without errors.
- Search and list filters work.
- Custom admin actions work.
- Custom display methods render correctly.
- Access control: staff users can access, non‑staff and unauthenticated are blocked.

Author: Tickflow Capital
Version: 1.0.0
"""

import pytest
from django.contrib.admin import site as admin_site
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test import Client
from django.utils import timezone  # ✅ Required for fixtures

from authentication.models import (
    User, AuditLog, UserPreferences, UserAPIKey, SymbolUsage
)
from news.models import ProcessedNews, SymbolSearchCache, StockSymbol
from stocks.models import StockOpinion, Prediction, ModelPerformanceSnapshot, Subscription

User = get_user_model()

pytestmark = pytest.mark.django_db


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def user(db):
    """Create a regular (non‑staff) user."""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        is_active=True,
    )


@pytest.fixture
def admin_user(db):
    """Create a staff/superuser for admin access."""
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='adminpass123',
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def admin_client(client, admin_user):
    """Authenticated admin client with staff privileges."""
    client.force_login(admin_user)
    return client


@pytest.fixture
def sample_processed_news(db, user):
    """Create a sample ProcessedNews instance for change page testing."""
    return ProcessedNews.objects.create(
        symbol='AAPL',
        title='Apple announces new product',
        summary='Apple announced a new product today.',
        url='https://example.com',
        provider='finnhub',
        source_name='Reuters',
        published_at=timezone.now(),
        sentiment='positive',
        confidence=0.85,
        sentiment_score=0.75,
    )


@pytest.fixture
def sample_stock_opinion(db, user):
    return StockOpinion.objects.create(
        symbol='AAPL',
        action='buy',
        horizon='medium',
        technical_confidence=70.0,
        sentiment_confidence=65.0,
        composite_confidence=68.0,
        explanation='Good fundamentals.',
    )


@pytest.fixture
def sample_prediction(db, user):
    return Prediction.objects.create(
        date=timezone.now().date(),
        stock_symbol='AAPL',
        headline='Prediction for AAPL',
        sentiment_score=0.6,
        predicted_movement='up',
        confidence=0.75,
        source='lstm',
        user=user,
    )


@pytest.fixture
def sample_subscription(db):
    return Subscription.objects.create(
        email='test@example.com',
        is_active=True,
    )


# ============================================================================
# Helper
# ============================================================================

def get_admin_url(model, action='changelist', object_id=None):
    """Return admin URL for a model."""
    app_label = model._meta.app_label
    model_name = model._meta.model_name
    if action == 'changelist':
        return reverse(f'admin:{app_label}_{model_name}_changelist')
    elif action == 'add':
        return reverse(f'admin:{app_label}_{model_name}_add')
    elif action == 'change' and object_id:
        return reverse(f'admin:{app_label}_{model_name}_change', args=[object_id])
    else:
        raise ValueError(f"Unsupported action: {action}")


# ============================================================================
# Tests
# ============================================================================

class TestAdminRegistration:
    """Verify that all expected models are registered."""

    def test_authentication_models_registered(self):
        expected = [User, AuditLog, UserPreferences, UserAPIKey, SymbolUsage]
        for model in expected:
            assert model in admin_site._registry, f"{model.__name__} not registered"

    def test_news_models_registered(self):
        expected = [ProcessedNews, SymbolSearchCache, StockSymbol]
        for model in expected:
            assert model in admin_site._registry, f"{model.__name__} not registered"

    def test_stocks_models_registered(self):
        expected = [StockOpinion, Prediction, ModelPerformanceSnapshot, Subscription]
        for model in expected:
            assert model in admin_site._registry, f"{model.__name__} not registered"


class TestAdminAccess:
    """Test admin access permissions."""

    def test_admin_index_accessible_for_staff(self, admin_client):
        url = reverse('admin:index')
        response = admin_client.get(url)
        assert response.status_code == 200

    def test_admin_index_redirects_for_non_staff(self, client, user):
        client.force_login(user)
        url = reverse('admin:index')
        response = client.get(url)
        assert response.status_code == 302
        assert 'login' in response.url

    def test_admin_index_blocks_unauthenticated(self, client):
        url = reverse('admin:index')
        response = client.get(url)
        assert response.status_code == 302
        assert 'login' in response.url


class TestAdminPages:
    """Ensure each model's admin pages load without errors."""

    @pytest.mark.parametrize('model', [
        User, AuditLog, UserPreferences, UserAPIKey, SymbolUsage,
        ProcessedNews, SymbolSearchCache, StockSymbol,
        StockOpinion, Prediction, ModelPerformanceSnapshot, Subscription,
    ])
    def test_changelist_loads(self, admin_client, model):
        url = get_admin_url(model, 'changelist')
        response = admin_client.get(url)
        assert response.status_code == 200

    @pytest.mark.parametrize('model', [
        User, AuditLog, UserPreferences, UserAPIKey, SymbolUsage,
        ProcessedNews, SymbolSearchCache, StockSymbol,
        StockOpinion, Prediction, ModelPerformanceSnapshot, Subscription,
    ])
    def test_add_page_loads(self, admin_client, model):
        url = get_admin_url(model, 'add')
        response = admin_client.get(url)
        # Some models are read‑only (e.g., AuditLog) – they may not have add permission.
        assert response.status_code in [200, 403]

    def test_change_page_for_processed_news(self, admin_client, sample_processed_news):
        url = get_admin_url(ProcessedNews, 'change', sample_processed_news.id)
        response = admin_client.get(url)
        assert response.status_code == 200

    def test_change_page_for_stock_opinion(self, admin_client, sample_stock_opinion):
        url = get_admin_url(StockOpinion, 'change', sample_stock_opinion.id)
        response = admin_client.get(url)
        assert response.status_code == 200

    def test_change_page_for_prediction(self, admin_client, sample_prediction):
        url = get_admin_url(Prediction, 'change', sample_prediction.id)
        response = admin_client.get(url)
        assert response.status_code == 200

    def test_change_page_for_subscription(self, admin_client, sample_subscription):
        url = get_admin_url(Subscription, 'change', sample_subscription.id)
        response = admin_client.get(url)
        assert response.status_code == 200


class TestAdminSearchAndFilters:
    """Test that search and list filters don't raise errors."""

    @pytest.mark.parametrize('model', [
        User, AuditLog, UserPreferences, UserAPIKey, SymbolUsage,
        ProcessedNews, SymbolSearchCache, StockSymbol,
        StockOpinion, Prediction, ModelPerformanceSnapshot, Subscription,
    ])
    def test_search_works(self, admin_client, model):
        url = get_admin_url(model, 'changelist')
        response = admin_client.get(url, {'q': 'test'})
        assert response.status_code == 200

    @pytest.mark.parametrize('model,filter_param', [
        (User, 'is_active__exact=1'),
        (ProcessedNews, 'symbol__exact=AAPL'),
        (ProcessedNews, 'sentiment__exact=positive'),
        (StockOpinion, 'action__exact=buy'),
        (Prediction, 'predicted_movement__exact=up'),
        (ModelPerformanceSnapshot, 'drift_detected__exact=1'),
        (Subscription, 'is_active__exact=1'),
    ])
    def test_list_filter_works(self, admin_client, model, filter_param):
        url = get_admin_url(model, 'changelist')
        # Split key=value
        key, value = filter_param.split('__exact=') if '__exact=' in filter_param else filter_param.split('=')
        response = admin_client.get(url, {key: value})
        assert response.status_code == 200


class TestAdminActions:
    """Test custom admin actions (where defined)."""

    def test_prediction_recalculate_accuracy_action(self, admin_client, sample_prediction):
        url = get_admin_url(Prediction, 'changelist')
        data = {
            'action': 'recalculate_accuracy',
            '_selected_action': [str(sample_prediction.id)],
            'index': 0,
        }
        response = admin_client.post(url, data, follow=True)
        assert response.status_code == 200

    def test_subscription_activate_action(self, admin_client, sample_subscription):
        sample_subscription.is_active = False
        sample_subscription.save()
        url = get_admin_url(Subscription, 'changelist')
        data = {
            'action': 'activate_subscriptions',
            '_selected_action': [str(sample_subscription.id)],
            'index': 0,
        }
        response = admin_client.post(url, data, follow=True)
        assert response.status_code == 200
        sample_subscription.refresh_from_db()
        assert sample_subscription.is_active is True

    def test_subscription_deactivate_action(self, admin_client, sample_subscription):
        url = get_admin_url(Subscription, 'changelist')
        data = {
            'action': 'deactivate_subscriptions',
            '_selected_action': [str(sample_subscription.id)],
            'index': 0,
        }
        response = admin_client.post(url, data, follow=True)
        assert response.status_code == 200
        sample_subscription.refresh_from_db()
        assert sample_subscription.is_active is False


class TestCustomAdminDisplay:
    """Test that custom display methods render without errors."""

    def test_processed_news_custom_display(self, admin_client, sample_processed_news):
        url = get_admin_url(ProcessedNews, 'changelist')
        response = admin_client.get(url)
        content = response.content.decode()
        assert response.status_code == 200
        assert 'color' in content or 'progress' in content

    def test_stock_opinion_color_action(self, admin_client, sample_stock_opinion):
        url = get_admin_url(StockOpinion, 'changelist')
        response = admin_client.get(url)
        content = response.content.decode()
        assert response.status_code == 200
        assert 'color' in content or 'buy' in content.lower()

    def test_prediction_confidence_percent(self, admin_client, sample_prediction):
        url = get_admin_url(Prediction, 'changelist')
        response = admin_client.get(url)
        content = response.content.decode()
        assert response.status_code == 200
        assert '75.0%' in content

    def test_performance_snapshot_drift_status(self, admin_client):
        snapshot = ModelPerformanceSnapshot.objects.create(
            date=timezone.now().date(),
            symbol='AAPL',
            drift_detected=True,
            drift_severity='high',
        )
        url = get_admin_url(ModelPerformanceSnapshot, 'changelist')
        response = admin_client.get(url)
        content = response.content.decode()
        assert response.status_code == 200
        assert 'drift' in content or 'high' in content