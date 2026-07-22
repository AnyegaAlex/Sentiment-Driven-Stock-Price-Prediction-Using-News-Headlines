import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  const location = useLocation();
  const { requiredTiers, userTier, message } = location.state || {};

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="flex items-center gap-3 text-yellow-500 dark:text-yellow-400 mb-4">
        <Shield className="h-12 w-12" />
        <span className="text-4xl font-bold">403</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Access Denied
      </h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-2">
        {message || "You don't have permission to access this page."}
      </p>
      {requiredTiers && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          Requires: <span className="font-semibold">{requiredTiers.join(' or ')}</span>
          {' • '}You have: <span className="font-semibold">{userTier || 'free'}</span>
        </p>
      )}
      <div className="flex gap-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Link>
        <Link
          to="/settings#upgrade"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upgrade Plan
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;