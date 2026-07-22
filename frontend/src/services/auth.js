/**
 * Production-Ready Auth Service
 * 
 * Features:
 * - JWT token management with persistence
 * - Automatic token refresh on expiry
 * - Multi-tab synchronization
 * - Remember me functionality
 * - Comprehensive error handling
 * - Session timeout management
 * - User data persistence
 * - Server-side logout support
 * 
 * @version 2.0.0
 * @author Tickflow Capital
 */

import apiClient, { setAuthToken, removeAuthToken } from './client';
import { handleApiError } from '@/utils/errorHandler';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  LAST_ACTIVITY: 'lastActivity',
  SESSION_ACCESS_TOKEN: 'sessionAccessToken',
  SESSION_REFRESH_TOKEN: 'sessionRefreshToken',
  SESSION_USER: 'sessionUser',
  SESSION_LAST_ACTIVITY: 'sessionLastActivity',
};

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// Auth Service Class
// ============================================================================

export class AuthService {
  // ==========================================================================
  // Token Management
  // ==========================================================================

  /**
   * Get the current access token from storage
   * @returns {string|null} Access token or null
   */
  static getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) 
      || sessionStorage.getItem(STORAGE_KEYS.SESSION_ACCESS_TOKEN);
  }

  /**
   * Get the current refresh token from storage
   * @returns {string|null} Refresh token or null
   */
  static getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) 
      || sessionStorage.getItem(STORAGE_KEYS.SESSION_REFRESH_TOKEN);
  }

  /**
   * Get the current user from storage
   * @returns {Object|null} User object or null
   */
  static getUser() {
    const userData = localStorage.getItem(STORAGE_KEYS.USER) 
      || sessionStorage.getItem(STORAGE_KEYS.SESSION_USER);
    try {
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  /**
   * Store tokens in the appropriate storage
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - JWT refresh token
   * @param {boolean} remember - Whether to persist across sessions
   */
  static setTokens(accessToken, refreshToken, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    
    // Multi-tab sync: store in session storage too
    if (remember) {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_ACCESS_TOKEN, accessToken);
      sessionStorage.setItem(STORAGE_KEYS.SESSION_REFRESH_TOKEN, refreshToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_ACCESS_TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_REFRESH_TOKEN);
    }
    
    // Attach to axios
    setAuthToken(accessToken);
    
    // Update activity timestamp
    this.updateActivity();
  }

  /**
   * Store user data
   * @param {Object} user - User object
   * @param {boolean} remember - Whether to persist across sessions
   */
  static setUser(user, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    if (remember) {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_USER);
    }
  }

  /**
   * Clear all auth data from storage
   */
  static clearTokens() {
    // Clear all storage keys
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Remove from axios
    removeAuthToken();
    
    console.info('[AuthService] Tokens cleared');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  static isAuthenticated() {
    return !!this.getAccessToken();
  }

  /**
   * Check if tokens are stored in localStorage (remember me)
   * @returns {boolean} True if remembered
   */
  static isRemembered() {
    return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  // ==========================================================================
  // Activity Management
  // ==========================================================================

  /**
   * Update the last activity timestamp
   */
  static updateActivity() {
    const timestamp = Date.now().toString();
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, timestamp);
    sessionStorage.setItem(STORAGE_KEYS.SESSION_LAST_ACTIVITY, timestamp);
  }

  /**
   * Get the last activity timestamp
   * @returns {number} Timestamp in milliseconds
   */
  static getLastActivity() {
    const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY) 
      || sessionStorage.getItem(STORAGE_KEYS.SESSION_LAST_ACTIVITY);
    return timestamp ? parseInt(timestamp, 10) : 0;
  }

  /**
   * Check if the session has expired due to inactivity
   * @returns {boolean} True if session is valid
   */
  static isSessionValid() {
    const lastActivity = this.getLastActivity();
    return Date.now() - lastActivity < SESSION_TIMEOUT;
  }

  // ==========================================================================
  // Login / Logout
  // ==========================================================================

  /**
   * Authenticate user and store tokens
   * @param {string} username - Username or email
   * @param {string} password - Password
   * @param {boolean} remember - Remember me
   * @returns {Promise<{success: boolean, user: Object, error: string}>}
   */
  static async login(username, password, remember = false) {
    try {
      const response = await apiClient.post('/auth/login/', {
        username: username.trim(),
        password,
      });
      
      // Handle nested response
      const { access, refresh, user } = response.data.data || response.data;

      if (!access || !refresh) {
        throw new Error('Invalid login response from server');
      }

      // Store tokens and user
      this.setTokens(access, refresh, remember);
      this.setUser(user, remember);
      this.updateActivity();

      console.info('[AuthService] Login successful', {
        userId: user?.id,
        username: user?.username,
        tier: user?.tier,
        remember,
      });

      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Login failed:', error);
      const handled = handleApiError(error, { context: 'login' });
      return {
        success: false,
        user: null,
        error: handled.userMessage || 'Login failed',
        code: handled.status,
      };
    }
  }

  /**
   * Log out the current user
   * @param {boolean} serverLogout - Whether to call server logout endpoint
   * @returns {Promise<void>}
   */
  static async logout(serverLogout = true) {
    try {
      if (serverLogout) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          await apiClient.post('/auth/logout/', { refresh: refreshToken });
          console.info('[AuthService] Server logout successful');
        }
      }
    } catch (error) {
      // Ignore server logout errors
      console.warn('[AuthService] Server logout failed:', error);
    } finally {
      this.clearTokens();
      console.info('[AuthService] Logout complete');
    }
  }

  // ==========================================================================
  // Token Refresh
  // ==========================================================================

  /**
   * Refresh the access token using the refresh token
   * @returns {Promise<string>} New access token
   * @throws {Error} If refresh fails
   */
  static async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiClient.post('/auth/refresh/', {
        refresh: refreshToken,
      });
      
      const newAccessToken = response.data.data?.access || response.data.access;
      
      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }
      
      // Update tokens (keep refresh token, update access token)
      const remember = this.isRemembered();
      this.setTokens(newAccessToken, refreshToken, remember);
      this.updateActivity();
      
      console.info('[AuthService] Token refreshed successfully');
      return newAccessToken;
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      // Clear tokens on refresh failure
      this.clearTokens();
      throw error;
    }
  }

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Register a new user
   * @param {Object} data - Registration data
   * @param {string} data.username - Username
   * @param {string} data.email - Email address
   * @param {string} data.password - Password
   * @param {string} data.password2 - Password confirmation
   * @returns {Promise<{success: boolean, user: Object, error: string}>}
   */
  static async register({ username, email, password, password2 }) {
    try {
      const response = await apiClient.post('/auth/register/', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        password2,
      });
      
      const { user } = response.data.data || response.data;
      
      console.info('[AuthService] Registration successful', {
        userId: user?.id,
        username: user?.username,
        email: user?.email,
      });
      
      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Registration failed:', error);
      const handled = handleApiError(error, { context: 'registration' });
      return {
        success: false,
        user: null,
        error: handled.userMessage || 'Registration failed',
        code: handled.status,
        details: handled.details,
      };
    }
  }

  // ==========================================================================
  // Email Verification
  // ==========================================================================

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @param {string} uid - User ID (base64 encoded)
   * @returns {Promise<{success: boolean, user: Object, error: string}>}
   */
  static async verifyEmail(token, uid) {
    try {
      const response = await apiClient.get(`/auth/verify-email/`, {
        params: { token, uid },
      });
      
      // After verification, store tokens if returned
      const { access, refresh, user } = response.data.data || response.data;
      
      if (access && refresh) {
        const remember = this.isRemembered();
        this.setTokens(access, refresh, remember);
        this.setUser(user, remember);
        this.updateActivity();
      }
      
      console.info('[AuthService] Email verified successfully');
      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Email verification failed:', error);
      const handled = handleApiError(error, { context: 'email_verification' });
      return {
        success: false,
        error: handled.userMessage || 'Verification failed',
        code: handled.status,
      };
    }
  }

  /**
   * Resend verification email
   * @param {string} email - Email address (optional)
   * @returns {Promise<{success: boolean, error: string}>}
   */
  static async resendVerification(email = null) {
    try {
      const payload = email ? { email } : {};
      await apiClient.post('/auth/resend-verification/', payload);
      
      console.info('[AuthService] Verification email resent');
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Resend verification failed:', error);
      const handled = handleApiError(error, { context: 'resend_verification' });
      return {
        success: false,
        error: handled.userMessage || 'Failed to resend verification',
      };
    }
  }

  // ==========================================================================
  // Password Reset
  // ==========================================================================

  /**
   * Request password reset
   * @param {string} email - Email address
   * @returns {Promise<{success: boolean, error: string}>}
   */
  static async requestPasswordReset(email) {
    try {
      await apiClient.post('/auth/password-reset/', { email: email.trim().toLowerCase() });
      
      console.info('[AuthService] Password reset requested for:', email);
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Password reset request failed:', error);
      const handled = handleApiError(error, { context: 'password_reset' });
      return {
        success: false,
        error: handled.userMessage || 'Failed to request password reset',
      };
    }
  }

  /**
   * Confirm password reset with token
   * @param {string} token - Reset token
   * @param {string} uid - User ID (base64 encoded)
   * @param {string} password - New password
   * @param {string} password2 - Password confirmation
   * @returns {Promise<{success: boolean, error: string}>}
   */
  static async confirmPasswordReset(token, uid, password, password2) {
    try {
      await apiClient.post(`/auth/password-reset/confirm/`, {
        token,
        uid,
        password,
        password2,
      });
      
      console.info('[AuthService] Password reset confirmed');
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Password reset confirmation failed:', error);
      const handled = handleApiError(error, { context: 'password_reset_confirm' });
      return {
        success: false,
        error: handled.userMessage || 'Failed to reset password',
      };
    }
  }

  // ==========================================================================
  // Profile Management
  // ==========================================================================

  /**
   * Get user profile
   * @returns {Promise<{success: boolean, user: Object, error: string}>}
   */
  static async getProfile() {
    try {
      const response = await apiClient.get('/auth/profile/');
      const user = response.data.data || response.data;
      
      // Update stored user
      if (user) {
        const remember = this.isRemembered();
        this.setUser(user, remember);
      }
      
      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Profile fetch failed:', error);
      const handled = handleApiError(error, { context: 'profile' });
      return {
        success: false,
        user: null,
        error: handled.userMessage || 'Failed to fetch profile',
      };
    }
  }

  /**
   * Update user profile
   * @param {Object} data - Profile data to update
   * @returns {Promise<{success: boolean, user: Object, error: string}>}
   */
  static async updateProfile(data) {
    try {
      const response = await apiClient.patch('/auth/profile/update/', data);
      const user = response.data.data || response.data;
      
      // Update stored user
      if (user) {
        const remember = this.isRemembered();
        this.setUser(user, remember);
      }
      
      console.info('[AuthService] Profile updated');
      return { success: true, user };
    } catch (error) {
      console.error('[AuthService] Profile update failed:', error);
      const handled = handleApiError(error, { context: 'profile_update' });
      return {
        success: false,
        user: null,
        error: handled.userMessage || 'Failed to update profile',
      };
    }
  }

  // ==========================================================================
  // Password Change
  // ==========================================================================

  /**
   * Change user password
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} newPassword2 - New password confirmation
   * @returns {Promise<{success: boolean, error: string}>}
   */
  static async changePassword(oldPassword, newPassword, newPassword2) {
    try {
      await apiClient.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      });
      
      console.info('[AuthService] Password changed successfully');
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Password change failed:', error);
      const handled = handleApiError(error, { context: 'password_change' });
      return {
        success: false,
        error: handled.userMessage || 'Failed to change password',
      };
    }
  }

  // ==========================================================================
  // API Key Management
  // ==========================================================================

  /**
   * Generate a new API key
   * @param {string} name - Name for the API key
   * @returns {Promise<{success: boolean, key: string, error: string}>}
   */
  static async generateApiKey(name) {
    try {
      const response = await apiClient.post('/auth/api-key/generate/', { name });
      const { key, ...rest } = response.data.data || response.data;
      
      console.info('[AuthService] API key generated');
      return { success: true, key, ...rest };
    } catch (error) {
      console.error('[AuthService] API key generation failed:', error);
      const handled = handleApiError(error, { context: 'api_key' });
      return {
        success: false,
        error: handled.userMessage || 'Failed to generate API key',
      };
    }
  }

  // ==========================================================================
  // Multi-Tab Sync
  // ==========================================================================

  /**
   * Initialize multi-tab synchronization
   */
  static syncTabs() {
    window.addEventListener('storage', (event) => {
      // Check for token changes
      if (
        event.key === STORAGE_KEYS.ACCESS_TOKEN || 
        event.key === STORAGE_KEYS.SESSION_ACCESS_TOKEN
      ) {
        const newToken = this.getAccessToken();
        if (newToken) {
          setAuthToken(newToken);
          console.debug('[AuthService] Token synced from another tab');
        } else {
          removeAuthToken();
          console.debug('[AuthService] Token removed from another tab');
        }
      }
      
      // Check for user changes
      if (
        event.key === STORAGE_KEYS.USER || 
        event.key === STORAGE_KEYS.SESSION_USER
      ) {
        // User data changed in another tab
        const newUser = this.getUser();
        if (newUser) {
          // Optionally dispatch event for React components
          window.dispatchEvent(new CustomEvent('user-updated', {
            detail: { user: newUser },
          }));
        }
      }
    });
  }
}

// ============================================================================
// Initialize Multi-Tab Sync
// ============================================================================

AuthService.syncTabs();

// ============================================================================
// Export
// ============================================================================

export default AuthService;