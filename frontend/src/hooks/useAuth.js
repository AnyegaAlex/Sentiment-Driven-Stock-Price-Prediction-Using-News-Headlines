// hooks/useAuth.js
/**
 * Production-Ready Authentication Hook
 * 
 * Features:
 * - Centralized auth state management
 * - Token validation on init (backend verification)
 * - Automatic token refresh on 401
 * - Multi-tab synchronization
 * - Session timeout with inactivity tracking
 * - User tier/role management
 * - Comprehensive error handling
 * - Memory leak prevention
 * - Concurrency guard for refreshUser (prevents cascade of requests)
 * - Guard to prevent multiple initializations
 * 
 * @version 2.4.0
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

  const refreshIntervalRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const refreshingRef = useRef(false);
  const initAuthCalled = useRef(false); // ✅ Guard to prevent multiple init calls

  // ============================================================================
  // Storage Helpers
  // ============================================================================

  const getStorage = useCallback((key) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  }, []);

  const setStorage = useCallback((key, value, remember = false) => {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(key, value);
    if (remember) {
      sessionStorage.setItem(`session_${key}`, value);
    }
  }, []);

  const removeStorage = useCallback((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(`session_${key}`);
  }, []);

  // ============================================================================
  // Core: Update User (single source of truth)
  // ============================================================================

  const updateUser = useCallback((userData, remember = false) => {
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
  }, [setStorage, removeStorage]);

  // ============================================================================
  // Handle Logout (Internal)
  // ============================================================================

  const handleLogout = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    removeAuthToken();
    updateUser(null);
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
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
      const lastActivity = parseInt(getStorage(STORAGE_KEYS.LAST_ACTIVITY) || '0', 10);
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
    events.forEach(event => document.addEventListener(event, handleActivity));
    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    };
  }, [getStorage, handleLogout, navigate, updateLastActivity]);

  // ============================================================================
  // Validate Token (Secure – backend verification)
  // ============================================================================

  const validateToken = useCallback(async (token) => {
    if (!token) return { valid: false, user: null };
    try {
      // ✅ Backend validation – the only secure way
      const response = await apiClient.get('/auth/profile/', { timeout: 15000 });
      const userData = response.data?.user || response.data;
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
    const refreshToken = getStorage(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) throw new Error('No refresh token available');
    try {
      const response = await apiClient.post('/auth/refresh/', { refresh: refreshToken });
      const newAccessToken = response.data.data?.access || response.data.access;
      if (!newAccessToken) throw new Error('No access token in refresh response');
      const isRemembered = !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      setStorage(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken, isRemembered);
      setAuthToken(newAccessToken, isRemembered);
      return newAccessToken;
    } catch (err) {
      console.error('[Auth] Token refresh failed:', err);
      handleLogout();
      throw err;
    }
  }, [getStorage, setStorage, handleLogout]);

  // ============================================================================
  // Refresh User (fetches fresh profile) – with concurrency guard
  // ============================================================================

  const refreshUser = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (refreshingRef.current) {
      console.warn('[Auth] refreshUser already in progress');
      return null;
    }

    refreshingRef.current = true;
    try {
      const response = await apiClient.get('/auth/profile/');
      const userData = response.data?.user || response.data;
      if (userData) {
        const isRemembered = !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        updateUser(userData, isRemembered);
        console.info('[Auth] User refreshed:', {
          email: userData.email,
          email_verified: userData.email_verified,
          onboarded: userData.onboarded,
        });
        return userData;
      }
      return null;
    } catch (error) {
      console.error('[Auth] Failed to refresh user:', error);
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [updateUser]);

  // ============================================================================
  // Initialize Auth (runs only once)
  // ============================================================================

  const initAuth = useCallback(async () => {
    // ✅ Prevent multiple calls
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
        try { parsedUser = JSON.parse(storedUser); } catch {}
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
          // ✅ No refresh needed – we already have user data
          updateLastActivity();
          startActivityMonitor();
        } else if (validation.error === 'Token expired') {
          handleLogout();
          navigate('/login', { replace: true });
        } else {
          // Network error – assume still authenticated
          if (parsedUser) updateUser(parsedUser, !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      console.error('[Auth] Init error:', err);
      if (isMountedRef.current) {
        setError(err.message);
        setIsAuthenticated(true);
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [getStorage, validateToken, updateUser, handleLogout, navigate, updateLastActivity, startActivityMonitor]);

  // ============================================================================
  // Login
  // ============================================================================

  const login = useCallback(async (username, password, rememberMe = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/login/', { username, password });
      const { access, refresh, user: userData } = response.data.data || response.data;
      if (!access || !refresh) throw new Error('Invalid login response');
  
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
      storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      if (rememberMe) {
        sessionStorage.setItem(`session_${STORAGE_KEYS.ACCESS_TOKEN}`, access);
        sessionStorage.setItem(`session_${STORAGE_KEYS.REFRESH_TOKEN}`, refresh);
      }
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
  
      // ✅ Only refresh if user is ALREADY onboarded and verified
      // For new users (onboarded: false), the onboarding flow will handle the refresh
      if (userData.onboarded && userData.email_verified) {
        console.info('[Auth] User already onboarded and verified, refreshing profile...');
        await refreshUser();
      } else {
        console.info('[Auth] User needs onboarding or verification, skipping refresh');
      }
  
      return { success: true, user: userData };
    } catch (err) {
      console.error('[Auth] Login error:', err);
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [updateUser, updateLastActivity, startActivityMonitor, refreshUser]);

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
      const { user: userData } = response.data.data || response.data;
      return { success: true, user: userData };
    } catch (err) {
      console.error('[Auth] Registration error:', err);
      const errorData = err.response?.data || {};
      const fieldErrors = {};
      let generalError = err.message || 'Registration failed';
      Object.entries(errorData).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          fieldErrors[key] = value[0];
          if (!generalError) generalError = value[0];
        }
      });
      setError(generalError);
      return { success: false, error: generalError, details: fieldErrors };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // Logout (Public)
  // ============================================================================

  const logout = useCallback(async (redirect = true) => {
    try {
      const refreshToken = getStorage(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) await apiClient.post('/auth/logout/', { refresh: refreshToken });
    } catch {}
    finally {
      handleLogout();
      if (redirect) navigate('/login', { replace: true });
    }
  }, [getStorage, handleLogout, navigate]);

  // ============================================================================
  // Check Permissions
  // ============================================================================

  const hasPermission = useCallback((requiredTier) => {
    const tierLevels = { free: 0, pro: 1, enterprise: 2 };
    const userLevel = tierLevels[userTier] || 0;
    const requiredLevel = tierLevels[requiredTier] || 0;
    return userLevel >= requiredLevel;
  }, [userTier]);

  const isPro = useCallback(() => hasPermission('pro'), [hasPermission]);
  const isEnterprise = useCallback(() => hasPermission('enterprise'), [hasPermission]);

  // ============================================================================
  // Initialize on mount
  // ============================================================================
  
  useEffect(() => {
    isMountedRef.current = true;
    initAuth();
  
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEYS.ACCESS_TOKEN || event.key === `session_${STORAGE_KEYS.ACCESS_TOKEN}`) {
        const newToken = getStorage(STORAGE_KEYS.ACCESS_TOKEN);
        if (newToken) setAuthToken(newToken, !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
        else removeAuthToken();
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
      if (isAuthenticated) refreshToken().catch(() => {});
    };
    window.addEventListener('online', handleOnline);
  
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('unauthorized', handleUnauthorized);
      window.removeEventListener('online', handleOnline);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    };
  }, []); // ✅ Empty dependency array – runs only once

  // ============================================================================
  // Return Auth Context
  // ============================================================================

  return useMemo(() => ({
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
      const lastActivity = parseInt(getStorage(STORAGE_KEYS.LAST_ACTIVITY) || '0', 10);
      return Date.now() - lastActivity < SESSION_TIMEOUT;
    },
  }), [
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
  ]);
};

export default useAuth;