import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  if (loading) {
    return <LoadingSpinner />;
  }

  // ✅ Allow demo access without login
  if (isDemo) {
    return children;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};