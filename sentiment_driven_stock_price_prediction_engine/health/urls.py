from django.urls import path
from .views import HealthCheckView, LivenessView, ReadinessView

urlpatterns = [
    path('', HealthCheckView.as_view(), name='health'),
    path('live/', LivenessView.as_view(), name='liveness'),
    path('readiness/', ReadinessView.as_view(), name='readiness'),
]
