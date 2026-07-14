from django.urls import path
from .views import (
    StockOpinionView,
    PredictionHistoryView,
    StockAnalysisView,
    TechnicalIndicatorsView,
    SymbolsListView,
    SubscribeView,
    LSTMPredictionView,
    SentimentAnalysisView,
    generate_key_view,  
)

urlpatterns = [
    # Existing endpoints
    path('stock-opinion/', StockOpinionView.as_view(), name='stock-opinion'),
    path('prediction-history/', PredictionHistoryView.as_view(), name='prediction-history'),
    
    # New endpoints for frontend
    path('stock-analysis/', StockAnalysisView.as_view(), name='stock-analysis'),
    path('technical-indicators/', TechnicalIndicatorsView.as_view(), name='technical-indicators'),
    
    # Fix: Add both /symbols/ and /stocks/symbols/ for compatibility
    path('symbols/', SymbolsListView.as_view(), name='symbols'),  # <-- ADD THIS
    path('stocks/symbols/', SymbolsListView.as_view(), name='symbols-list'),  # Legacy
    
    path('subscribe/', SubscribeView.as_view(), name='subscribe'),
    
    # LSTM Prediction endpoint
    path('lstm-predict/', LSTMPredictionView.as_view(), name='lstm-predict'),

    # Sentiment Analysis endpoint
    path('sentiment-analysis/', SentimentAnalysisView.as_view(), name='sentiment-analysis'),

    # Temporary key generation (remove after use)
    path('generate-key/', generate_key_view, name='generate-key'),
]