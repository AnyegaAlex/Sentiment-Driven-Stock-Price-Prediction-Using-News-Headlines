from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse 
from django.core.cache import cache

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
    path('admin/', admin.site.urls),
    path('api/news/', include('news.urls')),
    path('api/', include('stocks.urls')),
    path('health/', health_check), 
]
