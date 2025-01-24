from django.urls import path
from .views import StockListView

urlpatterns = [
    path('<str:symbol>/', StockListView.as_view(), name='stock-data'), 
]
