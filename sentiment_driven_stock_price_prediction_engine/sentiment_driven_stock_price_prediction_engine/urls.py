from django.contrib import admin
from django.urls import path, include
from stocks.views import StockPredictionView  # Import your view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('predict/', StockPredictionView.as_view(), name='stock-prediction'),
    path('api/news/', include('news.urls')),
]
