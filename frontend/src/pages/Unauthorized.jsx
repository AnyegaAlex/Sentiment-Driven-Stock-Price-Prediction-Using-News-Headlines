import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  const location = useLocation();
  const { requiredTiers, userTier, message } = location.state || {};

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-black px-4">
      <div className="flex items-center gap-3 text-gray-400 mb-4">
        <Shield className="h-12 w-12" />
        <span className="text-4xl font-bold text-white">403</span>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">
        Access Denied
      </h1>
      <p className="text-gray-400 max-w-md mb-2">
        {message || "You don't have permission to access this page."}
      </p>
      {requiredTiers && (
        <p className="text-sm text-gray-500 mb-6">
          Requires: <span className="font-semibold text-gray-300">{requiredTiers.join(' or ')}</span>
          {' • '}You have: <span className="font-semibold text-gray-300">{userTier || 'free'}</span>
        </p>
      )}
      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Link>
        <Link
          to="/settings#upgrade"
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-white text-black rounded-lg hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Upgrade Plan
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;