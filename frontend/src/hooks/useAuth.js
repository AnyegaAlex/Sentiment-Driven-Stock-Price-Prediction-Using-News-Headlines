// hooks/useAuth.js
/**
 * Production-Ready Authentication Hook
 *
 * Aligned with the unified `client.js`:
 *   - The client unwraps `response.data`, so `response` IS the body.
 *   - Errors are rejected as: { success: false, error, code, details }.
 *   - No `.response.data` or `.data.data` access anywhere.
 *
 * Features:
 * - Centralized auth state management
 * - Token validation on init (backend verification)
 * - Automatic token refresh
 * - Multi-tab synchronization
 * - Session timeout with inactivity tracking
 * - User tier/role management
 * - Concurrency guard for refreshUser (prevents request cascades)
 * - Guard to prevent multiple init calls
 *
 * @version 3.0.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { setAuthToken, removeAuthToken, restoreAuthToken } from '@/services/client';

// ============================================================================
// Constants
// ============================================================================

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  LAST_ACTIVITY: 'lastActivity',
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the inner payload from a unified client response.
 * Handles both nested `{ success, data: {...} }` and flat `{...}` shapes.
 */
const extract = (response) => {
  if (!response) return {};
  if (response.data && typeof response.data === 'object') return response.data;
  return response;
};

/**
 * Normalizes errors from the unified client.
 * The client rejects with: { success: false, error, code, details }
 */
const normalizeError = (err) => ({
  message: err?.error || err?.message || 'An unexpected error occurred.',
  code: err?.code || 500,
  details: err?.details || {},
});

// ============================================================================
// Auth Hook
// ============================================================================

