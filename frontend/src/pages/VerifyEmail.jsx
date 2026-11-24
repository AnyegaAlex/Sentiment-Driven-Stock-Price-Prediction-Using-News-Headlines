// pages/VerifyEmail.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useLocation, Link, useNavigate } from 'react-router-dom';
import apiClient, { setAuthToken } from '@/services/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CheckCircle, AlertCircle, Mail, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { getActionErrorMessage } from '@/utils/errorHandler';
import TfcLogo from '@/assets/Primary Icon White.svg';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the inner payload from the unified client response.
 * Handles both nested `{ success, data: {...} }` and flat `{...}` shapes.
 */
const extract = (response) => {
  if (!response) return {};
  if (response.data && typeof response.data === 'object') return response.data;
  return response;
};

/**
 * Normalizes errors from the unified client.
 * The client rejects with: { success: false, error, code, details }
 */
const normalizeError = (err) => ({
  message: err?.error || err?.message || 'An unexpected error occurred.',
  code: err?.code || 500,
  details: err?.details || {},
  retryAfter: err?.retryAfter,
});

/**
 * Resolves where to send the user after verification.
 * Priority:
 *   1. Backend-provided `redirect` (explicit contract)
 *   2. Onboarding status from user object
 */
const resolveRedirect = (payload, fallbackUser = null) => {
  const requestedPath = payload?.redirect;
  if (
    typeof requestedPath === 'string' &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//')
  ) {
    return requestedPath;
  }

  const user = payload?.user || fallbackUser;
  if (user?.onboarded) return '/dashboard';
  return '/onboarding';
};

