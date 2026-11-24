import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

/**
 * Resolve the public root according to the current session.
 * Signed-in users should return to their workspace, not the marketing site.
 */
const HomeRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Checking your session..." />;
  }

  if (isAuthenticated && !user) {
    return (
      <Navigate
        to="/login"
        state={{ message: 'We couldn’t restore your account details. Sign in again to continue.' }}
        replace
      />
    );
  }

  if (isAuthenticated && user) {
    return (
      <Navigate
        to={user.onboarded ? '/dashboard' : '/onboarding'}
        replace
      />
    );
  }

  return children;
};

HomeRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HomeRoute;
