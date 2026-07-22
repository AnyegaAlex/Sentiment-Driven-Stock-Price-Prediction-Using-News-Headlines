/**
 * Production-Ready Forgot Password Page
 * 
 * Features:
 * - Request password reset email
 * - Email validation
 * - Rate limit handling
 * - Success/error states
 * - Dark mode support
 * - Accessibility
 * 
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radar, Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import AuthService from '@/services/authService';

const ForgotPassword = () => {
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
      const result = await AuthService.requestPasswordReset(email);
      
      if (result.success) {
        setSuccess(true);
        setEmail('');
        console.info('[ForgotPassword] Reset email sent to:', email);
      } else {
        setError(result.error || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      console.error('[ForgotPassword] Error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Reset Password
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {/* Form */}
      <div className="px-6 pb-8">
        {/* Success Message */}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Password reset email sent!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Please check your inbox and follow the instructions to reset your password.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
              <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                Email is required
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>

        {/* Trust Badge */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
            If you don't receive the email within 5 minutes, check your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;