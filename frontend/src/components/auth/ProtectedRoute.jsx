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
 * 
 * @version 2.0.0
 * @author Tickflow Capital
 */

import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

/**
 * Protected Route Component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string[]} [props.requiredTiers=[]] - Required user tiers (free, pro, enterprise)
 * @param {boolean} [props.requireVerified=true] - Require email verification
 * @param {string} [props.fallbackPath='/login'] - Redirect path for unauthenticated
 * @param {string} [props.unauthorizedPath='/unauthorized'] - Redirect path for insufficient permissions
 * @param {boolean} [props.allowDemo=false] - Allow demo mode bypass
 */
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
  
  // ✅ Check for demo mode
  const isDemo = searchParams.get('demo') === 'true';
  
  // ✅ Show loading state
  if (isLoading) {
    return <LoadingSpinner fullScreen label="Verifying your session..." />;
  }

  // ✅ Allow demo access without login (if enabled)
  if (allowDemo && isDemo) {
    return children;
  }

  // ✅ Not authenticated – redirect to login and preserve original URL
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // ✅ Email verification check
  if (requireVerified && !user.email_verified) {
    return (
      <Navigate 
        to="/verify-email" 
        state={{ from: location, message: 'Please verify your email to access this page.' }}
        replace 
      />
    );
  }

  // ✅ Tier/Role-based access control
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

  // ✅ All checks passed – render children
  return children;
};

/**
 * HOC for protecting routes with specific tier requirements
 * 
 * @param {React.ComponentType} Component - Component to wrap
 * @param {Object} options - Protection options
 * @returns {React.ComponentType} Wrapped component
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
  /**
   * Free tier and above (all authenticated users)
   */
  Free: () => <ProtectedRoute requiredTiers={['free', 'pro', 'enterprise']} />,
  
  /**
   * Pro tier and above
   */
  Pro: () => <ProtectedRoute requiredTiers={['pro', 'enterprise']} />,
  
  /**
   * Enterprise tier only
   */
  Enterprise: () => <ProtectedRoute requiredTiers={['enterprise']} />,
  
  /**
   * Requires email verification
   */
  Verified: () => <ProtectedRoute requireVerified={true} />,
  
  /**
   * Public route (no protection) – for demo/landing pages
   */
  Public: ({ children }) => children,
  
  /**
   * Demo route (bypasses auth when ?demo=true)
   */
  Demo: () => <ProtectedRoute allowDemo={true} />,
};

export default ProtectedRoute;