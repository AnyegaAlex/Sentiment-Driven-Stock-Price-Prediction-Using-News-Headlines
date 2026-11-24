import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useErrorHandler } from '@/utils/errorHandler';
import { getActionErrorMessage } from '@/utils/errorHandler';
import TfcLogo from '@/assets/Primary Icon White.svg';

const BLOCKED_RETURN_PATHS = [
  '/login',
  '/signup',
  '/verify-email',
  '/check-email',
  '/forgot-password',
  '/reset-password',
  '/resend-verification',
];

const getPostLoginDestination = (user, from) => {
  if (!user?.email_verified) return '/verify-email';
  if (!user?.onboarded) return '/onboarding';

  if (from && typeof from === 'object') {
    const pathname = from.pathname || '';
    const isAuthPath = BLOCKED_RETURN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + '/')
    );
    const isSafePath = pathname.startsWith('/') && !pathname.startsWith('//') && !isAuthPath;

    if (isSafePath && pathname !== '/') {
      return pathname + (from.search || '') + (from.hash || '');
    }
  }

  return '/dashboard';
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { handleError, clearError } = useErrorHandler();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => location.state?.message || '');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const demoUsername = import.meta.env.VITE_DEMO_USERNAME;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
  const demoEnabled = Boolean(demoUsername && demoPassword);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getPostLoginDestination(user, location.state?.from), { replace: true });
    }
  }, [isAuthenticated, user, location.state?.from, navigate]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError('');
    clearError();
    setNeedsVerification(false);
  };

  const performLogin = async (credentials) => {
    if (!credentials.username.trim() || !credentials.password) {
      setError('Enter your username or email address and password to continue.');
      return;
    }

    setLoading(true);
    setError('');
    setNeedsVerification(false);

    try {
      const result = await login(
        credentials.username.trim(),
        credentials.password,
        Boolean(credentials.rememberMe)
      );

      if (!result.success) {
        throw Object.assign(new Error(result.error || 'We couldn’t sign you in.'), {
          code: result.code,
          details: result.details,
          retryAfter: result.retryAfter,
        });
      }

      navigate(
        getPostLoginDestination(result.user, location.state?.from),
        { replace: true }
      );
    } catch (requestError) {
      handleError(requestError, { area: 'login' });

      const status = Number(requestError?.code);
      let message = getActionErrorMessage(
        requestError,
        'We couldn’t sign you in right now. Please try again.'
      );

      if (status === 403 && /verif/i.test(requestError.message || '')) {
        message = 'Your email address still needs to be verified. Check your inbox or request a new verification email.';
        setNeedsVerification(true);
        setVerificationEmail(
          credentials.username.includes('@')
            ? credentials.username.trim()
            : requestError.details?.email || ''
        );
      } else if (status === 401) {
        message = 'The username/email or password is incorrect. Check your details and try again.';
      } else if (status === 429) {
        const retryAfter = Number(requestError.retryAfter);
        message = retryAfter > 0
          ? 'Too many sign-in attempts. Try again in ' + retryAfter + ' seconds.'
          : 'Too many sign-in attempts. Wait a moment, then try again.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    performLogin(formData);
  };

  const handleDemoLogin = () => {
    performLogin({
      username: demoUsername,
      password: demoPassword,
      rememberMe: false,
    });
  };

  if (authLoading || (isAuthenticated && user)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-hidden="true" />
        <p className="text-sm text-gray-400">Checking your account…</p>
      </div>
    );
  }

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center bg-black px-4 py-12" aria-labelledby="login-title">
      <div className="space-y-3 pb-6 text-center">
        <img src={TfcLogo} alt="" className="mx-auto mb-2 h-14 w-14 opacity-80" />
        <p className="text-lg font-semibold tracking-tight text-white">TickFlow Intelligence</p>
        <p className="text-xs tracking-wide text-gray-500">Stock research workspace</p>
        <h1 id="login-title" className="pt-3 text-2xl font-bold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="mx-auto max-w-sm text-sm text-gray-400">
          Sign in to return to your research workspace.
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-md border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <div>
              <p>{error}</p>
              {needsVerification && (
                <Link
                  to="/resend-verification"
                  state={{ email: verificationEmail }}
                  className="mt-2 inline-flex min-h-[36px] items-center font-medium text-white underline underline-offset-4 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                >
                  Resend verification email
                </Link>
              )}
            </div>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-300">
              Username or email
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              maxLength={254}
              className="min-h-[46px] w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Enter your username or email"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-[46px] w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <label htmlFor="rememberMe" className="flex min-h-[40px] items-center gap-2 text-sm text-gray-400">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-white focus:ring-gray-500"
              checked={formData.rememberMe}
              onChange={handleChange}
              disabled={loading}
            />
            Keep me signed in on this device
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-[46px] w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : 'Sign in'}
          </button>
        </form>

        {demoEnabled && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gray-900 px-3 text-gray-500">Or</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="group flex min-h-[44px] w-full items-center justify-center rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Try the demo account
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </>
        )}

        <div className="mt-6 border-t border-gray-800 pt-5 text-center">
          <p className="text-sm text-gray-400">
            Don’t have an account?{' '}
            <Link to="/signup" className="font-medium text-white hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500">
              Create one
            </Link>
          </p>
          <p className="mt-4 text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="underline underline-offset-2 hover:text-white">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-white">Privacy Policy</Link>.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Use a unique password and sign out when using a shared device.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Login;