export const useAuth = () => {
  const navigate = useNavigate();

  // Auth state
  const [user, setUserState] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userTier, setUserTier] = useState('free');

  // Refs
  const activityTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const refreshingRef = useRef(false);
  const initAuthCalled = useRef(false);
  const isAuthenticatedRef = useRef(false); // 👈 Fixes stale closure in handleOnline

  // Keep the ref in sync with the state
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // ============================================================================
  // Storage Helpers
  // ============================================================================

  const getStorage = useCallback(
    (key) => localStorage.getItem(key) || sessionStorage.getItem(key),
    []
  );

  const setStorage = useCallback((key, value, remember = false) => {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(key, value);
  }, []);

  const removeStorage = useCallback((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }, []);

  // ============================================================================
  // Core: Update User
  // ============================================================================

  const updateUser = useCallback(
    (userData, remember = false) => {
      if (!userData) {
        setUserState(null);
        setIsAuthenticated(false);
        setUserTier('free');
        removeStorage(STORAGE_KEYS.USER);
        return;
      }
      setUserState(userData);
      setIsAuthenticated(true);
      setUserTier(userData.tier || 'free');
      setStorage(STORAGE_KEYS.USER, JSON.stringify(userData), remember);
    },
    [setStorage, removeStorage]
  );

  // ============================================================================
  // Handle Logout (Internal)
  // ============================================================================

  const handleLogout = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    removeAuthToken();
    updateUser(null);
    if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    console.info('[Auth] User logged out');
  }, [updateUser]);

  // ============================================================================
  // Activity Monitoring
  // ============================================================================

  const updateLastActivity = useCallback(() => {
    const timestamp = Date.now().toString();
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, timestamp);
    sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, timestamp);
  }, []);

  const startActivityMonitor = useCallback(() => {
    if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);

    const checkActivity = () => {
      const lastActivity = parseInt(
        getStorage(STORAGE_KEYS.LAST_ACTIVITY) || '0',
        10
      );
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        console.warn('[Auth] Session expired due to inactivity');
        handleLogout();
        navigate('/login', { replace: true });
        return;
      }
      activityTimeoutRef.current = setTimeout(checkActivity, 60000);
    };

    setTimeout(checkActivity, 1000);

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => updateLastActivity();
    events.forEach((event) => document.addEventListener(event, handleActivity));

    return () => {
      events.forEach((event) => document.removeEventListener(event, handleActivity));
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    };
  }, [getStorage, handleLogout, navigate, updateLastActivity]);

  // ============================================================================
  // Validate Token
  // ============================================================================

  const validateToken = useCallback(async (token) => {
    if (!token) return { valid: false, user: null };
    try {
      const response = await apiClient.get('/auth/profile/', { timeout: 15000 });
      const payload = extract(response);
      const userData = payload.user || payload;

      if (userData?.id) return { valid: true, user: userData };
      return { valid: false, user: null };
    } catch (err) {
      if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED') {
        console.warn('[Auth] Token validation timeout - assuming token valid');
        return { valid: true, user: null };
      }
      if (err.code === 401) return { valid: false, user: null, error: 'Token expired' };
      return { valid: true, user: null };
    }
  }, []);

  // ============================================================================
  // Refresh Token
  // ============================================================================

  const refreshToken = useCallback(async () => {
    const refresh = getStorage(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refresh) throw new Error('No refresh token available');

    try {
      const response = await apiClient.post('/auth/refresh/', { refresh });
      const payload = extract(response);
      const newAccessToken = payload.access;

      if (!newAccessToken) throw new Error('No access token in refresh response');

      const isRemembered = !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      setStorage(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken, isRemembered);
      setAuthToken(newAccessToken, isRemembered);
      return newAccessToken;
    } catch (err) {
      console.error('[Auth] Token refresh failed:', normalizeError(err));
      handleLogout();
      throw err;
    }
  }, [getStorage, setStorage, handleLogout]);

  // ============================================================================
  // Refresh User (with concurrency guard)
  // ============================================================================

  const refreshUser = useCallback(async () => {
    if (refreshingRef.current) {
      console.warn('[Auth] refreshUser already in progress');
      return null;
    }

    refreshingRef.current = true;
    try {
      const response = await apiClient.get('/auth/profile/');
      const payload = extract(response);
      const userData = payload.user || payload;

      if (userData?.id) {
        const isRemembered = !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        updateUser(userData, isRemembered);
        return userData;
      }
      return null;
    } catch (err) {
      console.error('[Auth] Failed to refresh user:', normalizeError(err));
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [updateUser]);

  // ============================================================================
  // Initialize Auth (runs only once)
  // ============================================================================

  const initAuth = useCallback(async () => {
    if (initAuthCalled.current) {
      console.info('[Auth] initAuth already called, skipping');
      return;
    }
    initAuthCalled.current = true;

    if (!isMountedRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      const hasToken = restoreAuthToken();
      if (!hasToken) {
        updateUser(null);
        setIsLoading(false);
        return;
      }

      const storedUser = getStorage(STORAGE_KEYS.USER);
      let parsedUser = null;
      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser);
        } catch {}
      }

      const token = getStorage(STORAGE_KEYS.ACCESS_TOKEN);
      const validation = await validateToken(token);

      if (isMountedRef.current) {
        if (validation.valid) {
          const isRemembered = !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
          if (validation.user) {
            updateUser(validation.user, isRemembered);
          } else if (parsedUser) {
            updateUser(parsedUser, isRemembered);
          }
          updateLastActivity();
          startActivityMonitor();
        } else if (validation.error === 'Token expired') {
          handleLogout();
          navigate('/login', { replace: true });
        } else if (parsedUser) {
          // Network error — assume still authenticated with cached user
          updateUser(parsedUser, !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
        }
      }
    } catch (err) {
      console.error('[Auth] Init error:', normalizeError(err));
      if (isMountedRef.current) {
        setError(err?.message || 'Failed to initialize auth');
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [
    getStorage,
    validateToken,
    updateUser,
    handleLogout,
    navigate,
    updateLastActivity,
    startActivityMonitor,
  ]);

  // ============================================================================
  // Login
  // ============================================================================

  const login = useCallback(
    async (username, password, rememberMe = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post('/auth/login/', { username, password });
        const payload = extract(response);
        const { access, refresh, user: userData } = payload;

        if (!access || !refresh) {
          throw new Error('Invalid login response: missing tokens');
        }

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
        storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData || {}));
        setAuthToken(access, rememberMe);

        updateUser(userData, rememberMe);
        updateLastActivity();
        startActivityMonitor();

        console.info('[Auth] Login successful', {
          userId: userData?.id,
          email_verified: userData?.email_verified,
          onboarded: userData?.onboarded,
          rememberMe,
        });

        // Refresh to get latest flags (onboarded, email_verified)
        const refreshedUser = await refreshUser();

        return { success: true, user: refreshedUser || userData };
      } catch (err) {
        const e = normalizeError(err);
        console.error('[Auth] Login error:', e);
        setError(e.message);
        return {
          success: false,
          error: e.message,
          code: e.code,
          details: e.details,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [updateUser, updateLastActivity, startActivityMonitor, refreshUser]
  );

  // ============================================================================
  // Register
  // ============================================================================

  const register = useCallback(async (username, email, password, password2) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/register/', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        password2,
      });

      const payload = extract(response);
      const userData = payload.user || payload;

      return { success: true, user: userData };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[Auth] Registration error:', e);

      // Extract field-level errors from `details`
      const fieldErrors = {};
      if (e.details && typeof e.details === 'object') {
        Object.entries(e.details).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) fieldErrors[key] = value[0];
          else if (typeof value === 'string') fieldErrors[key] = value;
        });
      }

      setError(e.message);
      return {
        success: false,
        error: e.message,
        details: fieldErrors,
        code: e.code,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // Logout (Public)
  // ============================================================================

  const logout = useCallback(
    async (redirect = true) => {
      try {
        const refresh = getStorage(STORAGE_KEYS.REFRESH_TOKEN);
        if (refresh) {
          await apiClient.post('/auth/logout/', { refresh });
        }
      } catch {
        // Ignore — local cleanup must always happen
      } finally {
        handleLogout();
        if (redirect) navigate('/login', { replace: true });
      }
    },
    [getStorage, handleLogout, navigate]
  );

  // ============================================================================
  // Permissions
  // ============================================================================

  const hasPermission = useCallback(
    (requiredTier) => {
      const tierLevels = { free: 0, pro: 1, enterprise: 2 };
      const userLevel = tierLevels[userTier] || 0;
      const requiredLevel = tierLevels[requiredTier] || 0;
      return userLevel >= requiredLevel;
    },
    [userTier]
  );

  const isPro = useCallback(() => hasPermission('pro'), [hasPermission]);
  const isEnterprise = useCallback(() => hasPermission('enterprise'), [hasPermission]);

  // ============================================================================
  // Lifecycle: Initialize on mount
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;
    initAuth();

    const handleStorageChange = (event) => {
      if (
        event.key === STORAGE_KEYS.ACCESS_TOKEN ||
        event.key === `session_${STORAGE_KEYS.ACCESS_TOKEN}`
      ) {
        const newToken = getStorage(STORAGE_KEYS.ACCESS_TOKEN);
        if (newToken) {
          setAuthToken(newToken, !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
        } else {
          removeAuthToken();
        }
      }
      if (event.key === STORAGE_KEYS.USER) {
        const storedUser = getStorage(STORAGE_KEYS.USER);
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            updateUser(parsed, !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
          } catch {}
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const handleUnauthorized = (event) => {
      handleLogout();
      if (event.detail?.message) setError(event.detail.message);
      navigate('/login', { replace: true });
    };
    window.addEventListener('unauthorized', handleUnauthorized);

    const handleOnline = () => {
      // 👈 Use ref to avoid stale closure
      if (isAuthenticatedRef.current) {
        refreshToken().catch(() => {});
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('unauthorized', handleUnauthorized);
      window.removeEventListener('online', handleOnline);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // Return Auth Context
  // ============================================================================

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      userTier,
      login,
      register,
      logout,
      refreshToken,
      updateUser,
      refreshUser,
      hasPermission,
      isPro,
      isEnterprise,
      clearError: () => setError(null),
      updateLastActivity,
      isSessionValid: () => {
        const lastActivity = parseInt(
          getStorage(STORAGE_KEYS.LAST_ACTIVITY) || '0',
          10
        );
        return Date.now() - lastActivity < SESSION_TIMEOUT;
      },
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      error,
      userTier,
      login,
      register,
      logout,
      refreshToken,
      updateUser,
      refreshUser,
      hasPermission,
      isPro,
      isEnterprise,
      getStorage,
      updateLastActivity,
    ]
  );
};

export default useAuth;