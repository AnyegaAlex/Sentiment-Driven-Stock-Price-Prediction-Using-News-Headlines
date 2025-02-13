from django.urls import path
from .views import (
    get_analyzed_news,
    get_news,
    symbol_search
)

urlpatterns = [
    # Endpoint for analyzed news with sentiment analysis
    path('analyzed/', get_analyzed_news, name='analyzed-news'),
    
    # Endpoint for processed news (with async refresh support)
    path('get-news/', get_news, name='get-news'),
    
    # Endpoint for symbol search
    path('symbol-search/', symbol_search, name='symbol-search'),
]