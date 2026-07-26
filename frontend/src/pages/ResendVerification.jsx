/**
 * Production-Ready Resend Verification Page
 * 
 * Features:
 * - Resend verification email
 * - Email input with validation
 * - Rate limit handling
 * - Success/error states
 * - Dark mode only
 * - Accessibility
 * 
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radar, Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import AuthService from '@/services/authService';

const ResendVerification = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  // Validate email
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);

    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await AuthService.resendVerification(email);
      
      if (result.success) {
        setSuccess(true);
        setEmail('');
        console.info('[ResendVerification] Verification email sent to:', email);
      } else {
        setError(result.error || 'Failed to send verification email. Please try again.');
      }
    } catch (err) {
      console.error('[ResendVerification] Error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-black transition-all duration-300">
      {/* Header */}
      <div className="space-y-3 text-center pt-8 pb-4">
        <div className="flex items-center justify-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-gray-800">
            <Radar className="h-8 w-8 text-gray-400" strokeWidth={1.8} />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            Tickflow Intelligence
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Resend Verification
        </h1>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Enter your email address to receive a new verification link.
        </p>
      </div>

      {/* Form */}
      <div className="px-6 pb-8">
        {/* Success Message */}
        {success && (
          <div className="mb-4 rounded-md border border-green-400 bg-green-400/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-400">
                  Verification email sent!
                </p>
                <p className="text-sm text-green-400/80 mt-1">
                  Please check your inbox and click the verification link to activate your account.
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    Go to Login
                  </button>
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setEmail('');
                    }}
                    className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    Send Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-md border border-red-400 bg-red-400/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-400">
                {error}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 border border-gray-800 rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                onBlur={() => setTouched(true)}
                disabled={loading || success}
                aria-describedby={touched && error ? 'email-error' : undefined}
              />
            </div>
            {touched && !email && (
              <p id="email-error" className="mt-1 text-sm text-red-400">
                Email is required
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full min-h-[44px] flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Resend Verification
              </>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>

        {/* Trust Badge */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-[10px] text-center text-gray-500">
            If you don't receive the email within 5 minutes, check your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResendVerification;