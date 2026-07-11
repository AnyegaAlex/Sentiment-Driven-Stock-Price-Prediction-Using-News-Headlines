from django.urls import path
from .views import get_news, symbol_search, get_analyzed_news

urlpatterns = [
    path('get-news/', get_news, name='get-news'),
    path('symbol-search/', symbol_search, name='symbol-search'),
    path('analyzed/', get_analyzed_news, name='analyzed-news'),
]
