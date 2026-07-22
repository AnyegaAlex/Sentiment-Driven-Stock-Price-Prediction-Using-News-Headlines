// components/auth/SignupForm.jsx
import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AuthService from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'lowercase', label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'uppercase', label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'Contains a number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'Contains a special character', test: (p) => /[^a-zA-Z0-9]/.test(p) },
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
      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
    ) : (
      <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
    )}
    <span className={met ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
      {label}
    </span>
  </div>
));

PasswordRequirement.displayName = 'PasswordRequirement';

const FieldError = React.memo(({ error }) => {
  if (!error) return null;
  return (
    <div className="flex items-start gap-1.5 mt-1 text-red-500 text-sm animate-slide-down" role="alert">
      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <span>{error}</span>
    </div>
  );
});

FieldError.displayName = 'FieldError';

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
      color: ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][score],
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">Password strength</span>
        <span className={cn('font-medium', {
          'text-red-500': strength.score <= 1,
          'text-yellow-500': strength.score === 2,
          'text-blue-500': strength.score === 3,
          'text-green-500': strength.score >= 4,
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
              i < strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'
            )}
          />
        ))}
      </div>
    </div>
  );
});

PasswordStrength.displayName = 'PasswordStrength';

// ============================================================================
// Main Component
// ============================================================================

export const SignupForm = ({ onSuccess, onError }) => {
  // ---- State ----
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' });
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

  const isDisposableEmail = useMemo(() => {
    if (!form.email) return false;
    const domain = form.email.split('@')[1]?.toLowerCase();
    return DISPOSABLE_DOMAINS.includes(domain);
  }, [form.email]);

  const passwordMeetsRequirements = useMemo(() => {
    return PASSWORD_REQUIREMENTS.every((req) => req.test(form.password));
  }, [form.password]);

  const passwordsMatch = useMemo(() => {
    return form.password && form.password2 && form.password === form.password2;
  }, [form.password, form.password2]);

  const isFormValid = useMemo(() => {
    return (
      form.username.trim().length >= 3 &&
      form.username.trim().length <= 30 &&
      isEmailValid &&
      !isDisposableEmail &&
      passwordMeetsRequirements &&
      passwordsMatch
    );
  }, [form.username, isEmailValid, isDisposableEmail, passwordMeetsRequirements, passwordsMatch]);

  // ---- Handlers ----
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (generalError) setGeneralError('');
  }, [fieldErrors, generalError]);

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
      });

      if (result.success) {
        onSuccess?.(form.email);
      } else {
        if (result.details) {
          setFieldErrors(result.details);
        }
        const errorMsg = result.error || 'Registration failed. Please try again.';
        setGeneralError(errorMsg);
        onError?.(result);
      }
    } catch (err) {
      const errorMsg = err.message || 'Registration failed. Please try again.';
      setGeneralError(errorMsg);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = useCallback((field) => fieldErrors[field] || null, [fieldErrors]);
  const isFieldTouched = useCallback((field) => touched[field] || false, [touched]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
            'h-11 transition-all duration-200',
            getFieldError('username') && isFieldTouched('username')
              ? 'border-red-500 focus:ring-red-500'
              : 'focus:ring-blue-500'
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
          maxLength={100}
          className={cn(
            'h-11 transition-all duration-200',
            getFieldError('email') && isFieldTouched('email')
              ? 'border-red-500 focus:ring-red-500'
              : 'focus:ring-blue-500'
          )}
          aria-invalid={!!getFieldError('email') || isDisposableEmail}
          aria-describedby={getFieldError('email') ? 'email-error' : undefined}
          required
          disabled={loading}
          autoComplete="email"
        />
        {getFieldError('email') && (
          <FieldError error={getFieldError('email')} id="email-error" />
        )}
        {isDisposableEmail && isFieldTouched('email') && (
          <div className="text-sm text-yellow-500 mt-1">
            Please use a permanent email address
          </div>
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
              'h-11 pr-11 transition-all duration-200',
              getFieldError('password') && isFieldTouched('password')
                ? 'border-red-500 focus:ring-red-500'
                : 'focus:ring-blue-500'
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
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
            className="mt-2 space-y-1 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
            role="list"
            aria-label="Password requirements"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
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
              'h-11 pr-11 transition-all duration-200',
              getFieldError('password2') && isFieldTouched('password2')
                ? 'border-red-500 focus:ring-red-500'
                : form.password2 && !passwordsMatch && isFieldTouched('password2')
                  ? 'border-red-500 focus:ring-red-500'
                  : form.password2 && passwordsMatch
                    ? 'border-green-500 focus:ring-green-500'
                    : 'focus:ring-blue-500'
            )}
            aria-invalid={!!getFieldError('password2') || (form.password2 && !passwordsMatch)}
            aria-describedby={getFieldError('password2') ? 'password2-error' : undefined}
            required
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword2((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={showPassword2 ? 'Hide confirm password' : 'Show confirm password'}
            tabIndex={0}
          >
            {showPassword2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {getFieldError('password2') && (
          <FieldError error={getFieldError('password2')} id="password2-error" />
        )}

        {form.password2 && isFieldTouched('password2') && !getFieldError('password2') && (
          <div className="mt-1 text-sm" role="status" aria-live="polite">
            {passwordsMatch ? (
              <span className="text-green-500 flex items-center gap-1">
                <Check className="h-4 w-4" /> Passwords match
              </span>
            ) : (
              <span className="text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Passwords do not match
              </span>
            )}
          </div>
        )}
      </div>

      {/* General Error */}
      {generalError && (
        <Alert variant="destructive" className="animate-slide-down" role="alert">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2 flex-1">{generalError}</span>
          <button
            type="button"
            onClick={() => setGeneralError('')}
            className="ml-2 text-white/70 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-11 text-base font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-70"
        disabled={loading || !isFormValid}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating account…
          </span>
        ) : (
          'Create Account'
        )}
      </Button>

      {/* Form Footer */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        By creating an account, you agree to our{' '}
        <Link to="/terms" className="text-blue-600 hover:underline dark:text-blue-400">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">
          Privacy Policy
        </Link>
      </p>
    </form>
  );
};

export default SignupForm;