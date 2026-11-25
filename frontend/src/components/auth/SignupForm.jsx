import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import AuthService from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActionErrorMessage } from '@/utils/errorHandler';

// ============================================================================
// Constants
// ============================================================================

const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'not-numeric', label: 'Not a numbers-only password', test: (p) => p.length > 0 && !/^\d+$/.test(p) },
];

const DISPOSABLE_DOMAINS = [
  'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'throwaway.com', 'mailinator.com', 'trashmail.com',
];

// ============================================================================
// Sub-Components
// ============================================================================

const PasswordRequirement = React.memo(({ label, met }) => (
  <div className="flex items-center gap-2 text-sm" role="listitem">
    {met ? (
      <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
    ) : (
      <X className="h-4 w-4 text-gray-500 flex-shrink-0" />
    )}
    <span className={met ? 'text-gray-300' : 'text-gray-500'}>
      {label}
    </span>
  </div>
));

PasswordRequirement.displayName = 'PasswordRequirement';

const FieldError = React.memo(({ error, id }) => {
  if (!error) return null;
  return (
    <div id={id} className="flex items-start gap-1.5 mt-1 text-red-400 text-sm animate-slide-down" role="alert">
      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span>{error}</span>
    </div>
  );
});

FieldError.displayName = 'FieldError';

PasswordRequirement.propTypes = {
  label: PropTypes.string.isRequired,
  met: PropTypes.bool.isRequired,
};

FieldError.propTypes = {
  error: PropTypes.string,
  id: PropTypes.string,
};

const PasswordStrength = React.memo(({ password }) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return {
      score,
      label: ['Weak', 'Weak', 'Fair', 'Good', 'Strong'][score],
      color: ['bg-red-400', 'bg-red-400', 'bg-gray-500', 'bg-gray-400', 'bg-green-400'][score],
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Password strength</span>
        <span className={cn('font-medium', {
          'text-red-400': strength.score <= 1,
          'text-gray-400': strength.score === 2,
          'text-gray-300': strength.score === 3,
          'text-green-400': strength.score >= 4,
        })}>
          {strength.label}
        </span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              i < strength.score ? strength.color : 'bg-gray-800'
            )}
          />
        ))}
      </div>
    </div>
  );
});

PasswordStrength.displayName = 'PasswordStrength';
PasswordStrength.propTypes = {
  password: PropTypes.string.isRequired,
};

