# data_ingestion/urls.py
from django.urls import path
from .views import stock_analysis_view

urlpatterns = [
    path('stock-analysis/', stock_analysis_view, name='stock_analysis'),
]
