# authentication/views.py
"""
Authentication and account management views for Tickflow Sentiment.

This module provides REST API endpoints for:
- Registration, login, email verification (link + 6‑digit code)
- Password reset (request + confirm)
- Profile management (get, update)
- Password change, email change (with verification), username change (yearly limit)
- API key generation
- Account deletion (30‑day grace period, cancellable)

All endpoints include thorough validation, error handling, logging,
and security alerts where appropriate.
"""

import logging
import os
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import IntegrityError
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status, generics, permissions, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from .models import User, AuditLog, UserPreferences, UserAPIKey

from .models import User, AuditLog, UserPreferences
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    UpdateProfileSerializer,
    EmailVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    ChangeEmailSerializer,
    ChangeUsernameSerializer,
    EmailVerificationCodeSerializer,
    DeleteAccountSerializer,
    VerifyEmailCodeSerializer,
    UserPreferencesSerializer,
    UserAPIKeySerializer, 
)
from .utils import (
    send_verification_email,
    send_password_reset_email,
    verify_email_token,
    verify_email_code,
    send_welcome_email,
    send_email_change_notification,
    send_security_alert_email,
    send_account_deletion_confirmation,
    generate_verification_code,
    verify_password_reset_token,
    send_email_change_code,
)

logger = logging.getLogger(__name__)


# ============================================================================
# AUTHENTICATION VIEWS
# ============================================================================

class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.

    Creates a new user account and sends a verification email containing
    both a clickable link and a 6‑digit code. The user must verify their
    email before they can log in.

    Accepts:
        - username (str, required)
        - email (str, required)
        - password (str, required)

    Returns:
        201 Created: User created and verification email sent.
        400 Bad Request: Validation errors (e.g., duplicate email/username).
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        send_verification_email(user, self.request)
        logger.info(f"New user registered: {user.email}")
        return user


class LoginView(APIView):
    """
    User login endpoint.

    Authenticates using username or email and returns JWT access/refresh tokens.
    Requires email verification before login. Sends a security alert email
    on successful login.

    Accepts:
        - username (str) or email (str) – the field is named 'username' in the
          serializer but can contain either.
        - password (str)

    Returns:
        200 OK: Access and refresh tokens, plus user profile.
        401 Unauthorized: Invalid credentials.
        403 Forbidden: Email not verified.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )

        if not user:
            logger.warning(f"Failed login attempt for {serializer.validated_data['username']}")
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.email_verified:
            return Response(
                {'error': 'Please verify your email before logging in'},
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)

        send_security_alert_email(
            user,
            'login',
            request.META.get('REMOTE_ADDR', 'Unknown'),
            request.META.get('HTTP_USER_AGENT', 'Unknown')
        )

        logger.info(f"User logged in: {user.email}")

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(user).data,
        })


class VerifyEmailView(APIView):
    """
    Email verification endpoint.

    Supports two methods:
        - GET: Verify via token from the email link.
        - POST: Verify via 6‑digit code (user must be authenticated).

    The GET method activates the user account, sends a welcome email,
    and returns JWT tokens for auto‑login.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Verify email using the token from the verification link."""
        token = request.GET.get('token')
        uid = request.GET.get('uid')
        if not token or not uid:
            return Response(
                {'error': 'Missing token or uid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = verify_email_token(uid, token)
        if not user:
            return Response(
                {'error': 'Invalid verification link'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Activate user
        user.email_verified = True
        user.save()

        # Send welcome email
        send_welcome_email(user, request)

        # ✅ Generate JWT tokens for auto‑login
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        logger.info(f"Email verified successfully for {user.email}")

        return Response({
            'message': 'Email verified successfully',
            'redirect': '/onboarding',  # frontend will navigate here
            'user': UserProfileSerializer(user).data,
            'access': access_token,
            'refresh': refresh_token,
        })
    


    def post(self, request):
        """Verify email using a 6‑digit code (user must be logged in)."""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        code = request.data.get('code')
        if not code:
            return Response(
                {'error': 'Verification code required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        if verify_email_code(user, code):
            user.email_verified = True
            user.save()
            cache.delete(f"email_verification_{user.id}")
            logger.info(f"Email verified via code for {user.email}")

            # ✅ Also return user data here if needed
            return Response({
                'message': 'Email verified successfully',
                'user': UserProfileSerializer(user).data,
            })

        return Response(
            {'error': 'Invalid verification code'},
            status=status.HTTP_400_BAD_REQUEST
        )


class ResendVerificationView(APIView):
    """
    Resend the verification email to the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.email_verified:
            return Response(
                {'message': 'Email already verified'},
                status=status.HTTP_400_BAD_REQUEST
            )

        send_verification_email(user, request)
        logger.info(f"Verification email resent to {user.email}")
        return Response({'message': 'Verification email sent'})


