// pages/VerifyEmail.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, setAuthToken } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CheckCircle, XCircle, Radar, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const VerifyEmail = () => {
  const { user, refreshProfile, setUser } = useAuth(); // ✅ add setUser
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  const token = searchParams.get('token');
  const uid = searchParams.get('uid');

  useEffect(() => {
    const verifyWithToken = async () => {
      if (!token || !uid) {
        setStatus('code_required');
        setMessage('Enter the 6‑digit verification code from your email.');
        setShowCodeInput(true);
        return;
      }

      try {
        const response = await api.get(`/auth/verify-email/?token=${token}&uid=${uid}`);
        const { access, refresh, user: userData } = response.data;

        // ✅ Auto‑login: store tokens and set user
        if (access && refresh && userData) {
          localStorage.setItem('accessToken', access);
          localStorage.setItem('refreshToken', refresh);
          setAuthToken(access);
          setUser(userData); // update AuthContext
        }

        setStatus('success');
        setMessage('Email verified! Redirecting to onboarding…');
        setTimeout(() => navigate('/onboarding'), 1500);
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Verification failed. The link may be invalid or expired.';
        setStatus('code_required');
        setMessage(`Token verification failed: ${errorMsg}. You can use the 6‑digit code instead.`);
        setShowCodeInput(true);
      }
    };

    verifyWithToken();
  }, [token, uid, navigate, setUser]);

  const handleCodeVerification = async () => {
    if (code.length !== 6) {
      setMessage('Please enter a valid 6‑digit code.');
      return;
    }
    setIsVerifyingCode(true);
    try {
      const response = await api.post('/auth/verify-email/', { code });
      // ✅ If the code verification also returns tokens (optional), handle them
      const { access, refresh, user: userData } = response.data;
      if (access && refresh && userData) {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        setAuthToken(access);
        setUser(userData);
      } else {
        // If no tokens, just refresh profile (user might already be logged in)
        if (user) await refreshProfile();
      }
      setStatus('success');
      setMessage('Email verified successfully! Redirecting to onboarding…');
      setTimeout(() => navigate('/onboarding'), 1500);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification/');
      setResendMessage('✅ Verification email resent! Check your inbox.');
    } catch (err) {
      setResendMessage(err.response?.data?.message || '❌ Failed to resend.');
    } finally {
      setResending(false);
    }
  };

  const switchToCode = () => {
    setShowCodeInput(true);
    setStatus('code_required');
    setMessage('Enter the 6‑digit verification code from your email.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-white dark:bg-gray-900">
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-4">
            <Radar className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'verifying' && !showCodeInput && (
            <>
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 dark:text-gray-400">Verifying your email…</p>
              <Button variant="ghost" onClick={switchToCode} className="mt-2 text-sm">
                Use verification code instead
              </Button>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
              <div className="text-sm text-gray-500">Redirecting to onboarding…</div>
            </>
          )}

          {(status === 'code_required' || showCodeInput) && (
            <>
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
              <div className="space-y-4">
                <div>
                  <Input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <Button
                  onClick={handleCodeVerification}
                  disabled={isVerifyingCode || code.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isVerifyingCode ? 'Verifying…' : 'Verify Code'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {resending ? 'Sending...' : 'Resend verification email'}
                </Button>
                {resendMessage && (
                  <p className={cn('text-sm', resendMessage.includes('✅') ? 'text-green-600' : 'text-red-600')}>
                    {resendMessage}
                  </p>
                )}
              </div>
            </>
          )}

          {status === 'error' && !showCodeInput && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
              <div className="space-y-3">
                <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
                  Back to Login
                </Button>
                <Button variant="ghost" onClick={handleResend} disabled={resending} className="w-full">
                  {resending ? 'Sending...' : 'Resend verification email'}
                </Button>
                <Button variant="ghost" onClick={switchToCode} className="w-full text-sm">
                  Enter verification code instead
                </Button>
                {resendMessage && (
                  <p className={cn('text-sm', resendMessage.includes('✅') ? 'text-green-600' : 'text-red-600')}>
                    {resendMessage}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
            Need help?{' '}
            <a href="mailto:support@tickflow.com" className="text-blue-600 hover:underline">
              Contact support
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;