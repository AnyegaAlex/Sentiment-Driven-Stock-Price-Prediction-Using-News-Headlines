// pages/Signup.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import TfcLogo from '@/assets/Primary Icon White.svg'; 

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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-black px-4 py-12"
      role="main"
      aria-labelledby="signup-title"
    >
      <div className="w-full max-w-md bg-black transition-all duration-300">
        {/* ============================================================
            HEADER – Logo + Brand + Subtitle + Heading
            ============================================================ */}
        <div className="space-y-3 text-center pt-8 pb-4">
          <div className="flex flex-col items-center">
            <img
              src={TfcLogo}
              alt="TFC"
              className="h-14 w-14 mb-2 opacity-80"
            />
            {/* Brand name – now smaller (text-lg semibold) */}
            <span className="text-lg font-semibold text-white tracking-tight">
              Tickflow Intelligence
            </span>
            {/* Subtitle – very small */}
            <span className="text-[10px] text-gray-500 mt-0.5 tracking-wide">
              Hybrid LSTM + FinBERT Stock Intelligence
            </span>
          </div>
          {/* Create Account – the main heading (largest) */}
          <h1
            id="signup-title"
            className="text-2xl font-bold text-white tracking-tight mt-3"
          >
            Create Account
          </h1>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Get started with LSTM + FinBERT predictions and market insights today.
          </p>
        </div>

        {/* ============================================================
            FORM CONTAINER
            ============================================================ */}
        <div className="px-6 pb-8">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4 border-red-400 bg-red-400/10 text-red-400">
              <AlertTitle className="text-white">Registration Failed</AlertTitle>
              <AlertDescription className="mt-1 text-gray-300">
                {error}
                <button
                  onClick={handleRetry}
                  className="mt-2 text-sm font-medium text-red-400 hover:text-red-300 underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Try Again
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* Success State */}
          {status === 'success' ? (
            <Card className="p-6 text-center border border-green-400 bg-green-400/10">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-green-400/20 flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Account Created!
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                  A verification email has been sent to{' '}
                  <span className="font-medium text-white">{registeredEmail}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Redirecting to verification page...
                </p>
                <div className="mt-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                </div>
                <Link
                  to="/verify-email"
                  state={{ email: registeredEmail }}
                  className="mt-4 text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Skip wait, verify now
                </Link>
              </div>
            </Card>
          ) : (
            <>
              {/* Signup Form – header removed in the component */}
              <SignupForm
                onSuccess={handleSuccess}
                onError={handleError}
                isLoading={status === 'submitting'}
              />

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-white hover:text-gray-300 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Trust Badge */}
              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-[10px] text-center text-gray-500">
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