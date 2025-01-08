from django.urls import path
from . import views

urlpatterns = [
    path('frontend/', views.home, name='frontend'), 
]