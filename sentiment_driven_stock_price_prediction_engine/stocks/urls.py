from django.urls import path
from .views import (
    StockOpinionView,
    PredictionHistoryView,
    StockAnalysisView,
    TechnicalIndicatorsView,
    SymbolsListView,
    SubscribeView,
)

urlpatterns = [
    # Existing endpoints
    path('stock-opinion/', StockOpinionView.as_view(), name='stock-opinion'),
    path('prediction-history/', PredictionHistoryView.as_view(), name='prediction-history'),
    
    # New endpoints for frontend
    path('stock-analysis/', StockAnalysisView.as_view(), name='stock-analysis'),
    path('technical-indicators/', TechnicalIndicatorsView.as_view(), name='technical-indicators'),
    path('stocks/symbols/', SymbolsListView.as_view(), name='symbols-list'),
    path('subscribe/', SubscribeView.as_view(), name='subscribe'),
]