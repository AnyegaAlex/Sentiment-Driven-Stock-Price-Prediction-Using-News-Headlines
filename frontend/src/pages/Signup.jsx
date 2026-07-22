// pages/Signup.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';
import { Radar, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const Signup = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle successful registration
  const handleSuccess = (email) => {
    setRegisteredEmail(email);
    setStatus('success');
    // Redirect to verification page after 2.5 seconds
    setTimeout(() => {
      navigate('/verify-email', { 
        state: { 
          email: email,
          message: 'Please check your email for the verification link.'
        } 
      });
    }, 2500);
  };

  // Handle registration error
  const handleError = (err) => {
    setStatus('error');
    setError(err.message || 'Registration failed. Please try again.');
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setStatus('idle');
      setError(null);
    }, 5000);
  };

  // Handle retry
  const handleRetry = () => {
    setStatus('idle');
    setError(null);
  };

  // If user is authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-12"
      role="main"
      aria-labelledby="signup-title"
    >
      <div className="w-full max-w-md backdrop-blur-sm bg-transparent transition-all duration-300">
        {/* Header */}
        <div className="space-y-3 text-center pt-8 pb-4">
          <div className="flex items-center justify-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20">
              <Radar className="h-8 w-8 text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Tickflow Sentiment
            </span>
          </div>
          <h1
            id="signup-title"
            className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
          >
            Create Account
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
            Get started with AI-powered financial intelligence today.
          </p>
        </div>

        {/* Form Container */}
        <div className="px-6 pb-8">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Registration Failed</AlertTitle>
              <AlertDescription className="mt-1">
                {error}
                <button
                  onClick={handleRetry}
                  className="mt-2 text-sm font-medium underline hover:no-underline"
                >
                  Try Again
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Success State */}
          {status === 'success' ? (
            <Card className="p-6 text-center border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Account Created! 🎉
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  A verification email has been sent to{' '}
                  <span className="font-medium">{registeredEmail}</span>
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Redirecting to verification page...
                </p>
                <div className="mt-4">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                </div>
                <Link
                  to="/verify-email"
                  state={{ email: registeredEmail }}
                  className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Skip wait, verify now
                </Link>
              </div>
            </Card>
          ) : (
            <>
              {/* Signup Form */}
              <SignupForm
                onSuccess={handleSuccess}
                onError={handleError}
                isLoading={status === 'submitting'}
              />

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Trust Badge */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
                  Your data is encrypted and secure. No credit card required.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;