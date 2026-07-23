// components/auth/ProtectedRoute.jsx
/**
 * Production-Ready Protected Route Component
 * 
 * Features:
 * - Authentication check with loading state
 * - Redirect to login on unauthenticated
 * - Preserve original URL for redirect after login
 * - Email verification check
 * - Role/tier-based access control
 * - Demo mode bypass
 * - Customizable fallback paths
 * - Skip refresh for onboarded users (prevents redirect loops)
 * 
 * @version 3.0.0
 * @author Tickflow Capital
 */

import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const ProtectedRoute = ({
  children,
  requiredTiers = [],
  requireVerified = true,
  fallbackPath = '/login',
  unauthorizedPath = '/unauthorized',
  allowDemo = true,
}) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth();
  // ✅ REMOVED: refreshUser, hasRefreshed, useEffect

  const isDemo = searchParams.get('demo') === 'true';

  // ---- Loading state ----
  if (isLoading) {
    return <LoadingSpinner fullScreen label="Verifying your session..." />;
  }

  // ---- Demo mode ----
  if (allowDemo && isDemo) {
    return children;
  }

  // ---- Not authenticated ----
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // ---- ✅ If user is onboarded, skip verification ----
  if (user.onboarded) {
    return children;
  }

  // ---- Email verification check (only for non-onboarded users) ----
  if (requireVerified && !user.email_verified) {
    return (
      <Navigate 
        to="/verify-email" 
        state={{ from: location, message: 'Please verify your email to access this page.' }}
        replace 
      />
    );
  }

  // ---- Tier/Role-based access control ----
  if (requiredTiers.length > 0) {
    const userTier = user.tier || 'free';
    const hasRequiredTier = requiredTiers.includes(userTier);
    
    if (!hasRequiredTier) {
      return (
        <Navigate 
          to={unauthorizedPath} 
          state={{ 
            from: location,
            requiredTiers,
            userTier,
            message: `This page requires ${requiredTiers.join(' or ')} access. You have ${userTier}.`,
          }}
          replace 
        />
      );
    }
  }

  return children;
};

/**
 * HOC for protecting routes with specific tier requirements
 */
export const withProtection = (Component, options = {}) => {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

/**
 * Route protection presets for common use cases
 */
export const RouteProtection = {
  Free: () => <ProtectedRoute requiredTiers={['free', 'pro', 'enterprise']} />,
  Pro: () => <ProtectedRoute requiredTiers={['pro', 'enterprise']} />,
  Enterprise: () => <ProtectedRoute requiredTiers={['enterprise']} />,
  Verified: () => <ProtectedRoute requireVerified={true} />,
  Public: ({ children }) => children,
  Demo: () => <ProtectedRoute allowDemo={true} />,
};

export default ProtectedRoute;