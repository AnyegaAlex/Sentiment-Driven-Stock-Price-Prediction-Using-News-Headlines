import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import AuthService from '@/services/authService';
import { getActionErrorMessage } from '@/utils/errorHandler';
import TfcLogo from '@/assets/Primary Icon White.svg';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ResendVerification = () => {
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const result = await AuthService.resendVerification(normalizedEmail);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(getActionErrorMessage(
          {
            code: result.code,
            message: result.error,
            details: result.details,
            retryAfter: result.retryAfter,
          },
          'We couldn’t send a verification email. Please try again.'
        ));
      }
    } catch (requestError) {
      setError(getActionErrorMessage(
        requestError,
        'We couldn’t send a verification email. Please try again.'
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center bg-black px-4 py-12" aria-labelledby="resend-title">
      <div className="mb-6 space-y-3 text-center">
        <img src={TfcLogo} alt="" className="mx-auto h-14 w-14 opacity-80" />
        <p className="text-lg font-semibold tracking-tight text-white">TickFlow Intelligence</p>
        <p className="text-xs tracking-wide text-gray-500">Stock research workspace</p>
        <h1 id="resend-title" className="pt-2 text-2xl font-bold text-white">
          Resend verification email
        </h1>
        <p className="mx-auto max-w-sm text-sm text-gray-400">
          Enter the email address you used to register. If the account still needs verification, we’ll send a new link.
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {success && (
          <div role="status" className="mb-4 rounded-md border border-green-400/40 bg-green-400/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-green-300">Request received</p>
                <p className="mt-1 text-sm text-gray-300">
                  If this address needs verification, a new email will arrive shortly. Check your inbox and spam folder.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setTouched(false);
                    setError('');
                  }}
                  className="mt-3 min-h-[36px] text-sm font-medium text-green-300 underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                >
                  Send another request
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="resend-email" className="mb-1 block text-sm font-medium text-gray-300">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                id="resend-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                className="min-h-[46px] w-full rounded-lg border border-gray-800 bg-gray-950 py-2.5 pl-10 pr-4 text-white placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError('');
                }}
                onBlur={() => setTouched(true)}
                disabled={loading || success}
                aria-invalid={touched && !EMAIL_PATTERN.test(email.trim())}
                aria-describedby={touched && !EMAIL_PATTERN.test(email.trim()) ? 'resend-email-error' : undefined}
              />
            </div>
            {touched && !EMAIL_PATTERN.test(email.trim()) && (
              <p id="resend-email-error" className="mt-1 text-sm text-red-400">
                Enter a valid email address.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || success || !EMAIL_PATTERN.test(email.trim())}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Send verification email
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-800 pt-4 text-center">
          <Link
            to="/login"
            className="inline-flex min-h-[40px] items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ResendVerification;
