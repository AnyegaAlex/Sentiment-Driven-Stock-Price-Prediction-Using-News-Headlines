"""
Tests for stocks/views.py – all endpoints.
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
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from authentication.models import User
from stocks.models import Prediction, Subscription
from stocks.serializers import PredictionSerializer
import stocks.views

pytestmark = pytest.mark.django_db


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
    client = APIClient()
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
def sample_subscription():
    return Subscription.objects.create(
        email='subscriber@example.com',
        is_active=True,
    )


# ============================================================================
# Test: StockOpinionView (legacy)
# ============================================================================

class TestStockOpinionView:

    def test_opinion_success(self, api_client):
        cache.clear()
        mock_opinion = {
            'symbol': 'AAPL',
            'recommendation': 'BUY',
            'confidence': 65.0,
            'price': 150.0,
            'technical_indicators': {'rsi': 55},
            'market_regime': {'regime': 'bull'},
        }
        mock_formatted = {
            'success': True,
            'symbol': 'AAPL',
            'analysis': {
                'recommendation': 'BUY',
                'confidence': 65.0,
                'current_price': 150.0,
                'investment_thesis': 'Test thesis',
            },
            'summary': 'Test summary',
        }
        with patch('stocks.opinion_generator.generate_stock_opinion', return_value=mock_opinion) as mock_gen, \
             patch('stocks.opinion_generator.format_investment_analysis', return_value=mock_formatted) as mock_format:
            url = reverse('stock-opinion')
            response = api_client.get(url, {'symbol': 'AAPL'})
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['analysis']['recommendation'] == 'BUY'

    def test_opinion_missing_symbol(self, api_client):
        cache.clear()
        url = reverse('stock-opinion')
        response = api_client.get(url)
        assert response.status_code == 400
        assert 'symbol' in response.json()['error'].lower()

    def test_opinion_error_from_generator(self, api_client):
        cache.clear()
        with patch('stocks.opinion_generator.generate_stock_opinion', return_value={'error': 'Something went wrong', 'status': 'failed'}):
            url = reverse('stock-opinion')
            response = api_client.get(url, {'symbol': 'AAPL'})
            assert response.status_code == 400
            assert 'error' in response.json()

    def test_opinion_text_format(self, api_client):
        cache.clear()
        mock_opinion = {'symbol': 'AAPL', 'recommendation': 'BUY'}
        mock_formatted = {
            'success': True,
            'symbol': 'AAPL',
            'analysis': {'recommendation': 'BUY', 'confidence': 70, 'current_price': 150},
            'summary': 'Test summary',
        }
        with patch('stocks.opinion_generator.generate_stock_opinion', return_value=mock_opinion) as mock_gen, \
            patch('stocks.opinion_generator.format_investment_analysis', return_value=mock_formatted) as mock_format:
            # ✅ Use the same reverse as the passing test
            url = reverse('stock-opinion')
            response = api_client.get(url, {'symbol': 'AAPL', 'format': 'text'})
            assert response.status_code == 200
            assert 'analysis_text' in response.json()

    def test_opinion_exception_returns_500(self, api_client):
        cache.clear()
        with patch('stocks.opinion_generator.generate_stock_opinion', side_effect=Exception('Unexpected error')):
            url = reverse('stock-opinion')
            response = api_client.get(url, {'symbol': 'AAPL'})
            assert response.status_code == 500
            assert 'Internal server error' in response.json()['error']


# ============================================================================
# Test: PredictionHistoryView
# ============================================================================

class TestPredictionHistoryView:

    def test_history_success(self, api_client, sample_prediction):
        cache.clear()
        url = reverse('prediction-history')
        response = api_client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert 'count' in data
        assert 'results' in data
        assert len(data['results']) >= 1
        assert data['results'][0]['stock_symbol'] == 'AAPL'

    def test_history_filter_by_symbol(self, api_client, sample_prediction):
        cache.clear()
        Prediction.objects.create(
            date=timezone.now().date(),
            stock_symbol='MSFT',
            headline='MSFT prediction',
            sentiment_score=0.6,
            predicted_movement='up',
            confidence=0.8,
            source='lstm',
        )
        url = reverse('prediction-history')
        response = api_client.get(url, {'symbol': 'MSFT'})
        assert response.status_code == 200
        data = response.json()
        assert data['count'] == 1
        assert data['results'][0]['stock_symbol'] == 'MSFT'

    def test_history_pagination(self, api_client):
        cache.clear()
        for i in range(5):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i),
                stock_symbol='AAPL',
                headline=f'Prediction {i}',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.7,
                source='lstm',
            )
        url = reverse('prediction-history')
        response = api_client.get(url, {'limit': 2, 'offset': 2})
        assert response.status_code == 200
        data = response.json()
        assert data['count'] == 5
        assert len(data['results']) == 2
        assert data['next'] is not None
        assert data['previous'] is not None

    def test_history_cache_hit(self, api_client):
        cache.clear()
        url = reverse('prediction-history')
        response1 = api_client.get(url)
        assert response1.status_code == 200
        with patch('stocks.views.Prediction.objects.all') as mock_queryset:
            response2 = api_client.get(url)
            assert response2.status_code == 200
            mock_queryset.assert_not_called()

    def test_history_exception_returns_500(self, api_client):
        cache.clear()
        with patch('stocks.views.Prediction.objects.all', side_effect=Exception('DB error')):
            url = reverse('prediction-history')
            response = api_client.get(url)
            assert response.status_code == 500


# ============================================================================
# Test: StockAnalysisView
# ============================================================================

class TestStockAnalysisView:

    def test_analysis_success(self, api_client):
        cache.clear()
        with patch.object(AnonRateThrottle, 'allow_request', return_value=True), \
             patch.object(UserRateThrottle, 'allow_request', return_value=True):
            mock_opinion = {
                'symbol': 'AAPL',
                'recommendation': 'BUY',
                'confidence': 65.0,
                'price': 150.0,
                'technical_indicators': {'rsi': 55},
                'market_regime': {'regime': 'bull'},
            }
            mock_formatted = {
                'success': True,
                'symbol': 'AAPL',
                'analysis': {
                    'recommendation': 'BUY',
                    'confidence': 65.0,
                    'current_price': 150.0,
                    'investment_thesis': 'Test thesis',
                    'price_targets': {'bearish': 135, 'base': 150, 'bullish': 165},
                    'key_points': ['Point 1', 'Point 2'],
                },
                'summary': 'Test summary',
                'company': 'Apple Inc.',
            }
            mock_tech = {
                'current_price': 150.0,
                'sma_50': 145.0,
                'sma_200': 140.0,
                'rsi': 55.0,
                'support': 140.0,
                'resistance': 160.0,
                'volume': 1000000,
            }
            mock_lstm = {
                'success': True,
                'prediction': 'UP',
                'confidence': 75.0,
                'fallback': False,
                'message': 'LSTM prediction successful'
            }

            with patch('stocks.opinion_generator.generate_stock_opinion', return_value=mock_opinion) as mock_gen, \
                 patch('stocks.opinion_generator.format_investment_analysis', return_value=mock_formatted) as mock_format, \
                 patch('stocks.views.get_technical_indicators', return_value=mock_tech) as mock_tech_func, \
                 patch('stocks.views.get_sentiment_summary', return_value={'overall': 'Bullish', 'score': 0.6, 'recent_articles': 10}) as mock_sent, \
                 patch('stocks.lstm_predictor.get_lstm_predictor') as mock_lstm_func:
                mock_lstm_func.return_value.predict.return_value = mock_lstm
                url = reverse('stock-analysis')
                response = api_client.get(url, {'symbol': 'AAPL'})
                assert response.status_code == 200
                data = response.json()
                assert data['success'] is True
                assert data['data']['symbol'] == 'AAPL'
                assert data['data']['recommendation'] == 'BUY'
                assert 'lstm_prediction' in data['data']
                assert data['data']['lstm_prediction']['direction'] == 'UP'

    def test_analysis_missing_symbol(self, api_client):
        cache.clear()
        url = reverse('stock-analysis')
        response = api_client.get(url)
        assert response.status_code == 400

    def test_analysis_fallback_when_real_data_fails(self, api_client):
        cache.clear()
        with patch.object(AnonRateThrottle, 'allow_request', return_value=True), \
             patch.object(UserRateThrottle, 'allow_request', return_value=True):
            with patch('stocks.opinion_generator.generate_stock_opinion', side_effect=Exception('API error')):
                with patch('stocks.views.get_fallback_analysis', return_value={
                    'symbol': 'AAPL',
                    'recommendation': 'HOLD',
                    'confidence': 50,
                    'technicalIndicators': {'currentPrice': 100},
                    'priceTargets': {'bearish': 90, 'base': 100, 'bullish': 110},
                    'keyFactors': [{'title': 'Market Sentiment', 'description': 'Neutral', 'impact': 'neutral'}],
                    'riskAssessment': {'level': 'medium', 'horizon': 'medium-term'},
                    'company': 'Apple Inc.',
                    'sentiment': {'overall': 'Neutral', 'score': 0, 'recent_articles': 0},
                }) as mock_fallback:
                    with patch('stocks.views.get_fallback_technical', return_value={'technical': {'support': 95, 'resistance': 105}}) as mock_tech_fallback:
                        url = reverse('stock-analysis')
                        response = api_client.get(url, {'symbol': 'AAPL'})
                        assert response.status_code == 200
                        data = response.json()
                        assert data['success'] is True
                        assert data['data']['lstm_prediction']['direction'] == 'UNAVAILABLE'

    def test_analysis_cache_hit(self, api_client):
        cache.clear()
        url = reverse('stock-analysis')
        with patch.object(AnonRateThrottle, 'allow_request', return_value=True), \
             patch.object(UserRateThrottle, 'allow_request', return_value=True):
            with patch('stocks.opinion_generator.generate_stock_opinion', return_value={'symbol': 'AAPL', 'recommendation': 'BUY'}) as mock_gen:
                with patch('stocks.opinion_generator.format_investment_analysis', return_value={'success': True, 'symbol': 'AAPL', 'analysis': {'recommendation': 'BUY'}}) as mock_format:
                    with patch('stocks.views.get_technical_indicators', return_value={'current_price': 100}) as mock_tech:
                        with patch('stocks.views.get_sentiment_summary', return_value={'overall': 'Bullish', 'score': 0.5, 'recent_articles': 5}) as mock_sent:
                            with patch('stocks.lstm_predictor.get_lstm_predictor') as mock_lstm:
                                mock_lstm.return_value.predict.return_value = {'success': True, 'prediction': 'UP', 'confidence': 75}
                                response1 = api_client.get(url, {'symbol': 'AAPL'})
                                assert response1.status_code == 200
                                response2 = api_client.get(url, {'symbol': 'AAPL'})
                                assert response2.status_code == 200
                                assert mock_gen.call_count == 1


# ============================================================================
# Test: TechnicalIndicatorsView
# ============================================================================

class TestTechnicalIndicatorsView:

    def test_indicators_success(self, api_client):
        cache.clear()
        with patch.object(AnonRateThrottle, 'allow_request', return_value=True), \
            patch.object(UserRateThrottle, 'allow_request', return_value=True):
            mock_tech = {
                'current_price': 150.0,
                'sma_50': 145.0,
                'sma_200': 140.0,
                'rsi': 55.0,
                'support': 140.0,
                'resistance': 160.0,
                'volume': 1000000,
                'volatility': 0.2,
                'price_history': [140, 145, 150],
            }
            # ✅ Mock the internal function that get_technical_indicators calls
            with patch('stocks.views.cache.get', return_value=None) as mock_cache_get:
                with patch('stocks.views.calculate_technical_indicators', return_value=mock_tech) as mock_calc:
                    url = reverse('technical-indicators')
                    response = api_client.get(url, {'symbol': 'AAPL'})
                    assert response.status_code == 200
                    data = response.json()
                    assert data['success'] is True
                    tech = data['data']['technical']
                    assert tech['current_price'] == 150.0
                    assert tech['rsi'] == 55.0
                    mock_calc.assert_called_with('AAPL')
                    mock_cache_get.assert_called()

    def test_indicators_missing_symbol(self, api_client):
        cache.clear()
        url = reverse('technical-indicators')
        response = api_client.get(url)
        assert response.status_code == 400

    def test_indicators_fallback_when_yfinance_fails(self, api_client):
        cache.clear()
        with patch.object(AnonRateThrottle, 'allow_request', return_value=True), \
            patch.object(UserRateThrottle, 'allow_request', return_value=True):
            with patch('stocks.views.cache.get', return_value=None) as mock_cache_get:
                # ✅ Mock calculate_technical_indicators to return None (simulate failure)
                with patch('stocks.views.calculate_technical_indicators', return_value=None) as mock_calc:
                    with patch('stocks.views.get_fallback_technical', return_value={
                        'technical': {
                            'current_price': 100,
                            'sma_50': 98,
                            'sma_200': 95,
                            'rsi': 50,
                            'support': 95,
                            'resistance': 105,
                            'volume': 1000000,
                            'volatility': 0.2,
                            'price_history': [100],
                        }
                    }) as mock_fallback:
                        url = reverse('technical-indicators')
                        response = api_client.get(url, {'symbol': 'UNKNOWN'})
                        assert response.status_code == 200
                        data = response.json()
                        assert data['success'] is True
                        assert data['data']['technical']['current_price'] == 100
                        mock_calc.assert_called_with('UNKNOWN')
                        mock_fallback.assert_called_with('UNKNOWN')
                        mock_cache_get.assert_called()

    def test_indicators_cache_hit(self, api_client):
        cache.clear()
        cached_data = {'current_price': 100, 'sma_50': 98}
        with patch.object(AnonRateThrottle, 'allow_request', return_value=True), \
             patch.object(UserRateThrottle, 'allow_request', return_value=True):
            with patch('stocks.views.cache.get', return_value=cached_data) as mock_cache_get:
                with patch('stocks.views.get_technical_indicators') as mock_get_tech:
                    url = reverse('technical-indicators')
                    response = api_client.get(url, {'symbol': 'UNKNOWN'})
                    assert response.status_code == 200
                    mock_cache_get.assert_called()
                    mock_get_tech.assert_not_called()


# ============================================================================
# Test: SymbolsListView
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
# Test: SubscribeView
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
# Test: LSTMPredictionView
# ============================================================================

class TestLSTMPredictionView:

    def test_lstm_success(self, api_client):
        cache.clear()
        mock_result = {
            'success': True,
            'prediction': 'UP',
            'confidence': 75.0,
            'sentiment_score': 0.3,
            'current_price': 150.0,
        }
        with patch('stocks.views.get_lstm_predictor') as mock_lstm:
            mock_lstm.return_value.predict.return_value = mock_result
            with patch('stocks.views.save_prediction') as mock_save:
                url = reverse('lstm-predict')
                response = api_client.get(url, {'symbol': 'AAPL'})
                assert response.status_code == 200
                data = response.json()
                assert data['success'] is True
                assert data['data']['prediction'] == 'UP'
                assert data['data']['confidence'] == 75.0
                mock_save.assert_called_once()

    def test_lstm_missing_symbol(self, api_client):
        cache.clear()
        url = reverse('lstm-predict')
        response = api_client.get(url)
        assert response.status_code == 400

    def test_lstm_prediction_fails(self, api_client):
        cache.clear()
        mock_result = {
            'success': False,
            'error': 'Model not loaded',
        }
        with patch('stocks.views.get_lstm_predictor') as mock_lstm:
            mock_lstm.return_value.predict.return_value = mock_result
            url = reverse('lstm-predict')
            response = api_client.get(url, {'symbol': 'AAPL'})
            assert response.status_code == 400
            assert 'Model not loaded' in response.json()['error']

    def test_lstm_with_user_saves_prediction(self, auth_client, authenticated_user):
        cache.clear()
        mock_result = {
            'success': True,
            'prediction': 'UP',
            'confidence': 75.0,
            'sentiment_score': 0.3,
            'current_price': 150.0,
        }
        with patch('stocks.views.get_lstm_predictor') as mock_lstm:
            mock_lstm.return_value.predict.return_value = mock_result
            with patch('stocks.views.save_prediction') as mock_save:
                url = reverse('lstm-predict')
                response = auth_client.get(url, {'symbol': 'AAPL'})
                assert response.status_code == 200
                mock_save.assert_called_with(
                    symbol='AAPL',
                    movement='UP',
                    confidence=0.75,
                    sentiment_score=0.3,
                    headline='',
                    source='lstm',
                    user=authenticated_user,
                    price_at_prediction=150.0,
                )

    def test_lstm_cache_hit(self, api_client):
        cache.clear()
        url = reverse('lstm-predict')
        with patch('stocks.views.get_lstm_predictor') as mock_lstm:
            mock_lstm.return_value.predict.return_value = {'success': True, 'prediction': 'UP', 'confidence': 75}
            response1 = api_client.get(url, {'symbol': 'AAPL'})
            assert response1.status_code == 200
            response2 = api_client.get(url, {'symbol': 'AAPL'})
            assert response2.status_code == 200
            assert mock_lstm.call_count == 1


# ============================================================================
# Test: SentimentAnalysisView
# ============================================================================

class TestSentimentAnalysisView:

    def test_sentiment_success(self, api_client):
        cache.clear()
        mock_sentiment = {
            'overall': 'Bullish',
            'score': 0.6,
            'recent_articles': 10,
            'source_stats': {'tier1_count': 2, 'reliability_sum': 150, 'tier1_sources': ['Reuters']},
            'history': [{'date': '2026-01-01', 'score': 0.5}],
        }
        with patch('stocks.views.get_sentiment_summary', return_value=mock_sentiment) as mock_sent:
            url = reverse('sentiment-analysis')
            response = api_client.get(url, {'symbol': 'AAPL'})
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['data']['sentiment']['label'] == 'Bullish'
            assert data['data']['sentiment']['score'] == 0.6

    def test_sentiment_missing_symbol(self, api_client):
        cache.clear()
        url = reverse('sentiment-analysis')
        response = api_client.get(url)
        assert response.status_code == 400

    def test_sentiment_exception_fallback(self, api_client):
        cache.clear()
        with patch('stocks.views.get_sentiment_summary', side_effect=Exception('DB error')):
            url = reverse('sentiment-analysis')
            response = api_client.get(url, {'symbol': 'AAPL'})
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['data']['sentiment']['label'] == 'Neutral'
            assert data['data']['sentiment']['score'] == 0.0

    def test_sentiment_cache_hit(self, api_client):
        cache.clear()
        cached_response = {
            'sentiment': {'score': 0.5, 'label': 'Bullish'},
            'news_count': 5,
            'source_stats': {},
            'history': []
        }
        with patch.object(AnonRateThrottle, 'allow_request', return_value=True), \
             patch.object(UserRateThrottle, 'allow_request', return_value=True):
            with patch('stocks.views.cache.get', return_value=cached_response) as mock_cache_get:
                with patch('stocks.views.get_sentiment_summary') as mock_sent:
                    url = reverse('sentiment-analysis')
                    response = api_client.get(url, {'symbol': 'AAPL'})
                    assert response.status_code == 200
                    mock_cache_get.assert_called()
                    mock_sent.assert_not_called()


# ============================================================================
# Test: PredictionListView
# ============================================================================

class TestPredictionListView:

    def test_list_success(self, api_client, sample_prediction):
        cache.clear()
        url = reverse('predictions')
        response = api_client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert 'total' in data
        assert 'results' in data
        assert len(data['results']) >= 1

    def test_list_filter_by_symbol(self, api_client, sample_prediction):
        cache.clear()
        Prediction.objects.create(
            date=timezone.now().date(),
            stock_symbol='MSFT',
            headline='MSFT prediction',
            sentiment_score=0.6,
            predicted_movement='up',
            confidence=0.8,
            source='lstm',
        )
        url = reverse('predictions')
        response = api_client.get(url, {'symbol': 'MSFT'})
        assert response.status_code == 200
        data = response.json()
        assert data['total'] == 1
        assert data['results'][0]['stock_symbol'] == 'MSFT'

    def test_list_filter_by_outcome(self, api_client, sample_prediction):
        cache.clear()
        correct = Prediction.objects.create(
            date=timezone.now().date(),
            stock_symbol='AAPL',
            headline='Correct prediction',
            sentiment_score=0.5,
            predicted_movement='up',
            confidence=0.8,
            source='lstm',
            is_correct=True,
        )
        Prediction.objects.create(
            date=timezone.now().date(),
            stock_symbol='AAPL',
            headline='Incorrect prediction',
            sentiment_score=0.5,
            predicted_movement='up',
            confidence=0.8,
            source='lstm',
            is_correct=False,
        )
        url = reverse('predictions')
        response = api_client.get(url, {'outcome': 'correct'})
        assert response.status_code == 200
        data = response.json()
        assert data['total'] == 1
        assert data['results'][0]['id'] == correct.id

    def test_list_pagination(self, api_client):
        cache.clear()
        for i in range(5):
            Prediction.objects.create(
                date=timezone.now().date() - timedelta(days=i),
                stock_symbol='AAPL',
                headline=f'Prediction {i}',
                sentiment_score=0.5,
                predicted_movement='up',
                confidence=0.7,
                source='lstm',
            )
        url = reverse('predictions')
        response = api_client.get(url, {'limit': 2, 'offset': 2})
        assert response.status_code == 200
        data = response.json()
        assert data['total'] == 5
        assert len(data['results']) == 2


# ============================================================================
# Test: PerformanceSummaryView
# ============================================================================

class TestPerformanceSummaryView:

    def test_performance_success(self, api_client):
        cache.clear()
        Prediction.objects.create(
            date=timezone.now().date() - timedelta(days=5),
            stock_symbol='AAPL',
            headline='Test',
            sentiment_score=0.5,
            predicted_movement='up',
            confidence=0.8,
            source='lstm',
            is_correct=True,
            resolution_date=timezone.now(),
            actual_direction='up',
        )
        Prediction.objects.create(
            date=timezone.now().date() - timedelta(days=5),
            stock_symbol='AAPL',
            headline='Test2',
            sentiment_score=0.5,
            predicted_movement='down',
            confidence=0.7,
            source='lstm',
            is_correct=False,
            resolution_date=timezone.now(),
            actual_direction='up',
        )
        with patch('stocks.views.calculate_performance_metrics', return_value={
            'accuracy': 50.0,
            'precision': 50.0,
            'recall': 50.0,
            'f1': 50.0,
            'balanced_accuracy': 50.0,
            'confusion_matrix': {'TP': 1, 'FP': 0, 'TN': 0, 'FN': 1},
        }) as mock_metrics:
            url = reverse('performance')
            response = api_client.get(url)
            assert response.status_code == 200
            data = response.json()
            assert 'total_predictions' in data
            assert 'overall' in data
            assert data['overall']['accuracy'] == 50.0

    def test_performance_filter_by_symbol(self, api_client):
        cache.clear()
        Prediction.objects.create(
            date=timezone.now().date() - timedelta(days=5),
            stock_symbol='AAPL',
            headline='AAPL pred',
            sentiment_score=0.5,
            predicted_movement='up',
            confidence=0.8,
            source='lstm',
            is_correct=True,
            resolution_date=timezone.now(),
            actual_direction='up',
        )
        Prediction.objects.create(
            date=timezone.now().date() - timedelta(days=5),
            stock_symbol='MSFT',
            headline='MSFT pred',
            sentiment_score=0.5,
            predicted_movement='up',
            confidence=0.8,
            source='lstm',
            is_correct=False,
            resolution_date=timezone.now(),
            actual_direction='down',
        )
        url = reverse('performance')
        response = api_client.get(url, {'symbol': 'MSFT'})
        assert response.status_code == 200
        data = response.json()
        assert data['total_predictions'] == 1
        assert 'MSFT' in data['by_symbol']


# ============================================================================
# Test: DriftDetectionView
# ============================================================================

class TestDriftDetectionView:

    def test_drift_success(self, api_client):
        cache.clear()
        mock_drift = {
            'drift_detected': False,
            'severity': 'none',
            'recent_f1': 70.0,
            'baseline_f1': 75.0,
            'drop_percent': 6.7,
            'recent_metrics': {'accuracy': 70.0, 'f1': 70.0},
            'baseline_metrics': {'accuracy': 75.0, 'f1': 75.0},
        }
        with patch('stocks.views.detect_drift', return_value=mock_drift) as mock_detect:
            url = reverse('drift')
            response = api_client.get(url)
            assert response.status_code == 200
            data = response.json()
            assert data['drift_detected'] is False
            assert data['severity'] == 'none'


# ============================================================================
# Test: SHAPExplanationView
# ============================================================================

class TestSHAPExplanationView:

    def test_shap_success(self, api_client, sample_prediction):
        cache.clear()
        url = reverse('shap', args=[sample_prediction.id])
        response = api_client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == sample_prediction.id
        assert data['stock_symbol'] == 'AAPL'
        assert 'shap_values' in data

    def test_shap_not_found(self, api_client):
        cache.clear()
        url = reverse('shap', args=[99999])
        response = api_client.get(url)
        assert response.status_code == 404
        assert 'Prediction not found' in response.json()['error']


# ============================================================================
# Test: cron_resolve_predictions
# ============================================================================

class TestCronResolvePredictions:

    def test_cron_success(self, api_client):
        cache.clear()
        with patch('stocks.views.os.environ.get', return_value='test-secret') as mock_env:
            url = reverse('cron_resolve')
            with patch('stocks.views.call_command') as mock_call:
                response = api_client.get(url, {'secret': 'test-secret'})
                assert response.status_code == 200
                assert response.json()['status'] == 'ok'
                mock_call.assert_called_with('resolve_predictions', days=7)

    def test_cron_missing_secret(self, api_client):
        cache.clear()
        with patch('stocks.views.os.environ.get', return_value=None):
            url = reverse('cron_resolve')
            response = api_client.get(url, {'secret': 'test-secret'})
            assert response.status_code == 500
            assert 'Cron endpoint not configured' in response.json()['error']

    def test_cron_invalid_secret(self, api_client):
        cache.clear()
        with patch('stocks.views.os.environ.get', return_value='real-secret'):
            url = reverse('cron_resolve')
            response = api_client.get(url, {'secret': 'wrong'})
            assert response.status_code == 403
            assert 'Unauthorized' in response.json()['error']

    def test_cron_command_exception(self, api_client):
        cache.clear()
        with patch('stocks.views.os.environ.get', return_value='test-secret'):
            url = reverse('cron_resolve')
            with patch('stocks.views.call_command', side_effect=Exception('Command failed')):
                response = api_client.get(url, {'secret': 'test-secret'})
                assert response.status_code == 500
                assert 'Command failed' in response.json()['error']