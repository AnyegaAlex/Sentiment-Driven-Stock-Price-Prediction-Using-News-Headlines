/**
 * Production-Ready Authentication Hook
 * 
 * Features:
 * - Centralized auth state management
 * - Token validation on init
 * - Automatic token refresh on 401
 * - Multi-tab synchronization
 * - Session timeout with inactivity tracking
 * - User tier/role management
 * - Comprehensive error handling
 * - Memory leak prevention
 * 
 * @version 2.0.0
 * @author Tickflow Capital
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { setAuthToken, removeAuthToken, restoreAuthToken } from '@/services/client';

// ============================================================================
// Constants
// ============================================================================

const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  LAST_ACTIVITY: 'lastActivity',
  SESSION_ACCESS_TOKEN: 'sessionAccessToken',
  SESSION_REFRESH_TOKEN: 'sessionRefreshToken',
  SESSION_USER: 'sessionUser',
};

// ============================================================================
// Auth Hook
// ============================================================================

export const useAuth = () => {
  const navigate = useNavigate();
  
  // Auth state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userTier, setUserTier] = useState('free');
  
  // Refs for cleanup
  const refreshIntervalRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // ============================================================================
  // Storage Helpers
  // ============================================================================

  const getStorage = useCallback((key) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  }, []);

  const setStorage = useCallback((key, value, remember = false) => {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(key, value);
    // Also store in session for multi-tab sync
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
  // Handle Logout (Internal)
  // ============================================================================

  const handleLogout = useCallback(() => {
    // Clear all storage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear auth state
    removeAuthToken();
    setUser(null);
    setIsAuthenticated(false);
    setUserTier('free');
    
    // Clear intervals
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
    
    console.info('[Auth] User logged out');
  }, []);

  // ============================================================================
  // Activity Monitoring (MUST BE BEFORE initAuth)
  // ============================================================================

  const updateLastActivity = useCallback(() => {
    const timestamp = Date.now().toString();
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, timestamp);
    sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, timestamp);
  }, []);

  const startActivityMonitor = useCallback(() => {
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }

    const checkActivity = () => {
      const lastActivity = parseInt(
        getStorage(STORAGE_KEYS.LAST_ACTIVITY) || '0',
        10
      );
      const now = Date.now();
      
      if (now - lastActivity > SESSION_TIMEOUT) {
        // Session expired
        console.warn('[Auth] Session expired due to inactivity');
        handleLogout();
        navigate('/login', { replace: true });
        return;
      }
      
      // Check again in 1 minute
      activityTimeoutRef.current = setTimeout(checkActivity, 60000);
    };

    // Start monitoring after 1 second
    setTimeout(checkActivity, 1000);

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => updateLastActivity();
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
    };
  }, [getStorage, handleLogout, navigate, updateLastActivity]);

  // ============================================================================
  // Validate Token
  // ============================================================================

  const validateToken = useCallback(async (token) => {
    if (!token) return { valid: false, user: null };
    
    try {
      const response = await apiClient.get('/auth/profile/', {
        timeout: 15000, // 15 seconds
      });
      
      const userData = response.data?.user || response.data;
      
      if (userData?.id) {
        return { valid: true, user: userData };
      }
      return { valid: false, user: null };
    } catch (err) {
      // ✅ Timeout/Network = assume token is still valid
      if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED') {
        console.warn('[Auth] Token validation timeout - assuming token valid');
        return { valid: true, user: null };
      }
      // ✅ Only invalidate on 401
      if (err.code === 401) {
        return { valid: false, user: null, error: 'Token expired' };
      }
      console.warn('[Auth] Token validation error:', err);
      return { valid: true, user: null };
    }
  }, []);

  // ============================================================================
  // Refresh Token
  // ============================================================================

  const refreshToken = useCallback(async () => {
    const refreshToken = getStorage(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiClient.post('/auth/refresh/', { refresh: refreshToken });
      const newAccessToken = response.data.data?.access || response.data.access;
      
      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }
      
      // Get remember preference
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
  // Initialize Auth
  // ============================================================================

  const initAuth = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
  
    try {
      const hasToken = restoreAuthToken();
      
      if (!hasToken) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }
  
      const storedUser = getStorage(STORAGE_KEYS.USER);
      let parsedUser = null;
      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser);
          if (isMountedRef.current) {
            setUser(parsedUser);
            setUserTier(parsedUser?.tier || 'free');
          }
        } catch (e) {
          console.warn('[Auth] Invalid user data in storage');
        }
      }
  
      const token = getStorage(STORAGE_KEYS.ACCESS_TOKEN);
      const validation = await validateToken(token);
      
      if (isMountedRef.current) {
        if (validation.valid) {
          setIsAuthenticated(true);
          if (validation.user && !parsedUser) {
            setUser(validation.user);
            setUserTier(validation.user?.tier || 'free');
            const isRemembered = !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            setStorage(STORAGE_KEYS.USER, JSON.stringify(validation.user), isRemembered);
          }
          
          updateLastActivity();
          startActivityMonitor();
        } else {
          // ✅ Only logout if token is expired (not on timeout)
          if (validation.error === 'Token expired') {
            handleLogout();
            if (!window.location.pathname.includes('/login')) {
              navigate('/login', { replace: true });
            }
          } else {
            // Network error/timeout – keep user logged in
            setIsAuthenticated(true);
          }
        }
      }
    } catch (err) {
      console.error('[Auth] Initialization error:', err);
      if (isMountedRef.current) {
        setError(err.message);
        // ✅ Don't logout on init errors
        setIsAuthenticated(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getStorage, setStorage, validateToken, handleLogout, navigate, updateLastActivity, startActivityMonitor]);

  // ============================================================================
  // Login
  // ============================================================================

  const login = useCallback(async (username, password, rememberMe = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/login/', { username, password });
      
      // ✅ Handle nested response
      const { access, refresh, user: userData } = response.data.data || response.data;

      if (!access || !refresh) {
        throw new Error('Invalid login response');
      }

      // Store tokens
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
      storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      
      // Also store in session for multi-tab sync
      if (rememberMe) {
        sessionStorage.setItem(`session_${STORAGE_KEYS.ACCESS_TOKEN}`, access);
        sessionStorage.setItem(`session_${STORAGE_KEYS.REFRESH_TOKEN}`, refresh);
      }

      // Set auth token
      setAuthToken(access, rememberMe);
      
      // Update state
      setUser(userData);
      setUserTier(userData?.tier || 'free');
      setIsAuthenticated(true);
      updateLastActivity();
      startActivityMonitor();

      console.info('[Auth] Login successful', {
        userId: userData?.id,
        username: userData?.username,
        tier: userData?.tier,
        rememberMe,
      });

      return { success: true, user: userData };
    } catch (err) {
      console.error('[Auth] Login error:', err);
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [setStorage, updateLastActivity, startActivityMonitor]);

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
      return { 
        success: false, 
        error: generalError,
        details: fieldErrors,
      };
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
      if (refreshToken) {
        try {
          await apiClient.post('/auth/logout/', { refresh: refreshToken });
        } catch (e) {
          // Ignore logout endpoint errors
        }
      }
    } catch (e) {
      // Ignore
    } finally {
      handleLogout();
      if (redirect) {
        navigate('/login', { replace: true });
      }
    }
  }, [getStorage, handleLogout, navigate]);

  // ============================================================================
  // Check Permissions
  // ============================================================================

  const hasPermission = useCallback((requiredTier) => {
    const tierLevels = {
      free: 0,
      pro: 1,
      enterprise: 2,
    };
    
    const userLevel = tierLevels[userTier] || 0;
    const requiredLevel = tierLevels[requiredTier] || 0;
    
    return userLevel >= requiredLevel;
  }, [userTier]);

  const isPro = useCallback(() => hasPermission('pro'), [hasPermission]);
  const isEnterprise = useCallback(() => hasPermission('enterprise'), [hasPermission]);

  // ============================================================================
  // Update User
  // ============================================================================

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    if (updatedUser?.tier) {
      setUserTier(updatedUser.tier);
    }
    // Update storage
    const isRemembered = !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    setStorage(STORAGE_KEYS.USER, JSON.stringify(updatedUser), isRemembered);
  }, [setStorage]);

  // ============================================================================
  // Check if token is about to expire
  // ============================================================================

  const isTokenExpiringSoon = useCallback(() => {
    // This would require decoding the JWT
    // For simplicity, we rely on the refresh interceptor
    return false;
  }, []);

  // ============================================================================
  // Initialize on mount
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize auth
    initAuth();

    // Listen for storage changes (multi-tab sync)
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEYS.ACCESS_TOKEN || 
          event.key === `session_${STORAGE_KEYS.ACCESS_TOKEN}`) {
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
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setUserTier(parsedUser?.tier || 'free');
          } catch (e) {
            // Ignore
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Listen for unauthorized events
    const handleUnauthorized = (event) => {
      handleLogout();
      if (event.detail?.message) {
        setError(event.detail.message);
      }
      navigate('/login', { replace: true });
    };
    window.addEventListener('unauthorized', handleUnauthorized);

    // Listen for online/offline events
    const handleOnline = () => {
      if (isAuthenticated) {
        // Refresh token when coming back online
        refreshToken().catch(() => {});
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('unauthorized', handleUnauthorized);
      window.removeEventListener('online', handleOnline);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
    };
  }, [initAuth, handleLogout, navigate, refreshToken, isAuthenticated, getStorage]);

  // ============================================================================
  // Return Auth Context
  // ============================================================================

  return useMemo(() => ({
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    userTier,
    
    // Actions
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    
    // Permissions
    hasPermission,
    isPro,
    isEnterprise,
    
    // Utilities
    clearError: () => setError(null),
    updateLastActivity,
    
    // Session info
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
    hasPermission,
    isPro,
    isEnterprise,
    getStorage,
    updateLastActivity,
  ]);
};

export default useAuth;