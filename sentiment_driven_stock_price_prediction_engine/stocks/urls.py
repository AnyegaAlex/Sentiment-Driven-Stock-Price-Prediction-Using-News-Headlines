from django.urls import path
from .views import StockListView

urlpatterns = [
    path('', StockListView.as_view(), name='stock-list'),
]
