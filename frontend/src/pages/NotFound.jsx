/**
 * 404 Not Found Page
 * 
 * Features:
 * - Clean, branded 404 page
 * - Navigation back to home/dashboard
 * - Dark mode support
 * - Accessibility
 * 
 * @version 1.0.0
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, AlertCircle, Radar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      {/* Icon */}
      <div className="mb-6 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl" />
          <div className="relative p-4 rounded-full bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <AlertCircle className="h-16 w-16 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Error Code */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-7xl font-extrabold text-gray-900 dark:text-white">4</span>
        <span className="text-7xl font-extrabold text-blue-600 dark:text-blue-400">0</span>
        <span className="text-7xl font-extrabold text-gray-900 dark:text-white">4</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Page Not Found
      </h1>

      {/* Description */}
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved. 
        Let's get you back on track.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {isAuthenticated ? (
          <Link
            to="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
        ) : (
          <Link
            to="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        )}
        <button
          onClick={handleGoBack}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>

      {/* Help Section */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 w-full max-w-sm">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          If you believe this is an error, please contact us at{' '}
          <a href="mailto:support@tickflow.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            support@tickflow.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotFound;