import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import AuthService from '@/services/authService';
import { getActionErrorMessage } from '@/utils/errorHandler';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const uid = searchParams.get('uid');
  const hasResetLink = Boolean(token && uid);

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(
    hasResetLink ? '' : 'This password reset link is incomplete. Request a new one to continue.'
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!hasResetLink) {
      setError('This password reset link is incomplete. Request a new one to continue.');
      return;
    }
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }
    if (password !== password2) {
      setError('The passwords do not match. Check both fields and try again.');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.confirmPasswordReset(token, uid, password, password2);
      if (!result.success) {
        const message = result.code === 400 && /invalid or expired token/i.test(result.error || '')
          ? 'This reset link has expired or is no longer valid. Request a new one to continue.'
          : getActionErrorMessage(
              { code: result.code, message: result.error, details: result.details },
              'We couldn’t reset your password. Request a new link and try again.'
            );
        setError(message);
        return;
      }

      setSuccess(true);
      setPassword('');
      setPassword2('');
    } catch (requestError) {
      setError(getActionErrorMessage(
        requestError,
        'We couldn’t reset your password. Request a new link and try again.'
      ));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-400/10">
          <CheckCircle className="h-7 w-7 text-green-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Password updated</h1>
        <p className="mt-2 text-sm text-gray-400">
          Your password has been changed. Sign in with your new password to return to TickFlow.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Go to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
          <KeyRound className="h-7 w-7 text-gray-300" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Choose a new password</h1>
        <p className="mt-2 text-sm text-gray-400">
          Use at least 8 characters. You’ll use this password the next time you sign in.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {hasResetLink ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-300">
              New password
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="min-h-[46px] w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-white placeholder:text-gray-500 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-300">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password2}
              onChange={(event) => setPassword2(event.target.value)}
              disabled={loading}
              className="min-h-[46px] w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-white placeholder:text-gray-500 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !password2}
            className="flex min-h-[46px] w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            {loading ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      ) : (
        <Link
          to="/forgot-password"
          className="flex min-h-[46px] w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Request a new reset link
        </Link>
      )}

      <div className="mt-5 text-center">
        <Link
          to="/login"
          className="text-sm text-gray-400 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          Back to sign in
        </Link>
      </div>
    </section>
  );
};

export default ResetPassword;
