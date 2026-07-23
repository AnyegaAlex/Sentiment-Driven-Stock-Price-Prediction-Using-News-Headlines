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

  // If already verified, redirect
  useEffect(() => {
    if (isAuthenticated && authUser?.email_verified) {
      navigate(authUser.onboarded ? '/dashboard' : '/onboarding', { replace: true });
    }
  }, [isAuthenticated, authUser, navigate]);

  // Get email from URL
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, [searchParams]);

  // Verify with token
  const verifyWithToken = useCallback(async (token, uid) => {
    try {
      const response = await apiClient.get(`/auth/verify-email/`, {
        params: { token, uid }
      });
      
      const { access, refresh, user } = response.data?.data || response.data;
      
      if (user) {
        const updatedUser = { ...user, email_verified: true };
        if (access && refresh) {
          localStorage.setItem('accessToken', access);
          localStorage.setItem('refreshToken', refresh);
        }
        const freshUser = await refreshUser();
        const finalUser = freshUser || updatedUser;
        
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        
        setTimeout(() => {
          if (finalUser.onboarded) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/onboarding', { replace: true });
          }
        }, 1000);
      } else {
        setStatus('error');
        setMessage('Verification failed. No user data returned.');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 
                       error.response?.data?.message ||
                       'Verification failed. The link may be invalid or expired.';
      
      if (errorMsg.includes('already verified') && authUser) {
        await refreshUser();
        if (authUser.onboarded) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
        return;
      }
      
      setStatus('error');
      setMessage(errorMsg);
    }
  }, [refreshUser, navigate, authUser]);

  // Verify with code (manual fallback)
  const verifyWithCode = useCallback(async () => {
    if (!code || code.length !== 6) {
      setMessage('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await apiClient.post('/auth/verify-email/', { code });
      const { user } = response.data?.data || response.data;
      
      if (user) {
        await refreshUser();
        setStatus('success');
        setMessage('Email verified successfully!');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      } else {
        setStatus('error');
        setMessage('Verification failed. No user data returned.');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Invalid verification code. Please try again.';
      if (errorMsg.includes('already verified')) {
        await refreshUser();
        if (authUser?.onboarded) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
        return;
      }
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [code, refreshUser, navigate, authUser]);

  // Resend verification email
  const handleResend = useCallback(async () => {
    setResendLoading(true);
    setMessage('');
    try {
      await apiClient.post('/auth/resend-verification/', { email });
      setMessage('A new verification email has been sent. Please check your inbox.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  // Check token on mount
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

  // ---- Render states ----

  // Loading state
  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8 space-y-4">
            <LoadingSpinner size="lg" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Verifying your email…
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we confirm your email address.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Email Verified! ✅
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{message}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Redirecting to {authUser?.onboarded ? 'dashboard' : 'onboarding'}…
            </p>
            <Link to={authUser?.onboarded ? '/dashboard' : '/onboarding'}>
              <Button className="w-full">
                {authUser?.onboarded ? 'Go to Dashboard' : 'Continue to Onboarding'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Verification Failed
            </h2>
            <Alert variant="destructive" className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {email && (
                <Button
                  variant="outline"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="w-full"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", resendLoading && "animate-spin")} />
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </Button>
              )}
              <Link to="/login">
                <Button variant="outline" className="w-full">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            Enter Verification Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Enter the 6-digit verification code from your email.
          </p>

          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-lg font-mono tracking-widest"
              disabled={loading}
            />
          </div>

          {message && (
            <Alert variant={message.includes('sent') ? 'default' : 'destructive'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={verifyWithCode}
              disabled={loading || code.length !== 6}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </Button>

            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", resendLoading && "animate-spin")} />
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </Button>

            <Link to="/login">
              <Button variant="ghost" className="w-full">
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