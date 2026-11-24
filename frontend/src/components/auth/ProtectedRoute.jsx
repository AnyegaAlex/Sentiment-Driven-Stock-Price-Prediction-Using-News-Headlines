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
 * - Customizable fallback paths
 * 
 * @version 3.0.0
 * @author Tickflow Capital
 */

import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const ProtectedRoute = ({
  children,
  requiredTiers = [],
  requireVerified = true,
  fallbackPath = '/login',
  unauthorizedPath = '/unauthorized',
}) => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // ---- Loading state ----
  if (isLoading) {
    return <LoadingSpinner fullScreen label="Verifying your session..." />;
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

  // ---- Email verification check ----
  // Onboarding completion must never bypass an explicit verification requirement.
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
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requiredTiers: PropTypes.arrayOf(PropTypes.oneOf(['free', 'pro', 'enterprise'])),
  requireVerified: PropTypes.bool,
  fallbackPath: PropTypes.string,
  unauthorizedPath: PropTypes.string,
};

export default ProtectedRoute;