from django.urls import path,include
from .views import health, ping

urlpatterns = [
    path("health/", health, name="health"),
    path("v1/ping/", ping, name="ping"),
    path("auth/", include("core.auth.urls")),
]
