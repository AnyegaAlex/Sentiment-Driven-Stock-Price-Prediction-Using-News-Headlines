import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const uid = searchParams.get('uid');

    if (!token || !uid) {
      setStatus('error');
      setMessage('Missing verification token or user ID.');
      return;
    }

    api
      .get(`/auth/verify-email/?token=${token}&uid=${uid}`)
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified successfully. You can now log in.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(
          error.response?.data?.error ||
            'Verification failed. The link may be invalid or expired.'
        );
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'verifying' && (
            <>
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 dark:text-gray-400">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-green-600 dark:text-green-400 text-lg font-semibold">
                ✓ Verified
              </div>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
              <Link to="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-red-600 dark:text-red-400 text-lg font-semibold">
                Verification Failed
              </div>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;