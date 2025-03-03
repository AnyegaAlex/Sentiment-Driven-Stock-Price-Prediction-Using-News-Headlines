from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse  # Import JsonResponse for JSON responses
from .models import StockSymbol  # Import your model
from .views import (
    get_analyzed_news,
    get_news,
    symbol_search
)


def symbol_search(request, symbol):  # Define symbol_search with symbol parameter
    results = StockSymbol.objects.filter(symbol__iexact=symbol)
    return JsonResponse({'results': list(results.values())})


urlpatterns = [
    # Endpoint for analyzed news with sentiment analysis
    path('analyzed/', get_analyzed_news, name='analyzed-news'),
    
    # Endpoint for processed news (with async refresh support)
    path('get-news/', get_news, name='get-news'),
    
    # Endpoint for symbol search
    path('symbol-search/<str:symbol>/', symbol_search, name='symbol-search'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

