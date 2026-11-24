import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import TfcLogo from '@/assets/Primary Icon White.svg';

const Signup = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (!user.email_verified) {
      navigate('/verify-email', { replace: true, state: { email: user.email } });
      return;
    }
    navigate(user.onboarded ? '/dashboard' : '/onboarding', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handleSuccess = (email) => {
    setRegisteredEmail(email);
    setRegistrationComplete(true);
  };

  if (authLoading || (isAuthenticated && user)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-label="Restoring your account" />
      </div>
    );
  }

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center bg-black px-4 py-12" aria-labelledby="signup-title">
      <div className="space-y-3 pb-6 text-center">
        <img src={TfcLogo} alt="" className="mx-auto mb-2 h-14 w-14 opacity-80" />
        <p className="text-lg font-semibold tracking-tight text-white">TickFlow Intelligence</p>
        <p className="text-xs tracking-wide text-gray-500">Stock research workspace</p>
        <h1 id="signup-title" className="pt-3 text-2xl font-bold tracking-tight text-white">
          Create your account
        </h1>
        <p className="mx-auto max-w-sm text-sm text-gray-400">
          Set up your workspace and save your research preferences.
        </p>
      </div>

      <div className="px-2 pb-8 sm:px-6">
        {registrationComplete ? (
          <Card className="border border-green-400/40 bg-green-400/10 p-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-400/20">
                <CheckCircle className="h-6 w-6 text-green-400" aria-hidden="true" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-white">Account created</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              We’ve sent a verification email to <span className="font-medium text-white">{registeredEmail}</span>.
              Open the email to verify your address. If it isn’t there, check your spam folder.
            </p>
            <Link
              to="/check-email"
              state={{ email: registeredEmail }}
              className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Continue to email verification
            </Link>
            <button
              type="button"
              onClick={() => setRegistrationComplete(false)}
              className="mt-4 min-h-[40px] text-sm text-gray-400 underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Create another account
            </button>
          </Card>
        ) : (
          <>
            <SignupForm onSuccess={handleSuccess} />

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-white transition-colors hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                >
                  Sign in
                </Link>
              </p>
            </div>
            <p className="mt-6 border-t border-gray-800 pt-4 text-center text-xs text-gray-500">
              No payment details are required to create an account.
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default Signup;
