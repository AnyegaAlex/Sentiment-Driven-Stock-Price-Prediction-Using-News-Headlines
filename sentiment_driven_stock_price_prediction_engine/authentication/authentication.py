"""
DRF Authentication classes for Tickflow Sentiment.
Supports both JWT (primary) and API Key (fallback).
"""

from rest_framework import authentication
from rest_framework import exceptions
from django.contrib.auth import get_user_model
from .models import APIKey
from django.utils import timezone
User = get_user_model()


class APIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authenticate requests using an API key sent in the `X-API-Key` header.
    Checks both the `User.api_key` field and the standalone `APIKey` model.
    """

    def authenticate(self, request):
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return None  # No API key provided; let other auth methods handle it

        # 1. Try to find a user with this API key
        try:
            user = User.objects.get(api_key=api_key)
            return (user, None)
        except User.DoesNotExist:
            pass

        # 2. Check the standalone APIKey model
        try:
            key_obj = APIKey.objects.get(key=api_key, is_active=True)
            if key_obj.expires_at and key_obj.expires_at < timezone.now():
                raise exceptions.AuthenticationFailed('API key expired')
            # We don't have a user associated with this key; return a dummy user?
            # For now, we'll create a pseudo-user or return None.
            # Since we don't have a user, we can return a special user or None.
            # We'll return a dummy user with limited permissions.
            # Alternatively, we could create a user on the fly, but that's not ideal.
            # For now, return a user object with the key name.
            # We'll use a custom user class or just return a simple object.
            # Simpler: return a user that is not persisted.
            # Let's create a temporary user with username 'apikey_' + key.
            # But we don't want to create a real user.
            # We'll return a custom user-like object.
            dummy_user = type('DummyUser', (), {
                'is_authenticated': True,
                'pk': None,
                'username': f'apikey_{key_obj.name}',
                'api_key': api_key,
            })()
            return (dummy_user, None)
        except APIKey.DoesNotExist:
            raise exceptions.AuthenticationFailed('Invalid API key')