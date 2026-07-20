// components/auth/LoginForm.jsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Eye, EyeOff, AlertCircle, LogIn, User, Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LoginForm – Production-ready authentication form.
 *
 * Features:
 * - Username/email + password fields
 * - Show/hide password toggle
 * - Field-level error display
 * - Loading state with spinner
 * - Dismissible general error alert
 * - Accessibility (ARIA labels, keyboard navigation)
 * - Responsive and dark mode ready
 *
 * @component
 */
export const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleUsernameChange = useCallback((e) => {
    setUsername(e.target.value);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: null }));
    }
    if (error) setError('');
  }, [fieldErrors.username, error]);

  const handlePasswordChange = useCallback((e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: null }));
    }
    if (error) setError('');
  }, [fieldErrors.password, error]);

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      const status = err.response?.status;

      if (status === 401) {
        setError('Invalid username or password. Please try again.');
      } else if (data?.error) {
        setError(data.error);
      } else if (data?.message) {
        setError(data.message);
      } else if (data && typeof data === 'object') {
        const errors = {};
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            errors[key] = value[0];
          }
        });
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          const firstError = Object.values(errors)[0];
          if (firstError) setError(firstError);
        } else {
          setError('Login failed. Please try again.');
        }
      } else {
        setError('Login failed. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = username.trim().length > 0 && password.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="login-username" className="sr-only">Username or Email</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="login-username"
            type="text"
            placeholder="Username or email"
            value={username}
            onChange={handleUsernameChange}
            onBlur={() => handleBlur('username')}
            className={cn(
              'h-11 pl-10 transition-all duration-200',
              fieldErrors.username && touched.username
                ? 'border-red-500 focus:ring-red-500'
                : 'focus:ring-blue-500'
            )}
            aria-invalid={!!fieldErrors.username}
            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            required
            disabled={loading}
            autoComplete="username"
            autoFocus
          />
        </div>
        {fieldErrors.username && touched.username && (
          <p className="text-red-500 text-sm mt-1" id="username-error">
            {fieldErrors.username}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="sr-only">Password</label>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => handleBlur('password')}
            className={cn(
              'h-11 pl-10 pr-11 transition-all duration-200',
              fieldErrors.password && touched.password
                ? 'border-red-500 focus:ring-red-500'
                : 'focus:ring-blue-500'
            )}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            required
            disabled={loading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-0.5"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {fieldErrors.password && touched.password && (
          <p className="text-red-500 text-sm mt-1" id="password-error">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="animate-slide-down" role="alert">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="ml-2 text-white/70 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full h-11 text-base font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-70 group"
        disabled={loading || !isFormValid}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Signing in…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <LogIn className="h-5 w-5 group-hover:scale-110 transition-transform" />
            Sign In
          </span>
        )}
      </Button>
    </form>
  );
};

export default LoginForm;