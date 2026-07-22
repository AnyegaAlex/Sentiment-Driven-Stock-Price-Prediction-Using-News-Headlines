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
    PredictionListView,
    PerformanceSummaryView,
    DriftDetectionView,
    SHAPExplanationView,
)
from . import views
urlpatterns = [
    # Legacy stock opinion
    path('stock-opinion/', StockOpinionView.as_view(), name='stock-opinion'),
    
    # Prediction history (existing)
    path('prediction-history/', PredictionHistoryView.as_view(), name='prediction-history'),
    
    # Unified stock analysis
    path('stock-analysis/', StockAnalysisView.as_view(), name='stock-analysis'),
    
    # Technical indicators
    path('technical-indicators/', TechnicalIndicatorsView.as_view(), name='technical-indicators'),
    
    # Symbols (both endpoints for compatibility)
    path('symbols/', SymbolsListView.as_view(), name='symbols'),
    path('stocks/symbols/', SymbolsListView.as_view(), name='symbols-list'),
    
    # Subscription
    path('subscribe/', SubscribeView.as_view(), name='subscribe'),
    
    # LSTM Prediction
    path('lstm-predict/', LSTMPredictionView.as_view(), name='lstm-predict'),
    
    # Sentiment Analysis
    path('sentiment-analysis/', SentimentAnalysisView.as_view(), name='sentiment-analysis'),


    # ============================================================
    # – PREDICTION HISTORY SYSTEM
    # ============================================================
    
    # List predictions with filters (symbol, date, outcome)
    path('predictions/', PredictionListView.as_view(), name='predictions'),
    
    # Performance metrics summary (accuracy, F1, precision, recall)
    path('performance/', PerformanceSummaryView.as_view(), name='performance'),
    
    # Model drift detection
    path('drift/', DriftDetectionView.as_view(), name='drift'),
    
    # SHAP explanation for a specific prediction
    path('shap/<int:prediction_id>/', SHAPExplanationView.as_view(), name='shap'),

    path('cron/resolve-predictions/', views.cron_resolve_predictions, name='cron_resolve'),
]