class PasswordResetRequestView(APIView):
    """
    Request a password reset email.

    If the email exists, a reset link is sent. We do not reveal whether
    the email exists to avoid user enumeration.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
            send_password_reset_email(user, request)
            logger.info(f"Password reset email sent to {email}")
        except User.DoesNotExist:
            pass

        return Response({'message': 'Password reset email sent if account exists'})


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token.

    Expects the token in the request body and the uid as a query parameter.
    If valid, updates the user's password.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = request.GET.get('uid')
        token = serializer.validated_data['token']
        if not uid:
            return Response(
                {'error': 'Missing uid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = verify_password_reset_token(uid, token)
        if not user:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['password'])
        user.save()
        logger.info(f"Password reset successful for {user.email}")
        return Response({'message': 'Password reset successfully'})


# ============================================================================
# PROFILE & ACCOUNT MANAGEMENT VIEWS
# ============================================================================

class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the authenticated user's profile.

    Uses the same serializer for both GET and PATCH.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        logger.info(f"Profile updated for {request.user.email}")
        return response


class UpdateProfileView(generics.UpdateAPIView):
    """
    Dedicated endpoint for partial profile updates.

    Allows updating first_name, last_name, persona, preferences,
    username (with 2‑changes‑per‑year limit), and onboarded flag.
    """
    serializer_class = UpdateProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = self.get_object()
        new_username = serializer.validated_data.get('username')

        # If username is being changed, enforce yearly limit
        if new_username and new_username != user.username:
            current_year = timezone.now().year

            # Reset counters if year has changed
            if user.username_change_year != current_year:
                user.username_change_year = current_year
                user.username_change_count_year = 0

            # Check limit
            if user.username_change_count_year >= 2:
                raise serializers.ValidationError({
                    'username': 'You have reached the limit of 2 username changes this year.'
                })

            # Increment counter and update timestamp
            user.username_change_count_year += 1
            user.last_username_change = timezone.now()
            # The username will be updated by the serializer later

        # Save the rest of the fields
        serializer.save()

        # Log the update
        logger.info(f"Profile updated for {user.email}")


class ChangePasswordView(APIView):
    """
    Change the user's password.

    Requires the old password for verification. Sends a security alert email.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Wrong password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        send_security_alert_email(
            user,
            'password_change',
            request.META.get('REMOTE_ADDR', 'Unknown'),
            request.META.get('HTTP_USER_AGENT', 'Unknown')
        )

        logger.info(f"Password changed for {user.email}")
        return Response({'message': 'Password changed successfully'})


