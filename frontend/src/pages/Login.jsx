// pages/Login.jsx
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { Radar, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      if (user.onboarded) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  }, [user, navigate]);

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

        {/* Form */}
        <div className="px-6 pb-8">
          <LoginForm />

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
          <Link
            to="/dashboard?demo=true"
            className="flex items-center justify-center w-full py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <span>Try Demo Dashboard</span>
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Link>

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
            <Link
              to="/reset-password"
              className="inline-block text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Forgot password?
            </Link>
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