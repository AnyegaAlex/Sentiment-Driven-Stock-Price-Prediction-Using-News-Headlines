from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.core.cache import cache


def home(request):
    return JsonResponse({
        "name": "Sentiment Driven Stock Prediction API",
        "status": "ok",
        "routes": {
            "health": "/health/",
            "news_analyzed": "/api/news/analyzed/?symbol=AAPL",
            "news_get": "/api/news/get-news/?symbol=AAPL",
            "stock_opinion": "/api/stock-opinion/?symbol=AAPL",
            "prediction_history": "/api/prediction-history/?symbol=AAPL",
        }
    })


def health_check(request):
    try:
        cache.set("health_test", "success", timeout=5)
        return JsonResponse({
            "status": "ok",
            "redis": cache.get("health_test") == "success"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "detail": str(e)}, status=500)


urlpatterns = [
    path('', home), 
    path('admin/', admin.site.urls),
    path('api/news/', include('news.urls')),
    path('api/', include('stocks.urls')),
    path('health/', health_check),
]