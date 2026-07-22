// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radar, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useErrorHandler } from '@/utils/errorHandler';

/**
 * Production-Ready Login Page
 * 
 * Features:
 * - Clean, accessible UI with dark mode support
 * - Proper auth hook integration
 * - Comprehensive error handling
 * - Loading states
 * - Remember me functionality
 * - Demo mode
 * - Security/trust signals
 * - Redirect for authenticated users
 */
const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { error: authError, handleError, clearError } = useErrorHandler();
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      if (user.onboarded) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear errors when user types
    if (error) setError(null);
    if (authError) clearError();
  };

  // Handle login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // ✅ Use the auth hook's login method
      const result = await login(
        formData.username.trim(),
        formData.password,
        formData.rememberMe
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Success
      console.info('[Login] Successful', {
        userId: result.user?.id,
        username: result.user?.username,
        rememberMe: formData.rememberMe,
        timestamp: new Date().toISOString(),
      });

      // Redirect handled by useEffect
    } catch (err) {
      console.error('[Login Error]', err);
      
      // User-friendly error messages
      let errorMessage = err.message || 'Login failed. Please try again.';
      
      if (err.code === 403 && errorMessage.includes('verify your email')) {
        errorMessage = 'Please verify your email before logging in. Check your inbox for the verification link.';
        setSuccessMessage('Verification email sent. Please check your inbox.');
      } else if (err.code === 429) {
        const retryAfter = err.retryAfter || 60;
        errorMessage = `Too many login attempts. Please try again in ${retryAfter} seconds.`;
      } else if (err.code === 401) {
        errorMessage = 'Invalid username or password. Please try again.';
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      setError(errorMessage);
      handleError(err, { context: 'login' });
    } finally {
      setLoading(false);
    }
  };

  // Handle demo login
  const handleDemoLogin = () => {
    setIsDemo(true);
    // Pre-fill demo credentials
    setFormData({
      username: import.meta.env.VITE_DEMO_USERNAME || 'demo@tickflow.com',
      password: import.meta.env.VITE_DEMO_PASSWORD || 'demo123',
      rememberMe: false,
    });
    // Auto-submit after a brief delay
    setTimeout(() => {
      const form = document.getElementById('login-form');
      if (form) form.requestSubmit();
    }, 300);
  };

  // Loading state
  if (authLoading) {
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
      aria-labelledby="login-title"
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
            id="login-title"
            className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
          >
            Welcome Back
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
            Sign in to access your financial intelligence dashboard and market insights.
          </p>
        </div>

        {/* Form Container */}
        <div className="px-6 pb-8">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {successMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form id="login-form" className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Username or Email
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your username or email"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={loading || isDemo}
                  aria-label="Username or email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading || isDemo}
                  aria-label="Password"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={loading}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Remember me
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isDemo}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-transparent text-gray-400 dark:text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          {/* Demo Button */}
          <button
            onClick={handleDemoLogin}
            disabled={loading || isDemo}
            className="flex items-center justify-center w-full py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Try Demo Dashboard</span>
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Footer Links */}
          <div className="mt-6 space-y-2 text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <span>Don't have an account?</span>
              <Link
                to="/signup"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
              >
                Create one now
              </Link>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
              By signing in, you agree to our{' '}
              <Link to="/terms" className="hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            </p>
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-1">
              Secured with industry‑standard encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;