// ============================================================================
// Component
// ============================================================================

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, isAuthenticated, refreshUser, updateUser } = useAuth();
  const redirectTimerRef = useRef(null);
  const verificationAttemptRef = useRef(null);
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [email, setEmail] = useState(location.state?.email || '');
  const [redirectPath, setRedirectPath] = useState('/onboarding');

  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  // ---------------------------------------------------------------------------
  // Already-verified short-circuit
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isAuthenticated && authUser?.email_verified) {
      navigate(authUser.onboarded ? '/dashboard' : '/onboarding', { replace: true });
    }
  }, [isAuthenticated, authUser, navigate]);

  // ---------------------------------------------------------------------------
  // Read email from URL (for resend button)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const emailParam = location.state?.email || searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [location.state?.email, searchParams]);

  // ---------------------------------------------------------------------------
  // Persist tokens from backend response
  // ---------------------------------------------------------------------------
  const persistTokens = useCallback((access, refresh) => {
    if (!access || !refresh) return null;

    const remember = !!localStorage.getItem('accessToken');
    const storage = remember ? localStorage : sessionStorage;
    setAuthToken(access, remember);
    storage.setItem('refreshToken', refresh);
    return remember;
  }, []);

  // ---------------------------------------------------------------------------
  // Verify with token (link click)
  // ---------------------------------------------------------------------------
  const verifyWithToken = useCallback(
    async (token, uid) => {
      try {
        const response = await apiClient.get('/auth/verify-email/', {
          params: { token, uid },
        });

        const payload = extract(response);
        const { access, refresh, user } = payload;

        if (!user) {
          setStatus('error');
          setMessage('Verification failed. No user data returned.');
          return;
        }

        // Verification succeeded. If the API did not return a session,
        // send the user to sign in rather than pretending they are authenticated.
        const rememberSession = persistTokens(access, refresh);
        if (rememberSession === null) {
          setRedirectPath('/login');
          setStatus('success');
          setMessageType('success');
          setMessageType('success');
        setMessage('Your email has been verified. Sign in to continue.');
          redirectTimerRef.current = setTimeout(() => {
            navigate('/login', { replace: true });
          }, 1000);
          return;
        }

        // Refresh the shared auth context; if the profile request is temporarily
        // unavailable, use the verified user returned by the verification API.
        const freshUser = await refreshUser();
        const finalUser = freshUser || { ...user, email_verified: true };
        if (!freshUser) updateUser(finalUser, rememberSession);

        const redirectUrl = resolveRedirect(payload, finalUser);
        setRedirectPath(redirectUrl);
        setStatus('success');
        setMessageType('success');
        setMessageType('success');
      setMessage('Your email address has been verified.');

        redirectTimerRef.current = setTimeout(() => {
          navigate(redirectUrl, { replace: true });
        }, 1000);
      } catch (err) {
        const e = normalizeError(err);

        // An already-verified address is not a failed verification.
        if (e.message.toLowerCase().includes('already verified')) {
          const freshUser = await refreshUser();
          const currentUser = freshUser || authUser;
          navigate(
            currentUser
              ? (currentUser.onboarded ? '/dashboard' : '/onboarding')
              : '/login',
            { replace: true }
          );
          return;
        }

        setStatus('error');
        setMessageType('error');
        const invalidToken = /(token|link)/i.test(e.message) && /(invalid|expired|used|missing)/i.test(e.message);
        setMessage(
          invalidToken
            ? 'This verification link is invalid or has expired. Request a new verification email to continue.'
            : getActionErrorMessage(e, 'We couldn’t verify your email address. Please try again.')
        );
      }
    },
    [persistTokens, refreshUser, updateUser, navigate, authUser]
  );

  // ---------------------------------------------------------------------------
  // Verify with code (manual fallback)
  // ---------------------------------------------------------------------------
  const verifyWithCode = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessageType('error');
      setMessage('Enter the email address you used to create your account.');
      return;
    }
    if (!code || code.length !== 6) {
      setMessageType('error');
      setMessage('Enter the 6-digit code from your latest verification email.');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('info');

    try {
      const response = await apiClient.post('/auth/verify-email/', { email: normalizedEmail, code });
      const payload = extract(response);
      const { access, refresh, user } = payload;

      if (!user) {
        setStatus('manual');
        setMessageType('error');
        setMessage('We couldn’t complete verification. Check the code and try again, or request a new email.');
        return;
      }

      const rememberSession = persistTokens(access, refresh);
      if (rememberSession === null) {
        setRedirectPath('/login');
        setStatus('success');
        setMessage('Your email has been verified. Sign in to continue.');
        redirectTimerRef.current = setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
        return;
      }

      const freshUser = await refreshUser();
      const finalUser = freshUser || { ...user, email_verified: true };
      if (!freshUser) updateUser(finalUser, rememberSession);

      const redirectUrl = resolveRedirect(payload, finalUser);
      setRedirectPath(redirectUrl);
      setStatus('success');
      setMessage('Your email address has been verified.');

      redirectTimerRef.current = setTimeout(() => {
        navigate(redirectUrl, { replace: true });
      }, 1500);
    } catch (err) {
      const e = normalizeError(err);

      // "Already verified" is not an error — refresh the session or ask the user to sign in.
      if (e.message.toLowerCase().includes('already verified')) {
        const freshUser = await refreshUser();
        const currentUser = freshUser || authUser;
        navigate(
          currentUser
            ? (currentUser.onboarded ? '/dashboard' : '/onboarding')
            : '/login',
          { replace: true }
        );
        return;
      }

      setStatus('manual');
      setMessageType('error');
      setMessage(
        Number(e.code) === 400 || Number(e.code) === 401
          ? 'That code is invalid or has expired. Check the latest email or request a new code.'
          : getActionErrorMessage(e, 'We couldn’t verify your email address. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  }, [email, code, persistTokens, refreshUser, updateUser, navigate, authUser]);

  // ---------------------------------------------------------------------------
  // Resend verification email
  // ---------------------------------------------------------------------------
  const handleResend = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessageType('error');
      setMessage('Enter the email address you used to create your account first.');
      return;
    }

    setResendLoading(true);
    setMessage('');
    setMessageType('info');

    try {
      await apiClient.post('/auth/resend-verification/', { email: normalizedEmail });
      setStatus('manual');
      setMessageType('success');
      setMessage('If this address still needs verification, a new email will arrive shortly. Check your inbox and spam folder.');
    } catch (err) {
      setMessageType('error');
      setMessage(getActionErrorMessage(err, 'We couldn’t send a verification email. Please try again.'));
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  // ---------------------------------------------------------------------------
  // Auto-verify on mount if token + uid present
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isAuthenticated && authUser?.email_verified) return;

    const token = searchParams.get('token');
    const uid = searchParams.get('uid');

    if (!token || !uid) {
      // The auth context may update after manual verification. Do not let this
      // effect reset a successful or failed manual submission back to its
      // initial state when its callback dependencies change.
      if (verificationAttemptRef.current !== 'manual') {
        verificationAttemptRef.current = 'manual';
        setStatus('manual');
        setMessage('Enter the email address and 6-digit code from your verification email, or request a new link.');
      }
      return;
    }

    const attemptKey = `${uid}:${token}`;
    if (verificationAttemptRef.current === attemptKey) return;
    verificationAttemptRef.current = attemptKey;

    verifyWithToken(token, uid);
  }, [searchParams, verifyWithToken, isAuthenticated, authUser?.email_verified]);

  // ===========================================================================
  // Render states
  // ===========================================================================

  // Verifying
  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <Card className="w-full max-w-md border border-gray-800 bg-gray-900">
          <CardContent className="text-center py-8 space-y-4">
            <LoadingSpinner size="lg" />
            <h2 className="text-lg font-semibold text-white">Verifying your email…</h2>
            <p className="text-gray-400">Please wait while we confirm your email address.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success
  if (status === 'success') {
    const targetLabel = redirectPath === '/login'
      ? 'sign-in page'
      : redirectPath.startsWith('/dashboard') ? 'dashboard' : 'onboarding';

    const continueLabel = redirectPath === '/login'
      ? 'Go to Sign In'
      : redirectPath.startsWith('/dashboard') ? 'Go to Dashboard' : 'Continue to Onboarding';

    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <Card className="w-full max-w-md border border-gray-800 bg-gray-900">
          <CardContent className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-green-400/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Email verified</h2>
            <p className="text-gray-400">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to {targetLabel}…</p>
            <Link
              to={redirectPath}
              className="flex min-h-[44px] w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              {continueLabel}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <Card className="w-full max-w-md border border-gray-800 bg-gray-900">
          <CardContent className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-red-400/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Verification Failed</h2>
            <Alert
              variant="destructive"
              className="border-red-400 bg-red-400/10 text-red-400 text-left"
            >
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">{message}</AlertDescription>
            </Alert>

            <div className="space-y-3">
              {email && (
                <Button
                  variant="outline"
                  onClick={handleResend}
                  disabled={resendLoading || !email.trim()}
                  className="w-full min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <RefreshCw
                    className={cn('h-4 w-4 mr-2', resendLoading && 'animate-spin')}
                  />
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </Button>
              )}
              <Link
                to="/login"
                className="flex min-h-[44px] w-full items-center justify-center rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manual code entry (fallback)
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <Card className="w-full max-w-md border border-gray-800 bg-gray-900">
        <CardHeader>
          <div className="flex flex-col items-center mb-4">
            <img src={TfcLogo} alt="TFI" className="h-14 w-14 mb-2 opacity-80" />
            <span className="text-lg font-semibold text-white tracking-tight">
              TickFlow Intelligence
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5 tracking-wide">
              Stock research workspace
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-white">
            Enter Verification Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-xl bg-gray-800">
              <Mail className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <p className="text-center text-gray-400">
            Enter the 6-digit verification code from your email.
          </p>

          <div className="space-y-2">
            <Label htmlFor="verify-email" className="text-gray-300">
              Email Address
            </Label>
            <Input
              id="verify-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code" className="text-gray-300">
              Verification Code
            </Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="min-h-[44px] text-center text-lg font-mono tracking-widest bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500"
              disabled={loading}
            />
          </div>

          {message && (
            <Alert
              className={
                messageType === 'success'
                  ? 'border-green-400 bg-green-400/10 text-green-400'
                  : messageType === 'error'
                    ? 'border-red-400 bg-red-400/10 text-red-400'
                    : 'border-gray-700 bg-gray-800/60 text-gray-300'
              }
            >
              <AlertDescription role={messageType === 'error' ? 'alert' : 'status'}>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={verifyWithCode}
              disabled={loading || code.length !== 6 || !email.trim()}
              className="w-full min-h-[44px] bg-white text-black hover:bg-gray-200"
            >
              {loading ? 'Verifying…' : 'Verify email'}
            </Button>

            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', resendLoading && 'animate-spin')}
              />
              {resendLoading ? 'Sending…' : 'Resend code'}
            </Button>

            <Link
              to="/login"
              className="flex min-h-[44px] w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(VerifyEmail);