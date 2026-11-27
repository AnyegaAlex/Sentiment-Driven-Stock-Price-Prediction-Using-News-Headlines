"""Regression coverage for middleware API-key hash field lookups."""

import pytest
from django.http import HttpResponse
from rest_framework.test import APIRequestFactory

from authentication import middleware as middleware_module
from authentication.models import UserAPIKey


@pytest.mark.django_db
def test_api_key_middleware_looks_up_the_key_hash_field(user, monkeypatch):
    """A generated raw key must resolve through UserAPIKey.key_hash.

    This protects the middleware's ORM lookup from regressing to the obsolete
    ``hashed_key`` field name, which does not exist on the current model.
    """
    key_obj, raw_key = UserAPIKey.create_key(user, "Middleware regression test")
    request = APIRequestFactory().get(
        "/api/v1/stock-analysis/",
        HTTP_X_API_KEY=raw_key,
    )

    middleware = middleware_module.APIKeyMiddleware(
        lambda _request: HttpResponse("ok", status=200)
    )
    monkeypatch.setattr(middleware.jwt_auth, "authenticate", lambda _request: None)

    response = middleware(request)

    assert response.status_code == 200
    assert request.api_key_obj.pk == key_obj.pk
    assert request.user.pk == user.pk
