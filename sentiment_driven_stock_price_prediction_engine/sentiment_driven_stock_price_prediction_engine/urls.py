from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/news/', include('news.urls')),
     path('api/', include('stocks.urls')),
]
