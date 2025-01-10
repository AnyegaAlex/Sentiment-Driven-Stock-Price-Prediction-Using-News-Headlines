from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('analysis.urls')),
    path('', include('data_ingestion.urls')),
    path('', include('frontend.urls')),

    path('data/', include('data_ingestion.urls')),

]
