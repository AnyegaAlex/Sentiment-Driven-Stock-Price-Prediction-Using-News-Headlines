// pages/VerifyEmail.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '@/services/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CheckCircle, AlertCircle, Mail, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
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
});

/**
 * Resolves where to send the user after verification.
 * Priority:
 *   1. Backend-provided `redirect` (explicit contract)
 *   2. Onboarding status from user object
 */
const resolveRedirect = (payload, fallbackUser = null) => {
  if (payload.redirect) return payload.redirect;
  const user = payload.user || fallbackUser;
  if (user?.onboarded) return '/dashboard';
  return '/onboarding';
};

// ============================================================================
// Component
// ============================================================================

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [email, setEmail] = useState('');

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
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // Persist tokens from backend response
  // ---------------------------------------------------------------------------
  const persistTokens = useCallback((access, refresh) => {
    if (!access || !refresh) return false;
    const remember = !!localStorage.getItem('accessToken');
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('accessToken', access);
    storage.setItem('refreshToken', refresh);
    return true;
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

        // Persist tokens so refreshUser() is authenticated
        const tokensPersisted = persistTokens(access, refresh);
        console.info('[VerifyEmail] Tokens persisted:', {
          tokensPersisted,
          userId: user.id,
          emailVerified: user.email_verified,
        });

        // Refresh user context (returns null on failure)
        const freshUser = await refreshUser();
        const finalUser = freshUser || { ...user, email_verified: true };

        // Compute redirect from backend's explicit hint, not just onboarded
        const redirectUrl = resolveRedirect(payload, finalUser);

        setStatus('success');
        setMessage('Your email has been verified successfully!');

        setTimeout(() => {
          navigate(redirectUrl, { replace: true });
        }, 1000);
      } catch (err) {
        const e = normalizeError(err);
        console.warn('[VerifyEmail] Token verification failed:', e);

        // Handle "already verified" idempotently
        if (e.message.toLowerCase().includes('already verified') && authUser) {
          try {
            await refreshUser();
          } catch {
            // Ignore — we'll still redirect based on local state
          }
          navigate(authUser.onboarded ? '/dashboard' : '/onboarding', { replace: true });
          return;
        }

        setStatus('error');
        setMessage(e.message || 'Verification failed. The link may be invalid or expired.');
      }
    },
    [persistTokens, refreshUser, navigate, authUser]
  );

  // ---------------------------------------------------------------------------
  // Verify with code (manual fallback)
  // ---------------------------------------------------------------------------
  const verifyWithCode = useCallback(async () => {
    if (!code || code.length !== 6) {
      setMessage('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await apiClient.post('/auth/verify-email/', { code });
      const payload = extract(response);
      const { access, refresh, user } = payload;

      if (!user) {
        setStatus('error');
        setMessage('Verification failed. No user data returned.');
        return;
      }

      // Persist tokens on code path too — backend returns JWTs here
      const tokensPersisted = persistTokens(access, refresh);
      console.info('[VerifyEmail] Code verification tokens persisted:', {
        tokensPersisted,
        userId: user.id,
      });

      // Refresh user context
      const freshUser = await refreshUser();
      const finalUser = freshUser || { ...user, email_verified: true };

      const redirectUrl = resolveRedirect(payload, finalUser);

      setStatus('success');
      setMessage('Email verified successfully!');

      setTimeout(() => {
        navigate(redirectUrl, { replace: true });
      }, 1500);
    } catch (err) {
      const e = normalizeError(err);
      console.warn('[VerifyEmail] Code verification failed:', e);

      // "Already verified" is not an error — navigate through
      if (e.message.toLowerCase().includes('already verified')) {
        try {
          await refreshUser();
        } catch {}
        navigate(authUser?.onboarded ? '/dashboard' : '/onboarding', { replace: true });
        return;
      }

      setStatus('error');
      setMessage(e.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [code, persistTokens, refreshUser, navigate, authUser]);

  // ---------------------------------------------------------------------------
  // Resend verification email
  // ---------------------------------------------------------------------------
  const handleResend = useCallback(async () => {
    setResendLoading(true);
    setMessage('');

    try {
      await apiClient.post('/auth/resend-verification/', email ? { email } : {});
      setMessage('A new verification email has been sent. Please check your inbox.');
    } catch (err) {
      const e = normalizeError(err);
      console.warn('[VerifyEmail] Resend failed:', e);
      setMessage(e.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  // ---------------------------------------------------------------------------
  // Auto-verify on mount if token + uid present
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const token = searchParams.get('token');
    const uid = searchParams.get('uid');

    if (!token || !uid) {
      setStatus('manual');
      setMessage('Please enter the verification code from your email, or request a new link.');
      return;
    }

    verifyWithToken(token, uid);
  }, [searchParams, verifyWithToken]);

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
    const targetLabel = authUser?.onboarded ? 'dashboard' : 'onboarding';
    const targetPath = authUser?.onboarded ? '/dashboard' : '/onboarding';

    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <Card className="w-full max-w-md border border-gray-800 bg-gray-900">
          <CardContent className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-green-400/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Email Verified!</h2>
            <p className="text-gray-400">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to {targetLabel}…</p>
            <Link to={targetPath}>
              <Button className="w-full min-h-[44px] bg-white text-black hover:bg-gray-200">
                {authUser?.onboarded ? 'Go to Dashboard' : 'Continue to Onboarding'}
              </Button>
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
                  disabled={resendLoading}
                  className="w-full min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <RefreshCw
                    className={cn('h-4 w-4 mr-2', resendLoading && 'animate-spin')}
                  />
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </Button>
              )}
              <Link to="/login">
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  Back to Login
                </Button>
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
            <img src={TfcLogo} alt="TFC" className="h-14 w-14 mb-2 opacity-80" />
            <span className="text-lg font-semibold text-white tracking-tight">
              Tickflow Intelligence
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5 tracking-wide">
              Hybrid LSTM + FinBERT Stock Intelligence
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
            <Label htmlFor="code" className="text-gray-300">
              Verification Code
            </Label>
            <Input
              id="code"
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="min-h-[44px] text-center text-lg font-mono tracking-widest bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500"
              disabled={loading}
            />
          </div>

          {message && (
            <Alert
              className={
                message.includes('sent')
                  ? 'border-green-400 bg-green-400/10 text-green-400'
                  : 'border-red-400 bg-red-400/10 text-red-400'
              }
            >
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={verifyWithCode}
              disabled={loading || code.length !== 6}
              className="w-full min-h-[44px] bg-white text-black hover:bg-gray-200"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
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
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </Button>

            <Link to="/login">
              <Button
                variant="ghost"
                className="w-full min-h-[44px] text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(VerifyEmail);