class ChangeEmailView(APIView):
    """
    Change the user's email address.

    Two‑step process:
        1. POST: Request a change – a 6‑digit code is sent to the **new** email.
        2. PUT: Confirm with the code – the email is updated.

    Includes a 6‑month cooldown between email changes.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Request email change: send code to new email."""
        serializer = ChangeEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        new_email = serializer.validated_data['new_email']

        if User.objects.filter(email=new_email).exclude(id=user.id).exists():
            return Response(
                {'error': 'Email already in use'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.last_email_change:
            days_since = (timezone.now() - user.last_email_change).days
            if days_since < 183:
                return Response({
                    'error': f'You can change email again in {183 - days_since} days',
                    'cooldown_days': 183 - days_since
                }, status=status.HTTP_400_BAD_REQUEST)

        code = generate_verification_code()
        cache.set(f"email_change_code_{user.id}", code, timeout=600)
        cache.set(f"email_change_{user.id}", {
            'new_email': new_email,
            'requested_at': timezone.now().isoformat()
        }, timeout=3600)

        send_email_change_code(new_email, code)

        return Response({
            'message': f'Verification code sent to {new_email}',
            'expires_in': 600
        })

    def put(self, request):
        """Confirm email change with the verification code."""
        user = request.user
        code = request.data.get('code')
        if not code:
            return Response(
                {'error': 'Verification code required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cached_code = cache.get(f"email_change_code_{user.id}")
        if not cached_code or cached_code != code:
            return Response(
                {'error': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        pending = cache.get(f"email_change_{user.id}")
        if not pending:
            return Response(
                {'error': 'No pending email change request'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_email = pending['new_email']
        old_email = user.email

        user.email = new_email
        user.email_verified = True
        user.last_email_change = timezone.now()
        user.save()

        send_email_change_notification(user, old_email, new_email)

        cache.delete(f"email_change_{user.id}")
        cache.delete(f"email_change_code_{user.id}")

        logger.info(f"Email changed from {old_email} to {new_email} for user {user.id}")
        return Response({'message': 'Email updated successfully'})


class ChangeUsernameView(APIView):
    """
    Change the user's username.

    Limits: 2 changes per calendar year. Requires password confirmation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangeUsernameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        new_username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        if not user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=new_username).exclude(id=user.id).exists():
            return Response(
                {'error': 'Username already taken'},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_year = timezone.now().year
        if user.username_change_year != current_year:
            user.username_change_year = current_year
            user.username_change_count_year = 0

        if user.username_change_count_year >= 2:
            return Response({
                'error': 'You have reached the limit of 2 username changes this year',
                'next_allowed': f'{user.username_change_year + 1}-01-01'
            }, status=status.HTTP_400_BAD_REQUEST)

        old_username = user.username
        user.username = new_username
        user.username_change_count_year += 1
        user.last_username_change = timezone.now()
        user.save()

        logger.info(f"Username changed from {old_username} to {new_username} for user {user.id}")
        return Response({
            'message': 'Username updated successfully',
            'remaining_this_year': 2 - user.username_change_count_year
        })


class GenerateAPIKeyView(APIView):
    """
    Generate a new API key for the authenticated user.

    The key is generated using the User.generate_api_key() classmethod.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.api_key = User.generate_api_key()
        user.save()
        logger.info(f"API key generated for user {user.id}")
        return Response({'api_key': user.api_key})

# ============================================================================
# API KEY MANAGEMENT (Phase 2)
# ============================================================================

class APIKeyListView(APIView):
    """
    List and generate API keys for the authenticated user.

    GET  – returns all active keys (only preview, never raw).
    POST – creates a new key and returns the raw key once.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        keys = request.user.api_keys.filter(is_active=True)
        serializer = UserAPIKeySerializer(keys, many=True)
        return Response(serializer.data)

    def post(self, request):
        name = request.data.get('name')
        if not name:
            return Response({'error': 'Name is required'}, status=400)

        # Limit: 5 active keys per user
        if request.user.api_keys.filter(is_active=True).count() >= 5:
            return Response({'error': 'Maximum 5 active keys allowed'}, status=400)

        key_obj, raw_key = UserAPIKey.create_key(request.user, name)
        return Response({
            'id': key_obj.id,
            'name': key_obj.name,
            'raw_key': raw_key,  # only shown once
            'created_at': key_obj.created_at,
        }, status=201)


class APIKeyRevokeView(APIView):
    """
    Revoke (deactivate) an API key.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            key = request.user.api_keys.get(pk=pk, is_active=True)
        except UserAPIKey.DoesNotExist:
            return Response({'error': 'Key not found'}, status=404)

        key.is_active = False
        key.save()
        return Response({'message': 'Key revoked'}, status=200)
    

 # ============================================================================
# USAGE & STATS (Phase 2)
# ============================================================================

class UsageStatsView(APIView):
    """
    Returns daily API usage for the last 30 days.
    Aggregates counts from cache across all active API keys of the user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.core.cache import cache
        from datetime import timedelta, date

        today = date.today()
        result = []

        for i in range(30, -1, -1):
            day = today - timedelta(days=i)
            date_str = day.isoformat()
            total = 0

            for key in request.user.api_keys.filter(is_active=True):
                cache_key = f"usage_daily_{key.id}_{date_str}"
                total += cache.get(cache_key, 0)

            result.append({'date': date_str, 'count': total})

        return Response(result)


class TopSymbolsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import SymbolUsage
        top = SymbolUsage.objects.filter(user=request.user).order_by('-count')[:5]
        return Response([{'symbol': item.symbol, 'count': item.count} for item in top])


class ActivityLogView(APIView):
    """
    Returns the last 50 audit log entries for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = AuditLog.objects.filter(user=request.user).order_by('-timestamp')[:50]
        data = [{
            'action': log.action,
            'details': log.details,
            'timestamp': log.timestamp,
        } for log in logs]
        return Response(data)


class UserPreferencesView(APIView):
    """
    Get or update the authenticated user's investment preferences.

    GET  – returns current preferences (or creates defaults).
    PATCH – updates preferences (partial update allowed).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        preferences, created = UserPreferences.objects.get_or_create(user=request.user)
        serializer = UserPreferencesSerializer(preferences)
        return Response(serializer.data)

    def patch(self, request):
        preferences, created = UserPreferences.objects.get_or_create(user=request.user)
        serializer = UserPreferencesSerializer(preferences, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserWatchlistView(APIView):
    """
    Manage the user's watchlist.

    GET  – returns the current watchlist (list of symbols).
    POST – adds a symbol to the watchlist.
    DELETE /<symbol>/ – removes a symbol from the watchlist.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        return Response({'watchlist': preferences.watchlist or []})

    def post(self, request):
        symbol = request.data.get('symbol')
        if not symbol:
            return Response(
                {'error': 'Symbol is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        if not preferences.watchlist:
            preferences.watchlist = []

        if symbol not in preferences.watchlist:
            preferences.watchlist.append(symbol)
            preferences.save()
            return Response({'watchlist': preferences.watchlist}, status=status.HTTP_201_CREATED)

        return Response({'watchlist': preferences.watchlist}, status=status.HTTP_200_OK)

    def delete(self, request, symbol):
        preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
        if preferences.watchlist and symbol in preferences.watchlist:
            preferences.watchlist.remove(symbol)
            preferences.save()
            return Response({'watchlist': preferences.watchlist}, status=status.HTTP_200_OK)
        return Response(
            {'error': 'Symbol not found in watchlist'},
            status=status.HTTP_404_NOT_FOUND
        )


class DeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        password = request.data.get('password')
        confirm = request.data.get('confirm')

        if not user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if confirm != 'DELETE':
            return Response(
                {'error': 'Please type "DELETE" to confirm'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Deactivate immediately
        user.is_active = False
        user.deletion_requested_at = timezone.now()
        user.deletion_scheduled_for = timezone.now() + timedelta(days=30)
        user.save()

        # Blacklist tokens – safely handle if blacklist is not enabled
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            tokens = OutstandingToken.objects.filter(user=user)
            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception as e:
            logger.warning(f"Token blacklist skipped: {e}")

        # Send confirmation
        send_account_deletion_confirmation(user, request)

        AuditLog.objects.create(
            user=user,
            action='ACCOUNT_DELETION_REQUESTED',
            details={
                'scheduled_for': user.deletion_scheduled_for.isoformat(),
                'ip': request.META.get('REMOTE_ADDR', 'Unknown'),
            }
        )

        logger.info(f"Account deletion requested for user {user.id}")

        # Tell frontend to log out
        return Response({
            'message': 'Account deletion scheduled',
            'scheduled_for': user.deletion_scheduled_for,
            'logout': True,
        })


class CancelDeletionView(APIView):
    """
    Cancel a pending account deletion request.

    Restores the user account to active status and clears the deletion schedule.
    The user will need to log in again (tokens were blacklisted).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.deletion_requested_at:
            return Response(
                {'error': 'No pending deletion request'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.deletion_requested_at = None
        user.deletion_scheduled_for = None
        user.is_active = True
        user.save()

        logger.info(f"Account deletion cancelled for user {user.id}")
        return Response({'message': 'Account deletion cancelled'})