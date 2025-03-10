from django.contrib import admin
from django.urls import path
from .views import StockOpinionView

urlpatterns = [
    path('stock-opinion/', StockOpinionView.as_view(), name='stock-opinion'),
]
