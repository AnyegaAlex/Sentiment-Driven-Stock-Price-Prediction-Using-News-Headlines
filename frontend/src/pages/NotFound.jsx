import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const hasWorkspace = isAuthenticated && Boolean(user);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(hasWorkspace ? '/dashboard' : '/', { replace: true });
  };

  return (
    <main
      className="flex min-h-[60vh] flex-col items-center justify-center bg-black px-4 py-12 text-center"
      aria-labelledby="not-found-title"
    >
      <div className="mb-6 flex items-center justify-center rounded-full border border-gray-700 bg-gray-900 p-4">
        <AlertCircle className="h-12 w-12 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
      </div>

      <p className="mb-2 text-sm font-medium tracking-widest text-gray-500">ERROR 404</p>
      <h1 id="not-found-title" className="mb-3 text-3xl font-bold text-white">
        This page isn’t available
      </h1>
      <p className="mb-8 max-w-md text-gray-400">
        The address may be outdated, or the page may have moved. Choose where you’d like to go next.
      </p>

      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
        <Link
          to={hasWorkspace ? '/dashboard' : '/'}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-medium text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          {hasWorkspace ? 'Go to dashboard' : 'Go to home'}
        </Link>
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-lg border border-gray-700 px-4 py-3 font-medium text-gray-300 transition-colors hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go back
        </button>
      </div>
    </main>
  );
};

export default NotFound;
