// pages/Signup.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';
import { Radar } from 'lucide-react';

const Signup = () => {
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

        {/* Form */}
        <div className="px-6 pb-8">
          <SignupForm />

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

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
              Your data is encrypted and secure. No credit card required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;