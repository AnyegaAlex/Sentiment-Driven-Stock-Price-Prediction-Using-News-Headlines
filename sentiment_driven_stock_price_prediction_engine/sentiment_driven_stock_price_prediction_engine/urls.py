"""
URL configuration for sentiment_driven_stock_price_prediction_engine.

This module defines all URL routes for the application, including:
- Health checks and root API metadata.
- Authentication endpoints (`/api/v1/auth/`).
- Core stock, news, and prediction endpoints (`/api/v1/`).
- API documentation (Swagger UI and OpenAPI schema).
- Legacy `/stocks/` routes (kept for backward compatibility – see note below).

Author: Tickflow Capital
Version: 1.0.0
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


# ============================================================================
# Root View
# ============================================================================

def home(request):
    """
    Root endpoint providing API metadata and discovery links.

    Returns a JSON response with the API name, status, version, and key
    endpoint examples. Serves as a lightweight public entry point for
    clients and developers.

    Args:
        request (HttpRequest): The incoming HTTP request.

    Returns:
        JsonResponse: API metadata with status `200 OK`.
    """
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


# ============================================================================
# URL Patterns
# ============================================================================

urlpatterns = [
    # Root & health
    path('', home, name='api-root'),
    path('api/v1/health/', include('health.urls')),
    path('admin/', admin.site.urls),

    # Version 1 APIs - Main endpoints
    path('api/v1/auth/', include('authentication.urls')),
    path('api/v1/', include('stocks.urls')),
    path('api/v1/news/', include('news.urls')),

    # Swagger / OpenAPI documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # --------------------------------------------------------------------------
    # LEGACY ROUTE (kept for backward compatibility)
    # --------------------------------------------------------------------------
    # WARNING: This duplicates the '/api/v1/' stock routes.
    # Clients should migrate to '/api/v1/stock-analysis/' or '/api/v1/technicals/'.
    # If your frontend/third-party integrations rely on '/stocks/', keep this.
    # To deprecate: add a redirect or remove in a future major version (v2).
    path('stocks/', include('stocks.urls')),
]