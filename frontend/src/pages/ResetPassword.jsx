import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { api } from '@/services/api';
import { AlertCircle, CheckCircle, ArrowLeft, Radar } from 'lucide-react';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'idle' | 'sent' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setErrorMessage('');

    try {
      await api.post('/auth/password-reset/', { email });
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <CardHeader className="text-center pt-8">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              If an account exists with this email, you'll receive a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Didn't receive anything? Check your spam folder or try again.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setStatus(null)}>
              Try Again
            </Button>
            <Link to="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-4">
            <Radar className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="ml-2">{errorMessage}</span>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;