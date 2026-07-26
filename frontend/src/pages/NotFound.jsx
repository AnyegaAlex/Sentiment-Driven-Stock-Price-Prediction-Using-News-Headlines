/**
 * 404 Not Found Page
 * 
 * Features:
 * - Clean, branded 404 page
 * - Navigation back to home/dashboard
 * - Dark mode only
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
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 bg-black">
      {/* Icon */}
      <div className="mb-6 flex items-center justify-center">
        <div className="p-4 rounded-full bg-gray-800 border border-gray-700">
          <AlertCircle className="h-16 w-16 text-gray-400" strokeWidth={1.5} />
        </div>
      </div>

      {/* Error Code */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-7xl font-extrabold text-white">4</span>
        <span className="text-7xl font-extrabold text-gray-400">0</span>
        <span className="text-7xl font-extrabold text-white">4</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-2">
        Page Not Found
      </h1>

      {/* Description */}
      <p className="text-gray-400 max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved. 
        Let's get you back on track.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        {isAuthenticated ? (
          <Link
            to="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
        ) : (
          <Link
            to="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        )}
        <button
          onClick={handleGoBack}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>

      {/* Help Section */}
      <div className="mt-8 pt-6 border-t border-gray-800 w-full max-w-sm">
        <p className="text-xs text-gray-500">
          If you believe this is an error, please contact us at{' '}
          <a 
            href="mailto:support@tickflow.com" 
            className="text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            support@tickflow.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotFound;