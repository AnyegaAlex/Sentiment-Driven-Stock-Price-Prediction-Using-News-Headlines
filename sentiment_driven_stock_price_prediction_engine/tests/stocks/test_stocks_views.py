"""
Tests for stocks/views.py – all endpoints.

P1 rewrite: protected endpoints use an authenticated DRF client; price- and news-derived
responses are tested with the gates open (explicit override) and closed (503 / disabled).
Provider and helper internals are mocked at the names the views actually call. No
fallback values are expected: missing data is reported as unavailable.
"""

import os
import json
import pytest
from unittest.mock import patch, MagicMock, Mock
from datetime import datetime, timedelta
from django.urls import reverse
from django.utils import timezone
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient
from rest_framework import status

from authentication.models import User
from stocks.models import Prediction, Subscription
import stocks.views

from tests.conftest import JWTAPIClient

pytestmark = pytest.mark.django_db

GATES_OPEN = dict(PRICE_DATA_PUBLIC_ACCESS=True, NEWS_PUBLIC_ACCESS=True)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def authenticated_user():
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        is_active=True
    )


@pytest.fixture
def auth_client(authenticated_user):
    client = JWTAPIClient()
    client.force_authenticate(user=authenticated_user)
    return client


@pytest.fixture
def sample_prediction(authenticated_user):
    return Prediction.objects.create(
        date=timezone.now().date(),
        stock_symbol='AAPL',
        headline='Test prediction',
        sentiment_score=0.5,
        predicted_movement='up',
        confidence=0.75,
        source='lstm',
        user=authenticated_user,
    )


@pytest.fixture
def another_user():
    return User.objects.create_user(
        username='otheruser', email='other@example.com', password='testpass123', is_active=True
    )


@pytest.fixture
def sample_subscription():
    return Subscription.objects.create(
        email='subscriber@example.com',
        is_active=True,
    )


# ============================================================================
# Test: StockOpinionView (legacy) - price-derived, gate applies
# ============================================================================

class TestStockOpinionView:

    def test_opinion_missing_symbol(self, api_client):
        cache.clear()
        url = reverse('stock-opinion')
        response = api_client.get(url)
        assert response.status_code == 400
        assert 'symbol' in response.json()['error'].lower()

    def test_opinion_closed_gate_hides_prediction(self, api_client):
        cache.clear()
        Prediction.objects.create(
            date=timezone.now().date(), stock_symbol='AAPL', headline='h',
            sentiment_score=0.1, predicted_movement='up', confidence=0.7, source='lstm',
            price_at_prediction=150.0,
        )
        response = api_client.get(reverse('stock-opinion'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        analysis = response.json()['analysis']
        assert analysis['recommendation'] is None
        assert analysis['confidence'] is None
        assert analysis['current_price'] is None

    @override_settings(**GATES_OPEN)
    def test_opinion_open_gate_returns_stored_prediction(self, api_client):
        cache.clear()
        Prediction.objects.create(
            date=timezone.now().date(), stock_symbol='AAPL', headline='h',
            sentiment_score=0.1, predicted_movement='up', confidence=0.7, source='lstm',
            price_at_prediction=150.0,
        )
        response = api_client.get(reverse('stock-opinion'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        analysis = response.json()['analysis']
        assert analysis['recommendation'] == 'UP'
        assert analysis['confidence'] == 70.0
        assert analysis['current_price'] == 150.0

    @override_settings(**GATES_OPEN)
    def test_opinion_no_prediction_is_404_not_generated(self, api_client):
        cache.clear()
        with patch('stocks.opinion_generator.generate_stock_opinion') as gen:
            response = api_client.get(reverse('stock-opinion'), {'symbol': 'AAPL'})
        assert response.status_code == 404
        gen.assert_not_called()


# ============================================================================
# Test: PredictionHistoryView - authenticated, price gate applies
# ============================================================================

class TestPredictionHistoryView:

    def test_history_requires_authentication(self, api_client):
        cache.clear()
        response = api_client.get(reverse('prediction-history'))
        assert response.status_code in (401, 403)

    @override_settings(**GATES_OPEN)
    def test_history_success(self, auth_client, sample_prediction):
        cache.clear()
        response = auth_client.get(reverse('prediction-history'))
        assert response.status_code == 200
        data = response.json()
        assert 'count' in data
        assert 'results' in data
        assert len(data['results']) >= 1
        assert data['results'][0]['stock_symbol'] == 'AAPL'

    @override_settings(**GATES_OPEN)
    def test_history_filter_by_symbol(self, auth_client, sample_prediction, authenticated_user):
        cache.clear()
        Prediction.objects.create(
            date=timezone.now().date(), stock_symbol='MSFT', headline='MSFT prediction',
            sentiment_score=0.6, predicted_movement='up', confidence=0.8, source='lstm',
            user=authenticated_user,
        )
        response = auth_client.get(reverse('prediction-history'), {'symbol': 'MSFT'})
        assert response.status_code == 200
        data = response.json()
        assert data['count'] == 1
        assert data['results'][0]['stock_symbol'] == 'MSFT'

    @override_settings(**GATES_OPEN)
    def test_history_pagination(self, auth_client, authenticated_user):
        cache.clear()
        for i in range(5):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i), stock_symbol='AAPL',
                headline=f'Prediction {i}', sentiment_score=0.5, predicted_movement='up',
                confidence=0.7, source='lstm', user=authenticated_user,
            )
        response = auth_client.get(reverse('prediction-history'), {'limit': 2, 'offset': 2})
        assert response.status_code == 200
        data = response.json()
        assert data['count'] == 5
        assert len(data['results']) == 2
        assert data['next'] is not None
        assert data['previous'] is not None

    @override_settings(**GATES_OPEN)
    def test_history_cache_hit_skips_queryset(self, auth_client):
        cache.clear()
        url = reverse('prediction-history')
        assert auth_client.get(url).status_code == 200
        with patch('stocks.views._visible_predictions') as visible:
            assert auth_client.get(url).status_code == 200
            visible.assert_not_called()

    @override_settings(**GATES_OPEN)
    def test_history_exception_returns_500(self, auth_client):
        cache.clear()
        with patch('stocks.views._visible_predictions', side_effect=Exception('DB error')):
            response = auth_client.get(reverse('prediction-history'))
        assert response.status_code == 500

    def test_history_closed_gate_returns_503(self, auth_client):
        cache.clear()
        response = auth_client.get(reverse('prediction-history'))
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.json()['code'] == 5032


# ============================================================================
# Test: StockAnalysisView - gates control technicals, news and the LSTM block
# ============================================================================

def _sentiment(recent=10, overall='Bullish', score=0.6):
    return {'overall': overall, 'score': score, 'recent_articles': recent,
            'source_stats': {}, 'history': [], 'distribution': None}


class TestStockAnalysisView:

    def test_analysis_missing_symbol(self, api_client):
        cache.clear()
        response = api_client.get(reverse('stock-analysis'))
        assert response.status_code == 400

    @override_settings(**GATES_OPEN)
    def test_analysis_success_with_stored_lstm_prediction(self, api_client, sample_prediction):
        cache.clear()
        mock_tech = {'current_price': 150.0, 'sma_50': 145.0, 'sma_200': 140.0, 'rsi': 55.0,
                     'support': 140.0, 'resistance': 160.0, 'volume': 1000000}
        with patch('stocks.views.get_technical_indicators', return_value=mock_tech), \
             patch('stocks.views.get_sentiment_summary', return_value=_sentiment()):
            response = api_client.get(reverse('stock-analysis'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        data = response.json()['data']
        assert data['symbol'] == 'AAPL'
        assert data['recommendation'] == 'BUY'
        assert data['lstm_prediction']['direction'] == 'UP'
        assert data['technicalIndicators']['currentPrice'] == 150.0
        assert data['dataStatus']['technicals'] == 'live'

    @override_settings(**GATES_OPEN)
    def test_analysis_without_data_is_unavailable_not_fallback(self, api_client):
        cache.clear()
        with patch('stocks.views.get_technical_indicators', return_value=None), \
             patch('stocks.views.get_sentiment_summary', return_value=_sentiment(recent=0, overall='Neutral', score=0.0)):
            response = api_client.get(reverse('stock-analysis'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        data = response.json()['data']
        assert data['lstm_prediction']['direction'] is None
        assert data['recommendation'] is None
        assert data['dataStatus']['technicals'] == 'unavailable'
        assert 'UNAVAILABLE' not in response.content.decode()

    @override_settings(**GATES_OPEN)
    def test_analysis_cache_hit_skips_provider(self, api_client, sample_prediction):
        cache.clear()
        url = reverse('stock-analysis')
        with patch('stocks.views.get_technical_indicators', return_value={'current_price': 100}) as tech, \
             patch('stocks.views.get_sentiment_summary', return_value=_sentiment(recent=5)) as sent:
            assert api_client.get(url, {'symbol': 'AAPL'}).status_code == 200
            assert api_client.get(url, {'symbol': 'AAPL'}).status_code == 200
        assert tech.call_count == 1
        assert sent.call_count == 1

    def test_analysis_closed_gates_disable_everything_price_and_news(self, api_client, sample_prediction):
        cache.clear()
        with patch('stocks.views.get_technical_indicators') as tech, \
             patch('stocks.views.get_sentiment_summary', return_value=_sentiment()):
            response = api_client.get(reverse('stock-analysis'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        data = response.json()['data']
        assert data['dataStatus'] == {'technicals': 'disabled', 'prediction': 'disabled', 'news': 'disabled'}
        assert data['recommendation'] is None
        assert data['lstm_prediction']['direction'] is None
        assert data['sentiment']['recent_articles'] == 0
        tech.assert_not_called()


# ============================================================================
# Test: TechnicalIndicatorsView - price gate applies
# ============================================================================

class TestTechnicalIndicatorsView:

    def test_indicators_missing_symbol(self, api_client):
        cache.clear()
        response = api_client.get(reverse('technical-indicators'))
        assert response.status_code == 400

    @override_settings(**GATES_OPEN)
    def test_indicators_success(self, api_client):
        cache.clear()
        mock_tech = {'current_price': 150.0, 'sma_50': 145.0, 'sma_200': 140.0, 'rsi': 55.0,
                     'support': 140.0, 'resistance': 160.0, 'volume': 1000000, 'volatility': 0.2,
                     'price_history': [140, 145, 150]}
        with patch('stocks.views.get_technical_indicators', return_value=mock_tech) as tech:
            response = api_client.get(reverse('technical-indicators'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        data = response.json()['data']
        assert data['status'] == 'live'
        assert data['technical']['current_price'] == 150.0
        assert data['technical']['rsi'] == 55.0
        tech.assert_called_once_with('AAPL', '1d')

    @override_settings(**GATES_OPEN)
    def test_indicators_no_live_data_is_unavailable_not_fallback(self, api_client):
        cache.clear()
        with patch('stocks.views.get_technical_indicators', return_value=None):
            response = api_client.get(reverse('technical-indicators'), {'symbol': 'UNKNOWN'})
        assert response.status_code == 200
        data = response.json()['data']
        assert data['technical'] is None
        assert data['status'] == 'unavailable'

    def test_indicators_closed_gate_returns_503_without_provider_call(self, api_client):
        cache.clear()
        with patch('stocks.views.get_technical_indicators') as tech:
            response = api_client.get(reverse('technical-indicators'), {'symbol': 'AAPL'})
        assert response.status_code == 503
        assert response.json()['code'] == 5031
        tech.assert_not_called()


# ============================================================================
# Test: SymbolsListView (unchanged behaviour)
# ============================================================================

class TestSymbolsListView:

    def test_symbols_success(self, api_client):
        cache.clear()
        url = reverse('symbols')
        response = api_client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 10
        symbols = [item['symbol'] for item in data]
        assert 'AAPL' in symbols

    def test_symbols_cache_hit(self, api_client):
        cache.clear()
        url = reverse('symbols')
        response1 = api_client.get(url)
        assert response1.status_code == 200
        with patch('stocks.views.SymbolSerializer') as mock_serializer:
            response2 = api_client.get(url)
            assert response2.status_code == 200
            mock_serializer.assert_not_called()

    def test_symbols_exception_returns_500(self, api_client):
        cache.clear()
        with patch('stocks.views.SymbolSerializer', side_effect=Exception('Error')):
            url = reverse('symbols')
            response = api_client.get(url)
            assert response.status_code == 500


# ============================================================================
# Test: SubscribeView (unchanged behaviour)
# ============================================================================

class TestSubscribeView:

    def test_subscribe_new_email(self, api_client):
        cache.clear()
        url = reverse('subscribe')
        data = {'email': 'new@example.com'}
        response = api_client.post(url, data, format='json')
        assert response.status_code == 201
        assert 'Subscribed successfully' in response.json()['message']
        assert Subscription.objects.filter(email='new@example.com', is_active=True).exists()

    def test_subscribe_existing_inactive(self, api_client):
        cache.clear()
        sub = Subscription.objects.create(email='inactive@example.com', is_active=False)
        url = reverse('subscribe')
        data = {'email': 'inactive@example.com'}
        response = api_client.post(url, data, format='json')
        assert response.status_code == 200
        assert 'reactivated' in response.json()['message']
        sub.refresh_from_db()
        assert sub.is_active is True

    def test_subscribe_existing_active(self, api_client, sample_subscription):
        cache.clear()
        url = reverse('subscribe')
        data = {'email': sample_subscription.email}
        response = api_client.post(url, data, format='json')
        assert response.status_code == 400
        assert 'already subscribed' in response.json().get('error', '').lower()

    def test_subscribe_invalid_email(self, api_client):
        cache.clear()
        url = reverse('subscribe')
        data = {'email': 'not-an-email'}
        response = api_client.post(url, data, format='json')
        assert response.status_code == 400
        assert 'error' in response.json() or 'details' in response.json()


# ============================================================================
# Test: LSTMPredictionView - reads stored predictions, price gate applies
# ============================================================================

class TestLSTMPredictionView:

    def test_lstm_missing_symbol(self, api_client):
        cache.clear()
        response = api_client.get(reverse('lstm-predict'))
        assert response.status_code == 400

    @override_settings(**GATES_OPEN)
    def test_lstm_success_from_stored_prediction(self, api_client, sample_prediction):
        cache.clear()
        response = api_client.get(reverse('lstm-predict'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        data = response.json()['data']
        assert data['prediction'] == 'UP'
        assert data['confidence'] == 75.0
        assert data['success'] is True

    @override_settings(**GATES_OPEN)
    def test_lstm_no_stored_prediction_is_unavailable(self, api_client):
        cache.clear()
        response = api_client.get(reverse('lstm-predict'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        data = response.json()['data']
        assert data['status'] == 'unavailable'
        assert data['prediction'] is None

    def test_lstm_closed_gate_returns_503(self, api_client, sample_prediction):
        cache.clear()
        response = api_client.get(reverse('lstm-predict'), {'symbol': 'AAPL'})
        assert response.status_code == 503
        assert 'UP' not in response.content.decode()

    @override_settings(**GATES_OPEN)
    def test_lstm_read_does_not_write_predictions(self, api_client, sample_prediction):
        cache.clear()
        before = Prediction.objects.count()
        assert api_client.get(reverse('lstm-predict'), {'symbol': 'AAPL'}).status_code == 200
        assert Prediction.objects.count() == before

    @override_settings(**GATES_OPEN)
    def test_lstm_cache_hit_serves_cached_value(self, api_client, sample_prediction):
        cache.clear()
        url = reverse('lstm-predict')
        assert api_client.get(url, {'symbol': 'AAPL'}).json()['data']['prediction'] == 'UP'
        Prediction.objects.all().delete()
        second = api_client.get(url, {'symbol': 'AAPL'}).json()['data']
        assert second['prediction'] == 'UP'


# ============================================================================
# Test: SentimentAnalysisView - news gate applies
# ============================================================================

class TestSentimentAnalysisView:

    def test_sentiment_missing_symbol(self, api_client):
        cache.clear()
        response = api_client.get(reverse('sentiment-analysis'))
        assert response.status_code == 400

    @override_settings(**GATES_OPEN)
    def test_sentiment_success(self, api_client):
        cache.clear()
        summary = {'overall': 'Bullish', 'score': 0.65, 'recent_articles': 10,
                   'source_stats': {'tier1_count': 3}, 'history': [], 'distribution': None}
        with patch('stocks.views.get_sentiment_summary', return_value=summary):
            response = api_client.get(reverse('sentiment-analysis'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        data = response.json()['data']
        assert data['sentiment']['label'] == 'Bullish'
        assert data['news_count'] == 10

    @override_settings(**GATES_OPEN)
    def test_sentiment_error_returns_500_not_neutral(self, api_client):
        cache.clear()
        with patch('stocks.views.get_sentiment_summary', side_effect=Exception('boom')):
            response = api_client.get(reverse('sentiment-analysis'), {'symbol': 'AAPL'})
        assert response.status_code == 500
        assert response.json()['code'] == 5001

    @override_settings(**GATES_OPEN)
    def test_sentiment_cache_hit_skips_provider(self, api_client):
        cache.clear()
        summary = {'overall': 'Neutral', 'score': 0.0, 'recent_articles': 2,
                   'source_stats': {}, 'history': [], 'distribution': None}
        url = reverse('sentiment-analysis')
        with patch('stocks.views.get_sentiment_summary', return_value=summary) as sent:
            assert api_client.get(url, {'symbol': 'AAPL'}).status_code == 200
            assert api_client.get(url, {'symbol': 'AAPL'}).status_code == 200
        assert sent.call_count == 1

    def test_sentiment_closed_gate_returns_503(self, api_client):
        cache.clear()
        with patch('stocks.views.get_sentiment_summary') as sent:
            response = api_client.get(reverse('sentiment-analysis'), {'symbol': 'AAPL'})
        assert response.status_code == 503
        assert response.json()['code'] == 5030
        sent.assert_not_called()


# ============================================================================
# Test: PredictionListView - authenticated, price gate applies
# ============================================================================

class TestPredictionListView:

    def test_list_requires_authentication(self, api_client):
        response = api_client.get(reverse('predictions'))
        assert response.status_code in (401, 403)

    @override_settings(**GATES_OPEN)
    def test_list_success(self, auth_client, sample_prediction):
        response = auth_client.get(reverse('predictions'))
        assert response.status_code == 200
        data = response.json()
        assert data['total'] >= 1
        assert data['limit'] == 50

    @override_settings(**GATES_OPEN)
    def test_list_filter_by_symbol(self, auth_client, sample_prediction, authenticated_user):
        Prediction.objects.create(date=timezone.now().date(), stock_symbol='MSFT', headline='m',
                                  sentiment_score=0.1, predicted_movement='up', confidence=0.6,
                                  source='lstm', user=authenticated_user)
        response = auth_client.get(reverse('predictions'), {'symbol': 'MSFT'})
        assert response.status_code == 200
        data = response.json()
        assert data['total'] == 1
        assert data['results'][0]['stock_symbol'] == 'MSFT'

    @override_settings(**GATES_OPEN)
    def test_list_filter_by_outcome(self, auth_client, authenticated_user):
        for correct in (True, False):
            Prediction.objects.create(date=timezone.now().date(), stock_symbol='AAPL', headline='o',
                                      sentiment_score=0.1, predicted_movement='up', confidence=0.6,
                                      source='lstm', user=authenticated_user, is_correct=correct)
        response = auth_client.get(reverse('predictions'), {'outcome': 'correct'})
        assert response.json()['total'] == 1

    @override_settings(**GATES_OPEN)
    def test_list_pagination(self, auth_client, authenticated_user):
        for i in range(5):
            Prediction.objects.create(date=timezone.now().date() - timedelta(days=i), stock_symbol='AAPL',
                                      headline=f'p{i}', sentiment_score=0.1, predicted_movement='up',
                                      confidence=0.6, source='lstm', user=authenticated_user)
        response = auth_client.get(reverse('predictions'), {'limit': 2, 'offset': 2})
        data = response.json()
        assert data['total'] == 5
        assert len(data['results']) == 2
        assert data['offset'] == 2

    def test_list_closed_gate_returns_503(self, auth_client):
        response = auth_client.get(reverse('predictions'))
        assert response.status_code == 503


# ============================================================================
# Test: PerformanceSummaryView - system predictions only, price gate applies
# ============================================================================

class TestPerformanceSummaryView:

    @override_settings(**GATES_OPEN)
    def test_performance_success(self, api_client):
        for correct in (True, False):
            Prediction.objects.create(date=timezone.now().date(), stock_symbol='AAPL', headline='s',
                                      sentiment_score=0.1, predicted_movement='up', confidence=0.6,
                                      source='lstm', user=None, is_correct=correct,
                                      resolution_date=timezone.now() - timedelta(days=1))
        response = api_client.get(reverse('performance'))
        assert response.status_code == 200
        data = response.json()
        assert data['total_predictions'] == 2
        assert data['correct_predictions'] == 1
        assert 'overall' in data

    @override_settings(**GATES_OPEN)
    def test_performance_filter_by_symbol(self, api_client):
        for sym in ('AAPL', 'MSFT'):
            Prediction.objects.create(date=timezone.now().date(), stock_symbol=sym, headline='s',
                                      sentiment_score=0.1, predicted_movement='up', confidence=0.6,
                                      source='lstm', user=None, is_correct=True,
                                      resolution_date=timezone.now() - timedelta(days=1))
        response = api_client.get(reverse('performance'), {'symbol': 'AAPL'})
        assert response.status_code == 200
        assert response.json()['total_predictions'] == 1

    @override_settings(**GATES_OPEN)
    def test_performance_excludes_user_owned_predictions(self, api_client, authenticated_user):
        Prediction.objects.create(date=timezone.now().date(), stock_symbol='AAPL', headline='own',
                                  sentiment_score=0.1, predicted_movement='up', confidence=0.6,
                                  source='lstm', user=authenticated_user, is_correct=True,
                                  resolution_date=timezone.now() - timedelta(days=1))
        response = api_client.get(reverse('performance'))
        assert response.json()['total_predictions'] == 0

    def test_performance_closed_gate_returns_503(self, api_client):
        assert api_client.get(reverse('performance')).status_code == 503


# ============================================================================
# Test: DriftDetectionView - authenticated, price gate applies
# ============================================================================

class TestDriftDetectionView:

    @override_settings(**GATES_OPEN)
    def test_drift_success(self, auth_client):
        with patch('stocks.views.detect_drift', return_value={'drift_detected': False}) as drift:
            response = auth_client.get(reverse('drift'), {'recent_days': 14, 'baseline_days': 60})
        assert response.status_code == 200
        assert response.json()['drift_detected'] is False
        drift.assert_called_once_with(recent_period_days=14, baseline_period_days=60)

    def test_drift_requires_authentication(self, api_client):
        response = api_client.get(reverse('drift'))
        assert response.status_code in (401, 403)

    def test_drift_closed_gate_returns_503(self, auth_client):
        with patch('stocks.views.detect_drift') as drift:
            response = auth_client.get(reverse('drift'))
        assert response.status_code == 503
        drift.assert_not_called()


# ============================================================================
# Test: SHAPExplanationView - owner-only, price gate applies
# ============================================================================

class TestSHAPExplanationView:

    @override_settings(**GATES_OPEN)
    def test_shap_success_for_owner(self, auth_client, sample_prediction):
        response = auth_client.get(reverse('shap', args=[sample_prediction.id]))
        assert response.status_code == 200
        assert response.json()['id'] == sample_prediction.id

    @override_settings(**GATES_OPEN)
    def test_shap_not_found(self, auth_client):
        response = auth_client.get(reverse('shap', args=[999999]))
        assert response.status_code == 404

    @override_settings(**GATES_OPEN)
    def test_shap_other_users_prediction_is_404(self, auth_client, another_user):
        foreign = Prediction.objects.create(date=timezone.now().date(), stock_symbol='AAPL', headline='x',
                                            sentiment_score=0.1, predicted_movement='up', confidence=0.6,
                                            source='lstm', user=another_user)
        response = auth_client.get(reverse('shap', args=[foreign.id]))
        assert response.status_code == 404

    def test_shap_closed_gate_returns_503(self, auth_client, sample_prediction):
        response = auth_client.get(reverse('shap', args=[sample_prediction.id]))
        assert response.status_code == 503


# ============================================================================
# Test: Cron endpoint - deprecated; does nothing
# ============================================================================

class TestCronResolvePredictions:

    def test_cron_get_is_gone_and_runs_nothing(self, api_client, sample_prediction):
        before = Prediction.objects.count()
        with patch.dict(os.environ, {'CRON_SECRET': 'valid-secret'}):
            response = api_client.get(reverse('cron_resolve'), {'secret': 'valid-secret'})
        assert response.status_code == status.HTTP_410_GONE
        assert Prediction.objects.count() == before

    def test_cron_post_is_gone(self, api_client):
        response = api_client.post(reverse('cron_resolve'), {}, format='json')
        assert response.status_code == status.HTTP_410_GONE

    def test_cron_missing_and_invalid_secret_are_gone_too(self, api_client):
        assert api_client.get(reverse('cron_resolve')).status_code == status.HTTP_410_GONE
        assert api_client.get(reverse('cron_resolve'), {'secret': 'wrong'}).status_code == status.HTTP_410_GONE
