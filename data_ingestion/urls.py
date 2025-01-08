from django.urls import path
from . import views

urlpatterns = [
    path('data_ingestion/', views.home, name='data_ingestion'),  
]