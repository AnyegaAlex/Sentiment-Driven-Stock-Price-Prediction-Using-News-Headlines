# authentication/urls.py
"""
URL configuration for the authentication app.

All endpoints are prefixed with the app's root URL (e.g., /api/v1/auth/).
This file defines routes for:
- Registration, login, and token refresh
- Email verification (link + code)
- Password reset (request & confirm)
- User profile (retrieve & update)
- Change password, email, username
- User preferences and watchlist management
- API key generation (legacy) and new API key management (Phase 2)
- Usage & stats (Phase 2)
- Account deletion (request & cancel)

All endpoints use JWT authentication where required.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    # Authentication
    RegisterView,
    LoginView,
    VerifyEmailView,
    ResendVerificationView,
    PasswordResetRequestView,
    PasswordResetConfirmView,

    # Profile & Account Management
    ProfileView,
    UpdateProfileView,
    ChangePasswordView,
    ChangeEmailView,
    ChangeUsernameView,
    GenerateAPIKeyView,

    # Preferences & Watchlist
    UserPreferencesView,
    UserWatchlistView,

    # Account Deletion
    DeleteAccountView,
    CancelDeletionView,

    # API Key Management (Phase 2)
    APIKeyListView,
    APIKeyRevokeView,

    # Usage & Stats (Phase 2)
    UsageStatsView,
    TopSymbolsView,
    ActivityLogView,
)

urlpatterns = [
    # ========================================================================
    # AUTHENTICATION
    # ========================================================================
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),

    # Password Reset
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='reset-password-confirm'),

    # ========================================================================
    # PROFILE & ACCOUNT MANAGEMENT
    # ========================================================================
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('profile/change-email/', ChangeEmailView.as_view(), name='change-email'),
    path('profile/change-username/', ChangeUsernameView.as_view(), name='change-username'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password-simple'),

    # Legacy API Key (auto‑generated per user)
    path('api-key/generate/', GenerateAPIKeyView.as_view(), name='generate-api-key'),

    # ========================================================================
    # API KEY MANAGEMENT (Phase 2 – multi‑key support)
    # ========================================================================
    path('api-keys/', APIKeyListView.as_view(), name='api-keys'),
    path('api-keys/<int:pk>/', APIKeyRevokeView.as_view(), name='api-key-revoke'),

    # ========================================================================
    # USAGE & STATS (Phase 2)
    # ========================================================================
    path('usage/', UsageStatsView.as_view(), name='usage-stats'),
    path('top-symbols/', TopSymbolsView.as_view(), name='top-symbols'),
    path('activity/', ActivityLogView.as_view(), name='activity-log'),

    # ========================================================================
    # PREFERENCES & WATCHLIST
    # ========================================================================
    path('preferences/', UserPreferencesView.as_view(), name='user-preferences'),
    path('watchlist/', UserWatchlistView.as_view(), name='user-watchlist'),
    path('watchlist/<str:symbol>/', UserWatchlistView.as_view(), name='user-watchlist-item'),

    # ========================================================================
    # ACCOUNT DELETION
    # ========================================================================
    path('delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('delete-account/cancel/', CancelDeletionView.as_view(), name='cancel-deletion'),
]