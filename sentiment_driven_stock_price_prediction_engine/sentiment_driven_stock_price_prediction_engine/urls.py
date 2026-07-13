from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.core.cache import cache
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def home(request):
    return JsonResponse({
        "name": "Sentiment Driven Stock Prediction API",
        "status": "ok",
        "version": "v1",
        "docs": "/api/docs/",
        "endpoints": {
            "stock_analysis": "/api/v1/stock-analysis/?symbol=AAPL",
            "technical_indicators": "/api/v1/technical-indicators/?symbol=AAPL",
            "news": "/api/v1/news/get-news/?symbol=AAPL",
            "prediction_history": "/api/v1/prediction-history/?symbol=AAPL",
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
    # Root & health
    path('', home),
    path('health/', health_check),
    path('admin/', admin.site.urls),
    
    # Version 1 APIs - Main endpoints
    path('api/v1/', include('stocks.urls')),
    path('api/v1/news/', include('news.urls')),
    
    # Swagger / OpenAPI documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]