from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    #path('news/', include('news.urls')),
    #path('stocks/', include('stocks.urls')),
    path('api/news/', include('news.urls')),  
    path('api/stocks/', include('stocks.urls')),
]
