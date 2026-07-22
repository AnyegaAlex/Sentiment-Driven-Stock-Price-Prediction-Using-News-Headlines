/**
 * Production-Ready Auth Service
 * 
 * Features:
 * - JWT token management with persistence
 * - Login, registration, logout
 * - Password reset and email verification
 * - Profile management
 * - API key generation
 * - Multi-tab synchronization
 * 
 * @version 2.0.0
 */

import apiClient, { setAuthToken, removeAuthToken } from './client';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  SESSION_ACCESS_TOKEN: 'sessionAccessToken',
  SESSION_REFRESH_TOKEN: 'sessionRefreshToken',
  SESSION_USER: 'sessionUser',
};

// ============================================================================
// Auth Service
// ============================================================================

export const AuthService = {
  // ==========================================================================
  // Token Management
  // ==========================================================================

  getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) 
      || sessionStorage.getItem(STORAGE_KEYS.SESSION_ACCESS_TOKEN);
  },

  getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) 
      || sessionStorage.getItem(STORAGE_KEYS.SESSION_REFRESH_TOKEN);
  },

  getUser() {
    const userData = localStorage.getItem(STORAGE_KEYS.USER) 
      || sessionStorage.getItem(STORAGE_KEYS.SESSION_USER);
    try {
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },

  setTokens(accessToken, refreshToken, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    
    if (remember) {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_ACCESS_TOKEN, accessToken);
      sessionStorage.setItem(STORAGE_KEYS.SESSION_REFRESH_TOKEN, refreshToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_REFRESH_TOKEN);
    }
    
    setAuthToken(accessToken);
  },

  setUser(user, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    if (remember) {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_USER);
    }
  },

  clearTokens() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    removeAuthToken();
  },

  isAuthenticated() {
    return !!this.getAccessToken();
  },

  isRemembered() {
    return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  // ==========================================================================
  // Authentication
  // ==========================================================================

  async login(username, password, remember = false) {
    try {
      const response = await apiClient.post('/auth/login/', { username, password });
      const { access, refresh, user } = response.data.data || response.data;

      if (!access || !refresh) {
        throw new Error('Invalid login response');
      }

      this.setTokens(access, refresh, remember);
      this.setUser(user, remember);

      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Login failed:', error);
      return {
        success: false,
        user: null,
        error: error.message || 'Login failed',
        code: error.code || 500,
      };
    }
  },

  async logout() {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      // Ignore logout endpoint errors
    } finally {
      this.clearTokens();
    }
  },

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiClient.post('/auth/refresh/', { refresh: refreshToken });
      const newAccessToken = response.data.data?.access || response.data.access;
      
      if (newAccessToken) {
        const remember = this.isRemembered();
        this.setTokens(newAccessToken, refreshToken, remember);
        return newAccessToken;
      }
      throw new Error('No access token in refresh response');
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  },

  // ==========================================================================
  // Registration
  // ==========================================================================

  async register({ username, email, password, password2 }) {
    try {
      const response = await apiClient.post('/auth/register/', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        password2,
      });
      
      const { user } = response.data.data || response.data;
      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Registration failed:', error);
      return {
        success: false,
        user: null,
        error: error.message || 'Registration failed',
        code: error.code || 500,
      };
    }
  },

  // ==========================================================================
  // Email Verification
  // ==========================================================================

  async verifyEmail(token, uid) {
    try {
      const response = await apiClient.get(`/auth/verify-email/`, {
        params: { token, uid },
      });
      
      const { access, refresh, user } = response.data.data || response.data;
      
      if (access && refresh) {
        const remember = this.isRemembered();
        this.setTokens(access, refresh, remember);
        this.setUser(user, remember);
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Email verification failed:', error);
      return {
        success: false,
        error: error.message || 'Verification failed',
        code: error.code || 400,
      };
    }
  },

  async resendVerification(email = null) {
    try {
      const payload = email ? { email } : {};
      await apiClient.post('/auth/resend-verification/', payload);
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Resend verification failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to resend verification',
      };
    }
  },

  // ==========================================================================
  // Password Reset
  // ==========================================================================

  async requestPasswordReset(email) {
    try {
      await apiClient.post('/auth/password-reset/', { email: email.trim().toLowerCase() });
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Password reset request failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to request password reset',
      };
    }
  },

  async confirmPasswordReset(token, uid, password, password2) {
    try {
      await apiClient.post(`/auth/password-reset/confirm/`, {
        token,
        uid,
        password,
        password2,
      });
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Password reset confirmation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset password',
      };
    }
  },

  // ==========================================================================
  // Profile Management
  // ==========================================================================

  async getProfile() {
    try {
      const response = await apiClient.get('/auth/profile/');
      const user = response.data.data || response.data;
      
      if (user) {
        const remember = this.isRemembered();
        this.setUser(user, remember);
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Profile fetch failed:', error);
      return {
        success: false,
        user: null,
        error: error.message || 'Failed to fetch profile',
      };
    }
  },

  async updateProfile(data) {
    try {
      const response = await apiClient.patch('/auth/profile/update/', data);
      const user = response.data.data || response.data;
      
      if (user) {
        const remember = this.isRemembered();
        this.setUser(user, remember);
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Profile update failed:', error);
      return {
        success: false,
        user: null,
        error: error.message || 'Failed to update profile',
      };
    }
  },

  // ==========================================================================
  // Password Change
  // ==========================================================================

  async changePassword(oldPassword, newPassword, newPassword2) {
    try {
      await apiClient.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      });
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Password change failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to change password',
      };
    }
  },

  // ==========================================================================
  // API Key Management
  // ==========================================================================

  async generateApiKey(name) {
    try {
      const response = await apiClient.post('/auth/api-key/generate/', { name });
      const { key, ...rest } = response.data.data || response.data;
      return { success: true, key, ...rest };
    } catch (error) {
      console.error('[AuthService] API key generation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate API key',
      };
    }
  },
};

// ============================================================================
// Multi-Tab Sync
// ============================================================================

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEYS.ACCESS_TOKEN || event.key === STORAGE_KEYS.SESSION_ACCESS_TOKEN) {
    const newToken = AuthService.getAccessToken();
    if (newToken) {
      setAuthToken(newToken);
    } else {
      removeAuthToken();
    }
  }
});

// ============================================================================
// Export Default
// ============================================================================

export default AuthService;