export const SignupForm = ({ onSuccess, onError }) => {
  // ---- State ----
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' });
  // Separate, affirmative controls: Terms acceptance and Privacy Policy acknowledgement.
  const [legal, setLegal] = useState({ terms: false, privacy: false });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // ---- Validation Helpers ----
  const isEmailValid = useMemo(() => {
    if (!form.email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  }, [form.email]);

  const isUsernameValid = useMemo(
    () => /^[a-zA-Z0-9_]{3,30}$/.test(form.username.trim()),
    [form.username]
  );

  const isDisposableEmail = useMemo(() => {
    if (!form.email) return false;
    const domain = form.email.split('@')[1]?.toLowerCase();
    return DISPOSABLE_DOMAINS.includes(domain);
  }, [form.email]);

  const passwordMeetsRequirements = useMemo(() => (
    PASSWORD_REQUIREMENTS.every((req) => req.test(form.password))
  ), [form.password]);

  const passwordsMatch = useMemo(() => {
    return form.password && form.password2 && form.password === form.password2;
  }, [form.password, form.password2]);

  const isFormValid = useMemo(() => {
    return (
      isUsernameValid &&
      isEmailValid &&
      !isDisposableEmail &&
      passwordMeetsRequirements &&
      passwordsMatch &&
      legal.terms &&
      legal.privacy
    );
  }, [isUsernameValid, isEmailValid, isDisposableEmail, passwordMeetsRequirements, passwordsMatch, legal.terms, legal.privacy]);

  // ---- Handlers ----
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (generalError) setGeneralError('');
  }, [fieldErrors, generalError]);

  const handleLegalChange = useCallback((e) => {
    const { name, checked } = e.target;
    setLegal((prev) => ({ ...prev, [name]: checked }));
    if (generalError) setGeneralError('');
  }, [generalError]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setGeneralError('');
    setFieldErrors({});

    try {
      const result = await AuthService.register({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password2: form.password2,
        acceptTerms: legal.terms,
        acknowledgePrivacyNotice: legal.privacy,
      });

      if (result.success) {
        onSuccess?.(form.email.trim().toLowerCase());
      } else {
        if (result.details) {
          setFieldErrors(result.details);
        }
        const hasFieldErrors = result.details && Object.keys(result.details).length > 0;
        const errorMsg = hasFieldErrors
          ? 'Some details need attention. Review the highlighted fields.'
          : getActionErrorMessage(
              { code: result.code, message: result.error, details: result.details },
              'We couldn’t create your account. Please try again.'
            );
        setGeneralError(errorMsg);
        onError?.(result);
      }
    } catch (err) {
      const errorMsg = getActionErrorMessage(
        err,
        'We couldn’t create your account. Please try again.'
      );
      setGeneralError(errorMsg);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = useCallback((field) => {
    const serverError = fieldErrors[field];
    const normalizedServerError = Array.isArray(serverError)
      ? serverError[0]
      : typeof serverError === 'string' ? serverError : '';

    if (normalizedServerError) return normalizedServerError;
    if (!touched[field]) return null;

    if (field === 'username') {
      if (!form.username.trim()) return 'Username is required.';
      if (!isUsernameValid) return 'Use 3–30 letters, numbers or underscores.';
    }
    if (field === 'email') {
      if (!form.email.trim()) return 'Email address is required.';
      if (!isEmailValid) return 'Enter a valid email address.';
      if (isDisposableEmail) return 'Please use a permanent email address.';
    }
    if (field === 'password') {
      if (!form.password) return 'Password is required.';
      if (form.password.length < 8) return 'Use at least 8 characters.';
      if (/^\d+$/.test(form.password)) return 'Choose a password that is not numbers only.';
    }
    if (field === 'password2') {
      if (!form.password2) return 'Confirm your password.';
      if (!passwordsMatch) return 'The passwords do not match.';
    }
    return null;
  }, [fieldErrors, touched, form, isUsernameValid, isEmailValid, isDisposableEmail, passwordsMatch]);
  const isFieldTouched = useCallback((field) => touched[field] || false, [touched]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Header removed – parent Signup page provides it */}

      {/* Username */}
      <div className="space-y-1">
        <label htmlFor="username" className="sr-only">Username</label>
        <Input
          id="username"
          name="username"
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={30}
          className={cn(
            'min-h-[44px] transition-all duration-200 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black',
            getFieldError('username') && isFieldTouched('username')
              ? 'border-red-400'
              : ''
          )}
          aria-invalid={!!getFieldError('username')}
          aria-describedby={getFieldError('username') ? 'username-error' : undefined}
          required
          disabled={loading}
          autoComplete="username"
        />
        {getFieldError('username') && (
          <FieldError error={getFieldError('username')} id="username-error" />
        )}
      </div>

      {/* Email */}
      <div className="space-y-1">
        <label htmlFor="email" className="sr-only">Email</label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={254}
          className={cn(
            'min-h-[44px] transition-all duration-200 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black',
            getFieldError('email') && isFieldTouched('email')
              ? 'border-red-400'
              : ''
          )}
          aria-invalid={!!getFieldError('email')}
          aria-describedby={getFieldError('email') ? 'email-error' : undefined}
          required
          disabled={loading}
          autoComplete="email"
        />
        {getFieldError('email') && (
          <FieldError error={getFieldError('email')} id="email-error" />
        )}
      </div>

      {/* Password */}
      <div className="space-y-1">
        <label htmlFor="password" className="sr-only">Password</label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              'min-h-[44px] pr-11 transition-all duration-200 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black',
              getFieldError('password') && isFieldTouched('password')
                ? 'border-red-400'
                : ''
            )}
            aria-invalid={!!getFieldError('password')}
            aria-describedby={cn(
              getFieldError('password') && 'password-error',
              form.password && 'password-requirements'
            )}
            required
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={0}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {getFieldError('password') && (
          <FieldError error={getFieldError('password')} id="password-error" />
        )}

        {/* Password Requirements */}
        {form.password && (
          <div
            id="password-requirements"
            className="mt-2 space-y-1 p-3 bg-gray-900 border border-gray-800 rounded-lg"
            role="list"
            aria-label="Password requirements"
          >
            <p className="text-xs font-medium text-gray-400 mb-1">
              Password must meet all requirements:
            </p>
            {PASSWORD_REQUIREMENTS.map((req) => (
              <PasswordRequirement
                key={req.id}
                label={req.label}
                met={req.test(form.password)}
              />
            ))}
            <PasswordStrength password={form.password} />
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1">
        <label htmlFor="password2" className="sr-only">Confirm Password</label>
        <div className="relative">
          <Input
            id="password2"
            name="password2"
            type={showPassword2 ? 'text' : 'password'}
            placeholder="Confirm password"
            value={form.password2}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              'min-h-[44px] pr-11 transition-all duration-200 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black',
              getFieldError('password2') && isFieldTouched('password2')
                ? 'border-red-400'
                : form.password2 && !passwordsMatch && isFieldTouched('password2')
                  ? 'border-red-400'
                  : form.password2 && passwordsMatch
                    ? 'border-green-400'
                    : ''
            )}
            aria-invalid={!!getFieldError('password2')}
            aria-describedby={getFieldError('password2') ? 'password2-error' : undefined}
            required
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword2((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={showPassword2 ? 'Hide confirm password' : 'Show confirm password'}
            tabIndex={0}
          >
            {showPassword2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {getFieldError('password2') && (
          <FieldError error={getFieldError('password2')} id="password2-error" />
        )}

      </div>

      {/* General Error */}
      {generalError && (
        <Alert variant="destructive" className="animate-slide-down border border-red-400/30 bg-red-400/10 text-red-400" role="alert">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="ml-2 flex-1">{generalError}</span>
          <button
            type="button"
            onClick={() => setGeneralError('')}
            className="ml-2 text-red-400 hover:text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full min-h-[44px] text-base font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-70 bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black"
        disabled={loading || !isFormValid}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            Creating account…
          </span>
        ) : (
          'Create Account'
        )}
      </Button>

      {/* Legal: two separate controls. Neither is pre-ticked. */}
      <div className="space-y-3 text-sm text-gray-400">
        <label htmlFor="accept-terms" className="flex items-start gap-3 cursor-pointer">
          <input
            id="accept-terms"
            name="terms"
            type="checkbox"
            checked={legal.terms}
            onChange={handleLegalChange}
            className="mt-1 h-4 w-4 rounded border-gray-600 bg-black accent-white"
          />
          <span>
            I accept the{' '}
            <Link to="/terms" className="text-gray-200 underline hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 rounded">
              Terms of Service
            </Link>
          </span>
        </label>
        <label htmlFor="acknowledge-privacy" className="flex items-start gap-3 cursor-pointer">
          <input
            id="acknowledge-privacy"
            name="privacy"
            type="checkbox"
            checked={legal.privacy}
            onChange={handleLegalChange}
            className="mt-1 h-4 w-4 rounded border-gray-600 bg-black accent-white"
          />
          <span>
            I have read the{' '}
            <Link to="/privacy" className="text-gray-200 underline hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 rounded">
              Privacy Policy
            </Link>
          </span>
        </label>
      </div>
    </form>
  );
};

SignupForm.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};

export default SignupForm;