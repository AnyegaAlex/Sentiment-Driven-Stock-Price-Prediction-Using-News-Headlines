// components/auth/LoginForm.jsx
import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
 * - Remember me functionality
 * - Forgot password link
 * - Redirect back to original page after login
 *
 * @component
 */
export const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state
  const from = location.state?.from?.pathname || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
      // ✅ Pass rememberMe to login
      const result = await login(username.trim(), password, rememberMe);

      // ✅ Handle result from useAuth
      if (result && !result.success) {
        setError(result.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // ✅ Navigate to the page user came from, or dashboard
      navigate(from, { replace: true });
    } catch (err) {
      // ✅ Handle both axios errors and custom errors
      let errorMessage = 'Login failed. Please check your connection and try again.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Invalid username or password. Please try again.';
      } else if (err.response?.status === 403) {
        errorMessage = err.response?.data?.message || 'Account not verified. Please check your email.';
      } else if (err.error) {
        errorMessage = err.error;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle demo login
  const handleDemoLogin = async () => {
    setUsername('demo@tickflow.com');
    setPassword('demopass123');
    // Auto-submit after a brief delay
    setTimeout(() => {
      const form = document.getElementById('login-form');
      if (form) form.requestSubmit();
    }, 300);
  };

  const isFormValid = username.trim().length > 0 && password.length > 0;

  return (
    <form id="login-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Username Field */}
      <div className="space-y-1">
        <label htmlFor="login-username" className="sr-only">Username or Email</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
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

      {/* Password Field */}
      <div className="space-y-1">
        <label htmlFor="login-password" className="sr-only">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
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

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked)}
            disabled={loading}
            className="h-4 w-4"
          />
          <label
            htmlFor="remember-me"
            className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none"
          >
            Remember me
          </label>
        </div>
        <Link
          to="/forgot-password"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400 transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          variant="destructive"
          className="animate-slide-down"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
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

      {/* Submit Button */}
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

      {/* Demo Account (Optional) */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleDemoLogin}
        disabled={loading}
        className="w-full h-11"
      >
        Try Demo Account
      </Button>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        By signing in, you agree to our{' '}
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

export default LoginForm;