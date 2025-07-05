from django.contrib import admin
from django.urls import path
from .views import StockOpinionView, PredictionHistoryView

urlpatterns = [
    path('stock-opinion/', StockOpinionView.as_view(), name='stock-opinion'),
    path('prediction-history/', PredictionHistoryView.as_view(), name='prediction-history'),
]
