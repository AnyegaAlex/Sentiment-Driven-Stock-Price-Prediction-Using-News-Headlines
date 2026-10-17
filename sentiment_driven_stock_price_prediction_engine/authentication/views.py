"""
Authentication and account management views for Tickflow Intelligence.

This module provides REST API endpoints for:
- Registration, login, email verification (link + 6-digit code)
- Password reset (request + confirm)
- Profile management (get, update)
- Password change, email change (with verification), username change (yearly limit)
- API key management (list, create, revoke)
- Account deletion (30-day grace period, cancellable)

Refactored for Production:
- Removed threading (which crashes on Render/serverless platforms).
- Synchronous email dispatch with error handling.
- Atomic cache operations for rate limiting.
- Comprehensive audit logging.
"""

import logging
import time
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ParseError
from rest_framework import status, generics, permissions, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .models import User, AuditLog, UserPreferences, UserAPIKey
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    UpdateProfileSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    ChangeEmailSerializer,
    ChangeUsernameSerializer,
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
    error_response,
    success_response,
    get_request_context,
)

logger = logging.getLogger(__name__)

# Constants from settings with fallbacks
EMAIL_CHANGE_COOLDOWN_DAYS = getattr(settings, 'EMAIL_CHANGE_COOLDOWN_DAYS', 183)
USERNAME_CHANGE_LIMIT = getattr(settings, 'USERNAME_CHANGE_LIMIT', 2)
MAX_LOGIN_ATTEMPTS = getattr(settings, 'MAX_LOGIN_ATTEMPTS', 10)
LOGIN_ATTEMPT_WINDOW = getattr(settings, 'LOGIN_ATTEMPT_WINDOW', 300)  # 5 minutes


# ============================================================================
# AUTHENTICATION VIEWS
# ============================================================================

class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.
    
    Creates a new user account and sends a verification email containing
    both a clickable link and a 6-digit code.
    
    Rate Limited: 100/hour per IP (via AnonRateThrottle)
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def perform_create(self, serializer):
        try:
            user = None
            with transaction.atomic():
                user = serializer.save()
                UserPreferences.objects.get_or_create(user=user)
                # Audit log (does not depend on email)
                request_context = get_request_context(self.request)
                AuditLog.objects.create(
                    user=user,
                    action='ACCOUNT_CREATED',
                    details={
                        'ip': request_context['ip'],
                        'user_agent': request_context['user_agent'],
                    }
                )
                logger.info(f"New user registered: {user.email} (ID: {user.id})")
            
            # Send email synchronously outside transaction
            if user:
                try:
                    email_sent = send_verification_email(user, self.request)
                    if email_sent:
                        cache.set(f"verification_sent_{user.id}", True, timeout=60)
                    else:
                        cache.set(f"email_failed_{user.id}", True, timeout=300)
                        logger.error(f"Verification email FAILED to send for user {user.id}")
                except Exception as e:
                    logger.error(f"Verification email exception for user {user.id}: {e}")
                    cache.set(f"email_failed_{user.id}", True, timeout=300)
            return user
        except IntegrityError as e:
            logger.error(f"Registration integrity error: {e}")
            raise serializers.ValidationError({'email': 'This email is already registered.'})
        except Exception as e:
            logger.error(f"Registration error: {e}", exc_info=True)
            raise serializers.ValidationError({'error': 'Unable to create account. Please try again.'})


class LoginView(APIView):
    """
    User login endpoint.
    
    Authenticates using username or email and returns JWT access/refresh tokens.
    Requires email verification before login.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]
    serializer_class = LoginSerializer

    def post(self, request):
        start_time = time.time()
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            # Validate input
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Atomic Rate Limiting
            ip = request.META.get('REMOTE_ADDR', 'Unknown')
            username = serializer.validated_data['username']
            rate_key = f"login_attempts_{ip}_{username}"
            
            # Use cache.add to avoid race conditions
            if cache.add(rate_key, 1, timeout=LOGIN_ATTEMPT_WINDOW):
                attempts = 1
            else:
                try:
                    attempts = cache.incr(rate_key)
                except ValueError:
                    attempts = MAX_LOGIN_ATTEMPTS + 1 # Failsafe
            
            if attempts > MAX_LOGIN_ATTEMPTS:
                logger.warning(f"Rate limit exceeded for IP {ip}, user {username}")
                return Response(
                    error_response(
                        message='Too many login attempts. Please try again later.',
                        code='RATE_LIMIT_EXCEEDED',
                        request_id=request_id,
                        status_code=429
                    ),
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            # Authenticate user
            user = authenticate(
                username=username,
                password=serializer.validated_data['password']
            )
            
            if not user:
                logger.warning(f"Failed login attempt for {username} from {ip}")
                return Response(
                    error_response(
                        message='Invalid credentials. Please check your username and password.',
                        code='AUTH_INVALID_CREDENTIALS',
                        request_id=request_id,
                        status_code=401
                    ),
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Reset attempts on successful login
            cache.delete(rate_key)
            
            # Check if user is active
            if not user.is_active:
                logger.warning(f"Login attempt for inactive user: {user.email}")
                return Response(
                    error_response(
                        message='Your account has been deactivated. Please contact support.',
                        code='ACCOUNT_DEACTIVATED',
                        request_id=request_id,
                        status_code=403
                    ),
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check email verification
            if not user.email_verified:
                verification_sent = cache.get(f"verification_sent_{user.id}")
                return Response(
                    error_response(
                        message='Please verify your email before logging in.',
                        code='EMAIL_NOT_VERIFIED',
                        details={
                            'resend_available': not verification_sent,
                            'email': user.email,
                        },
                        request_id=request_id,
                        status_code=403
                    ),
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            # Audit log
            request_context = get_request_context(request)
            AuditLog.objects.create(
                user=user,
                action='LOGIN_SUCCESS',
                details={
                    'ip': request_context['ip'],
                    'user_agent': request_context['user_agent'],
                    'request_id': request_id,
                }
            )
            
            # SECURITY ALERT (Synchronous, fail-safe)
            try:
                send_security_alert_email(user, 'login', request_context['ip'], request_context['user_agent'])
            except Exception as e:
                logger.warning(f"Failed to send security alert for {user.email}: {e}")
            
            duration = (time.time() - start_time) * 1000
            logger.info(f"User logged in: {user.email} (ID: {user.id}) in {duration:.2f}ms")
            
            return Response(
                success_response(
                    data={
                        'access': str(refresh.access_token),
                        'refresh': str(refresh),
                        'user': UserProfileSerializer(user).data,
                    },
                    message='Login successful'
                ),
                status=status.HTTP_200_OK
            )
        
        except ParseError as e:
            logger.warning(f"JSON parse error during login: {e}")
            return Response(
                error_response(
                    message='Invalid JSON payload. Please check your request format.',
                    code='JSON_PARSE_ERROR',
                    request_id=request_id,
                    status_code=400
                ),
                status=status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            logger.error(f"Login error: {e}", exc_info=True)
            return Response(
                error_response(
                    message='An error occurred during login. Please try again.',
                    code='SERVER_ERROR',
                    request_id=request_id,
                    status_code=500
                ),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyEmailView(APIView):
    """
    Email verification endpoint.
    Supports token link (GET) and 6-digit code (POST).
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]
    serializer_class = serializers.Serializer

    def get(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            token = request.GET.get('token')
            uid = request.GET.get('uid')
            
            if not token or not uid:
                return Response(
                    error_response(message='Missing token or uid', code='MISSING_PARAMETERS', request_id=request_id),
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = verify_email_token(uid, token)
            if not user:
                return Response(
                    error_response(message='Invalid or expired verification link', code='INVALID_TOKEN', request_id=request_id),
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Activate user
            user.email_verified = True
            user.save()
            
            # Clear cache
            cache.delete(f"email_verification_{user.id}")
            cache.delete(f"verification_sent_{user.id}")
            cache.delete(f"email_failed_{user.id}")
            
            # Send welcome email (Synchronous)
            try:
                send_welcome_email(user, request)
            except Exception as e:
                logger.warning(f"Welcome email failed for {user.email}: {e}")
            
            # Audit log
            request_context = get_request_context(request)
            AuditLog.objects.create(
                user=user,
                action='EMAIL_VERIFIED',
                details={
                    'method': 'link',
                    'ip': request_context['ip'],
                    'request_id': request_id,
                }
            )
            
            # Generate JWT tokens for auto-login
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"Email verified successfully for {user.email}")
            
            return Response(
                success_response(
                    data={
                        'message': 'Email verified successfully',
                        'redirect': '/onboarding', # Frontend hook
                        'user': UserProfileSerializer(user).data,
                        'access': str(refresh.access_token),
                        'refresh': str(refresh),
                    }
                ),
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Email verification error: {e}", exc_info=True)
            return Response(
                error_response(message='An error occurred during verification.', code='SERVER_ERROR', request_id=request_id),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            if not request.user.is_authenticated:
                return Response(
                    error_response(message='Authentication required', code='AUTH_REQUIRED', request_id=request_id, status_code=401),
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            code = request.data.get('code')
            if not code:
                return Response(
                    error_response(message='Verification code required', code='MISSING_CODE', request_id=request_id),
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = request.user
            if verify_email_code(user, code):
                user.email_verified = True
                user.save()
                cache.delete(f"email_verification_{user.id}")
                cache.delete(f"verification_sent_{user.id}")
                
                AuditLog.objects.create(
                    user=user,
                    action='EMAIL_VERIFIED',
                    details={'method': 'code'}
                )
                
                logger.info(f"Email verified via code for {user.email}")
                
                return Response(
                    success_response(data=UserProfileSerializer(user).data, message='Email verified successfully'),
                    status=status.HTTP_200_OK
                )
            
            return Response(
                error_response(message='Invalid verification code', code='INVALID_CODE', request_id=request_id),
                status=status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            logger.error(f"Code verification error: {e}", exc_info=True)
            return Response(
                error_response(message='An error occurred during verification.', code='SERVER_ERROR', request_id=request_id),
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResendVerificationView(APIView):
    """
    Resend the verification email to the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    serializer_class = serializers.Serializer

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            user = request.user
            
            if user.email_verified:
                return Response(
                    error_response(message='Email already verified', code='ALREADY_VERIFIED', request_id=request_id),
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Atomic cooldown check
            cooldown_key = f"resend_cooldown_{user.id}"
            if not cache.add(cooldown_key, 1, timeout=60):
                return Response(
                    error_response(message='Please wait 60 seconds before requesting another verification email.', code='RATE_LIMITED', request_id=request_id, status_code=429),
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            daily_key = f"resend_daily_{user.id}"
            if cache.add(daily_key, 1, timeout=86400):
                daily_count = 1
            else:
                try:
                    daily_count = cache.incr(daily_key)
                except ValueError:
                    daily_count = 6
            
            if daily_count > 5:
                return Response(
                    error_response(message='Daily verification resend limit reached.', code='DAILY_LIMIT_EXCEEDED', request_id=request_id, status_code=429),
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            email_sent = send_verification_email(user, request)
            
            if email_sent:
                cache.set(f"verification_sent_{user.id}", True, timeout=60)
                AuditLog.objects.create(user=user, action='VERIFICATION_RESENT', details={'ip': request.META.get('REMOTE_ADDR'), 'request_id': request_id})
                return Response(success_response(data={'remaining_today': 5 - daily_count}, message='Verification email sent'), status=status.HTTP_200_OK)
            else:
                return Response(error_response(message='Failed to send verification email.', code='EMAIL_FAILED', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Resend verification error: {e}", exc_info=True)
            return Response(error_response(message='An error occurred.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PasswordResetRequestView(APIView):
    """
    Request a password reset email.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            serializer = PasswordResetRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            email = serializer.validated_data['email']
            
            user = User.objects.filter(email=email, is_active=True).first()
            if user:
                email_sent = send_password_reset_email(user, request)
                if email_sent:
                    AuditLog.objects.create(user=user, action='PASSWORD_RESET_REQUESTED', details={'ip': request.META.get('REMOTE_ADDR'), 'request_id': request_id})
            
            return Response(success_response(message='Password reset email sent if account exists'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Password reset request error: {e}", exc_info=True)
            return Response(error_response(message='An error occurred.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            serializer = PasswordResetConfirmSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            uid = request.GET.get('uid')
            token = serializer.validated_data['token']
            
            if not uid:
                return Response(error_response(message='Missing uid', code='MISSING_PARAMETERS', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            user = verify_password_reset_token(uid, token)
            if not user:
                return Response(error_response(message='Invalid or expired token', code='INVALID_TOKEN', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            if not user.is_active:
                return Response(error_response(message='Account deactivated.', code='ACCOUNT_DEACTIVATED', request_id=request_id), status=status.HTTP_403_FORBIDDEN)
            
            with transaction.atomic():
                user.set_password(serializer.validated_data['password'])
                user.save()
            
            AuditLog.objects.create(user=user, action='PASSWORD_RESET_COMPLETED', details={'ip': request.META.get('REMOTE_ADDR'), 'request_id': request_id})
            logger.info(f"Password reset successful for {user.email}")
            
            return Response(success_response(message='Password reset successfully'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Password reset confirm error: {e}", exc_info=True)
            return Response(error_response(message='An error occurred.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# PROFILE & ACCOUNT MANAGEMENT VIEWS
# ============================================================================

class ProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        try:
            response = super().update(request, *args, **kwargs)
            request_context = get_request_context(request)
            AuditLog.objects.create(
                user=request.user,
                action='PROFILE_UPDATED',
                details={'fields': list(request.data.keys()), 'ip': request_context['ip'], 'request_id': request_id}
            )
            logger.info(f"Profile updated for {request.user.email}")
            return response
        except Exception as e:
            logger.error(f"Profile update error: {e}", exc_info=True)
            return Response(error_response(message='Failed to update profile.', code='UPDATE_FAILED', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateProfileView(generics.UpdateAPIView):
    """Dedicated endpoint for partial profile updates."""
    serializer_class = UpdateProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = self.get_object()
        new_username = serializer.validated_data.get('username')
        
        try:
            if new_username and new_username != user.username:
                current_year = timezone.now().year
                if user.username_change_year != current_year:
                    user.username_change_year = current_year
                    user.username_change_count_year = 0
                
                if user.username_change_count_year >= USERNAME_CHANGE_LIMIT:
                    raise serializers.ValidationError({'username': f'Limit of {USERNAME_CHANGE_LIMIT} changes reached.'})
                
                user.username_change_count_year += 1
                user.last_username_change = timezone.now()
            
            serializer.save()
            AuditLog.objects.create(user=user, action='PROFILE_UPDATED', details={'fields': list(serializer.validated_data.keys())})
            logger.info(f"Profile updated for {user.email}")
            
        except serializers.ValidationError:
            raise
        except Exception as e:
            logger.error(f"Profile update error: {e}", exc_info=True)
            raise serializers.ValidationError({'error': 'Failed to update profile.'})


class ChangePasswordView(APIView):
    """Change the user's password."""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            serializer = ChangePasswordSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(error_response(message='Wrong password', code='WRONG_PASSWORD', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            request_context = get_request_context(request)
            
            # SECURITY ALERT (Synchronous, fail-safe)
            try:
                send_security_alert_email(user, 'password_change', request_context['ip'], request_context['user_agent'])
            except Exception as e:
                logger.warning(f"Failed to send security alert for {user.email}: {e}")
            
            AuditLog.objects.create(user=user, action='PASSWORD_CHANGED', details={'ip': request_context['ip'], 'request_id': request_id})
            logger.info(f"Password changed for {user.email}")
            
            return Response(success_response(message='Password changed successfully'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Password change error: {e}", exc_info=True)
            return Response(error_response(message='Failed to change password.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChangeEmailView(APIView):
    """Change the user's email address with 6-month cooldown."""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    serializer_class = ChangeEmailSerializer

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            serializer = ChangeEmailSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            new_email = serializer.validated_data['new_email']
            
            if User.objects.filter(email=new_email).exclude(id=user.id).exists():
                return Response(error_response(message='Email already in use', code='EMAIL_IN_USE', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            if user.last_email_change:
                days_since = (timezone.now() - user.last_email_change).days
                if days_since < EMAIL_CHANGE_COOLDOWN_DAYS:
                    return Response(error_response(message=f'Cooldown active. Try in {EMAIL_CHANGE_COOLDOWN_DAYS - days_since} days.', code='COOLDOWN_ACTIVE', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            code = generate_verification_code()
            cache.set(f"email_change_code_{user.id}", code, timeout=600)
            cache.set(f"email_change_{user.id}", {'new_email': new_email, 'requested_at': timezone.now().isoformat()}, timeout=3600)
            
            email_sent = send_email_change_code(new_email, code)
            if not email_sent:
                return Response(error_response(message='Failed to send verification code.', code='EMAIL_FAILED', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            AuditLog.objects.create(user=user, action='EMAIL_CHANGE_REQUESTED', details={'new_email': new_email, 'ip': request.META.get('REMOTE_ADDR'), 'request_id': request_id})
            
            return Response(success_response(data={'expires_in': 600}, message=f'Verification code sent to {new_email}'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Email change request error: {e}", exc_info=True)
            return Response(error_response(message='Failed to request email change.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            user = request.user
            code = request.data.get('code')
            
            if not code:
                return Response(error_response(message='Verification code required', code='MISSING_CODE', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            cached_code = cache.get(f"email_change_code_{user.id}")
            if not cached_code or cached_code != code:
                return Response(error_response(message='Invalid verification code', code='INVALID_CODE', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            pending = cache.get(f"email_change_{user.id}")
            if not pending:
                return Response(error_response(message='No pending email change request', code='NO_PENDING_REQUEST', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            new_email = pending['new_email']
            old_email = user.email
            
            with transaction.atomic():
                user.email = new_email
                user.email_verified = True
                user.last_email_change = timezone.now()
                user.save()
            
            # Send notifications synchronously
            try:
                send_email_change_notification(user, old_email, new_email)
            except Exception as e:
                logger.warning(f"Email change notification failed: {e}")
            
            cache.delete(f"email_change_{user.id}")
            cache.delete(f"email_change_code_{user.id}")
            
            AuditLog.objects.create(user=user, action='EMAIL_CHANGED', details={'old_email': old_email, 'new_email': new_email, 'ip': request.META.get('REMOTE_ADDR'), 'request_id': request_id})
            logger.info(f"Email changed from {old_email} to {new_email} for user {user.id}")
            
            return Response(success_response(message='Email updated successfully'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Email change confirm error: {e}", exc_info=True)
            return Response(error_response(message='Failed to confirm email change.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChangeUsernameView(APIView):
    """Change the user's username with 2 changes per year limit."""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    serializer_class = ChangeUsernameSerializer

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            serializer = ChangeUsernameSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            new_username = serializer.validated_data['new_username']
            password = serializer.validated_data['password']
            
            if not user.check_password(password):
                return Response(error_response(message='Invalid password', code='WRONG_PASSWORD', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            if User.objects.filter(username=new_username).exclude(id=user.id).exists():
                return Response(error_response(message='Username already taken', code='USERNAME_TAKEN', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            current_year = timezone.now().year
            if user.username_change_year != current_year:
                user.username_change_year = current_year
                user.username_change_count_year = 0
            
            if user.username_change_count_year >= USERNAME_CHANGE_LIMIT:
                return Response(error_response(message=f'Limit of {USERNAME_CHANGE_LIMIT} changes reached.', code='LIMIT_REACHED', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            old_username = user.username
            with transaction.atomic():
                user.username = new_username
                user.username_change_count_year += 1
                user.last_username_change = timezone.now()
                user.save()
            
            AuditLog.objects.create(user=user, action='USERNAME_CHANGED', details={'old_username': old_username, 'new_username': new_username, 'ip': request.META.get('REMOTE_ADDR'), 'request_id': request_id})
            logger.info(f"Username changed from {old_username} to {new_username} for user {user.id}")
            
            return Response(success_response(data={'remaining_this_year': USERNAME_CHANGE_LIMIT - user.username_change_count_year}, message='Username updated successfully'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Username change error: {e}", exc_info=True)
            return Response(error_response(message='Failed to change username.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# API KEY MANAGEMENT
# ============================================================================

class APIKeyListView(APIView):
    """List and create API keys for the authenticated user."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserAPIKeySerializer

    def get(self, request):
        try:
            keys = request.user.api_keys.filter(is_active=True)
            return Response(UserAPIKeySerializer(keys, many=True).data)
        except Exception as e:
            logger.error(f"API key list error: {e}", exc_info=True)
            return Response(error_response(message='Failed to retrieve API keys.', code='SERVER_ERROR'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            name = request.data.get('name')
            if not name:
                return Response(error_response(message='Name is required', code='MISSING_NAME', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            if request.user.api_keys.filter(is_active=True).count() >= 5:
                return Response(error_response(message='Maximum 5 active keys allowed', code='LIMIT_EXCEEDED', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            # Atomic rate limiting
            rate_key = f"api_key_create_{request.user.id}"
            if cache.add(rate_key, 1, timeout=60):
                current_count = 1
            else:
                try:
                    current_count = cache.incr(rate_key)
                except ValueError:
                    current_count = 11 # Failsafe
            
            if current_count > 10:
                return Response(error_response(message='Too many creation attempts.', code='RATE_LIMIT_EXCEEDED', request_id=request_id), status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            with transaction.atomic():
                key_obj, raw_key = UserAPIKey.create_key(request.user, name)
                
                request_context = get_request_context(request)
                AuditLog.objects.create(
                    user=request.user,
                    action='API_KEY_CREATED',
                    details={'name': name, 'key_id': key_obj.id, 'ip': request_context['ip'], 'request_id': request_id}
                )
            
            logger.info(f"API key created for user {request.user.id}: {name}")
            
            return Response(
                success_response(data={'id': key_obj.id, 'name': key_obj.name, 'raw_key': raw_key, 'created_at': key_obj.created_at}, message='API key created successfully'),
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"API key creation error: {e}", exc_info=True)
            return Response(error_response(message='Failed to create API key.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class APIKeyRevokeView(APIView):
    """Revoke (deactivate) an API key."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    serializer_class = UserAPIKeySerializer

    def delete(self, request, pk):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            try:
                key = request.user.api_keys.get(pk=pk, is_active=True)
            except UserAPIKey.DoesNotExist:
                return Response(error_response(message='Key not found', code='NOT_FOUND', request_id=request_id), status=status.HTTP_404_NOT_FOUND)
            
            key.is_active = False
            key.save()
            
            request_context = get_request_context(request)
            AuditLog.objects.create(user=request.user, action='API_KEY_REVOKED', details={'name': key.name, 'key_id': key.id, 'ip': request_context['ip'], 'request_id': request_id})
            
            logger.info(f"API key revoked for user {request.user.id}: {key.name}")
            return Response(success_response(message='Key revoked successfully'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"API key revoke error: {e}", exc_info=True)
            return Response(error_response(message='Failed to revoke API key.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# USAGE & STATS
# ============================================================================

class UsageStatsView(APIView):
    """Returns daily API usage for the last 30 days."""
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer

    def get(self, request):
        try:
            from datetime import timedelta, date
            today = date.today()
            result = []
            
            for i in range(30, -1, -1):
                day = today - timedelta(days=i)
                date_str = day.isoformat()
                total = 0
                for key in request.user.api_keys.filter(is_active=True):
                    total += cache.get(f"usage_daily_{key.id}_{date_str}", 0)
                result.append({'date': date_str, 'count': total})
            
            return Response(result)
        except Exception as e:
            logger.error(f"Usage stats error: {e}", exc_info=True)
            return Response(error_response(message='Failed to retrieve usage stats.', code='SERVER_ERROR'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TopSymbolsView(APIView):
    """Returns top 5 most frequently analyzed symbols."""
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer

    def get(self, request):
        try:
            from .models import SymbolUsage
            top = SymbolUsage.objects.filter(user=request.user).order_by('-count')[:5]
            return Response([{'symbol': item.symbol, 'count': item.count} for item in top])
        except Exception as e:
            logger.error(f"Top symbols error: {e}", exc_info=True)
            return Response(error_response(message='Failed to retrieve top symbols.', code='SERVER_ERROR'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActivityLogView(APIView):
    """Returns the last 50 audit log entries for the authenticated user."""
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer

    def get(self, request):
        try:
            limit = min(int(request.query_params.get('limit', 50)), 100)
            offset = int(request.query_params.get('offset', 0))
            
            logs = AuditLog.objects.filter(user=request.user).order_by('-timestamp')
            total = logs.count()
            logs = logs[offset:offset+limit]
            
            data = [{'action': log.action, 'details': log.details, 'timestamp': log.timestamp} for log in logs]
            return Response({'total': total, 'limit': limit, 'offset': offset, 'results': data})
        except Exception as e:
            logger.error(f"Activity log error: {e}", exc_info=True)
            return Response(error_response(message='Failed to retrieve activity log.', code='SERVER_ERROR'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# PREFERENCES & WATCHLIST
# ============================================================================

class UserPreferencesView(APIView):
    """Get or update the authenticated user's investment preferences."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserPreferencesSerializer

    def get(self, request):
        try:
            preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
            return Response(UserPreferencesSerializer(preferences).data)
        except Exception as e:
            logger.error(f"Preferences get error: {e}", exc_info=True)
            return Response(error_response(message='Failed to retrieve preferences.', code='SERVER_ERROR'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def patch(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        try:
            preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
            serializer = UserPreferencesSerializer(preferences, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            
            return Response(error_response(message='Validation failed', code='VALIDATION_ERROR', details=serializer.errors, request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Preferences update error: {e}", exc_info=True)
            return Response(error_response(message='Failed to update preferences.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserWatchlistView(APIView):
    """Manage the user's watchlist."""
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.Serializer

    def get(self, request):
        try:
            preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
            return Response({'watchlist': preferences.watchlist or []})
        except Exception as e:
            logger.error(f"Watchlist get error: {e}", exc_info=True)
            return Response(error_response(message='Failed to retrieve watchlist.', code='SERVER_ERROR'), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        try:
            symbol = request.data.get('symbol')
            if not symbol:
                return Response(error_response(message='Symbol is required', code='MISSING_SYMBOL', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            symbol = symbol.upper()
            if not symbol or len(symbol) > 10 or not symbol.isalnum():
                return Response(error_response(message='Invalid symbol format.', code='INVALID_SYMBOL', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
            if not preferences.watchlist:
                preferences.watchlist = []
            
            if symbol not in preferences.watchlist:
                preferences.watchlist.append(symbol)
                preferences.save()
                
                request_context = get_request_context(request)
                AuditLog.objects.create(user=request.user, action='WATCHLIST_ADDED', details={'symbol': symbol, 'ip': request_context['ip'], 'request_id': request_id})
                
                return Response(success_response(data={'watchlist': preferences.watchlist}, message=f'{symbol} added to watchlist'), status=status.HTTP_201_CREATED)
            
            return Response(success_response(data={'watchlist': preferences.watchlist}, message=f'{symbol} already in watchlist'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Watchlist add error: {e}", exc_info=True)
            return Response(error_response(message='Failed to add symbol.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, symbol):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        try:
            preferences, _ = UserPreferences.objects.get_or_create(user=request.user)
            symbol = symbol.upper()
            
            if preferences.watchlist and symbol in preferences.watchlist:
                preferences.watchlist.remove(symbol)
                preferences.save()
                
                request_context = get_request_context(request)
                AuditLog.objects.create(user=request.user, action='WATCHLIST_REMOVED', details={'symbol': symbol, 'ip': request_context['ip'], 'request_id': request_id})
                
                return Response(success_response(data={'watchlist': preferences.watchlist}, message=f'{symbol} removed from watchlist'), status=status.HTTP_200_OK)
            
            return Response(error_response(message='Symbol not found in watchlist', code='NOT_FOUND', request_id=request_id), status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Watchlist remove error: {e}", exc_info=True)
            return Response(error_response(message='Failed to remove symbol.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# ACCOUNT DELETION
# ============================================================================

class DeleteAccountView(APIView):
    """Delete user account with 30-day grace period."""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    serializer_class = serializers.Serializer

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            user = request.user
            password = request.data.get('password')
            confirm = request.data.get('confirm')
            
            if not user.check_password(password):
                return Response(error_response(message='Invalid password', code='WRONG_PASSWORD', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            if confirm != 'DELETE':
                return Response(error_response(message='Please type "DELETE" to confirm', code='CONFIRMATION_REQUIRED', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                user.is_active = False
                user.deletion_requested_at = timezone.now()
                user.deletion_scheduled_for = timezone.now() + timedelta(days=30)
                user.save()
                
                try:
                    tokens = OutstandingToken.objects.filter(user=user)
                    for token in tokens:
                        BlacklistedToken.objects.get_or_create(token=token)
                except Exception as e:
                    logger.warning(f"Token blacklist skipped: {e}")
            
            # Send confirmation synchronously
            try:
                send_account_deletion_confirmation(user, request)
            except Exception as e:
                logger.warning(f"Deletion confirmation email failed for {user.email}: {e}")
            
            request_context = get_request_context(request)
            AuditLog.objects.create(user=user, action='ACCOUNT_DELETION_REQUESTED', details={'scheduled_for': user.deletion_scheduled_for.isoformat(), 'ip': request_context['ip'], 'request_id': request_id})
            logger.info(f"Account deletion requested for user {user.id}")
            
            return Response(success_response(data={'scheduled_for': user.deletion_scheduled_for, 'logout': True}, message='Account deletion scheduled'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Account deletion error: {e}", exc_info=True)
            return Response(error_response(message='Failed to schedule account deletion.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CancelDeletionView(APIView):
    """Cancel a pending account deletion request."""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]
    serializer_class = serializers.Serializer

    def post(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID', str(uuid.uuid4())[:8])
        
        try:
            user = request.user
            if not user.deletion_requested_at:
                return Response(error_response(message='No pending deletion request', code='NO_PENDING_REQUEST', request_id=request_id), status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                user.deletion_requested_at = None
                user.deletion_scheduled_for = None
                user.is_active = True
                user.save()
            
            request_context = get_request_context(request)
            AuditLog.objects.create(user=user, action='ACCOUNT_DELETION_CANCELLED', details={'ip': request_context['ip'], 'request_id': request_id})
            logger.info(f"Account deletion cancelled for user {user.id}")
            
            return Response(success_response(message='Account deletion cancelled'), status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Cancel deletion error: {e}", exc_info=True)
            return Response(error_response(message='Failed to cancel deletion.', code='SERVER_ERROR', request_id=request_id), status=status.HTTP_500_INTERNAL_SERVER_ERROR)