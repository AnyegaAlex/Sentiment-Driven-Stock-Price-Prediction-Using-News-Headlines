import { Link, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import TfcLogo from '@/assets/Primary Icon White.svg';

const CheckEmail = () => {
  const location = useLocation();
  const email = location.state?.email || '';

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center bg-black px-4 py-12" aria-labelledby="check-email-title">
      <div className="mb-6 text-center">
        <img src={TfcLogo} alt="" className="mx-auto mb-3 h-14 w-14 opacity-80" />
        <p className="text-lg font-semibold text-white">TickFlow Intelligence</p>
        <p className="mt-1 text-xs text-gray-500">Stock research workspace</p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
          <Mail className="h-7 w-7 text-gray-300" aria-hidden="true" />
        </div>
        <h1 id="check-email-title" className="text-2xl font-semibold text-white">
          Check your inbox
        </h1>
        {email ? (
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            We’ve sent a verification email to <span className="font-medium text-white">{email}</span>.
            Open the link in that email to verify your address.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            If you’ve just created an account, check the inbox for the email address you registered with.
          </p>
        )}
        <p className="mt-3 text-sm text-gray-500">
          Don’t see it? Check your spam folder, or request another email.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            to="/verify-email"
            state={{ email }}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Enter verification code
          </Link>
          <Link
            to="/resend-verification"
            state={{ email }}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Resend verification email
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-[40px] items-center justify-center gap-2 text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CheckEmail;
