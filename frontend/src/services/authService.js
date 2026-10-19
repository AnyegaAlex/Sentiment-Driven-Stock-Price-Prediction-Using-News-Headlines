// services/authService.js
/**
 * Auth Service — aligned with the unified client (client.js).
 *
 * The unified client returns the response body directly:
 *   - Success: { success: true, data: {...} }
 *   - Failure: rejects with { success: false, error, code, details }
 *
 * Every function returns a normalized result object so the UI never has to
 * deal with undefined values or thrown exceptions for expected errors.
 *
 * Endpoints used:
 *   - POST /api/v1/auth/login/
 *   - POST /api/v1/auth/logout/
 *   - POST /api/v1/auth/refresh/
 *   - POST /api/v1/auth/register/
 *   - GET  /api/v1/auth/verify-email/?token=...&uid=...
 *   - POST /api/v1/auth/resend-verification/
 *   - POST /api/v1/auth/password-reset/
 *   - POST /api/v1/auth/password-reset/confirm/
 *   - GET  /api/v1/auth/profile/
 *   - PATCH /api/v1/auth/profile/update/
 *   - POST /api/v1/auth/change-password/
 *   - POST /api/v1/auth/api-keys/         (multi-key creation)
 *
 * @version 3.0.0
 */

import apiClient, { setAuthToken, removeAuthToken } from './client';

// ============================================================================
// Storage Keys (single source of truth)
// ============================================================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
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

/**
 * Extracts field-level validation errors from `details`.
 * Works with Django's typical serializer error format:
 *   { username: ["Already taken"], email: ["Invalid format"] }
 */
const extractFieldErrors = (details) => {
  const fieldErrors = {};
  if (!details || typeof details !== 'object') return fieldErrors;

  Object.entries(details).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      fieldErrors[key] = value[0];
    } else if (typeof value === 'string') {
      fieldErrors[key] = value;
    }
  });

  return fieldErrors;
};

// ============================================================================
// Auth Service
// ============================================================================

export const AuthService = {
  // ==========================================================================
  // Token Management
  // ==========================================================================

  getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
           sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ||
           sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  getUser() {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEYS.USER) ||
        sessionStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setTokens(accessToken, refreshToken, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    setAuthToken(accessToken, remember);
  },

  setUser(user, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  clearTokens() {
    Object.values(STORAGE_KEYS).forEach((key) => {
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
  // Login
  // ==========================================================================

  /**
   * Authenticate a user and persist tokens.
   *
   * @param {string} username - Username or email
   * @param {string} password
   * @param {boolean} remember - Store in localStorage (true) or sessionStorage (false)
   * @returns {Promise<{ success: boolean, user?: Object, error?: string, code?: number, details?: Object }>}
   */
  async login(username, password, remember = false) {
    try {
      const response = await apiClient.post('/auth/login/', { username, password });
      const { access, refresh, user } = extract(response);

      if (!access || !refresh) {
        throw new Error('Invalid login response: missing tokens');
      }

      this.setTokens(access, refresh, remember);
      this.setUser(user, remember);

      return { success: true, user };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] Login failed:', e);
      return {
        success: false,
        user: null,
        error: e.message,
        code: e.code,
        details: extractFieldErrors(e.details),
      };
    }
  },

  // ==========================================================================
  // Logout
  // ==========================================================================

  async logout() {
    try {
      const refresh = this.getRefreshToken();
      if (refresh) {
        await apiClient.post('/auth/logout/', { refresh });
      }
    } catch {
      // Ignore — local cleanup must always happen
    } finally {
      this.clearTokens();
    }
  },

  // ==========================================================================
  // Refresh Access Token
  // ==========================================================================

  /**
   * Exchange the refresh token for a new access token.
   * Throws on failure so callers (like the interceptor) can handle it.
   */
  async refreshAccessToken() {
    const refresh = this.getRefreshToken();
    if (!refresh) throw new Error('No refresh token available');

    try {
      const response = await apiClient.post('/auth/refresh/', { refresh });
      const payload = extract(response);
      const newAccessToken = payload.access;

      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }

      const remember = this.isRemembered();
      this.setTokens(newAccessToken, refresh, remember);
      return newAccessToken;
    } catch (err) {
      this.clearTokens();
      throw err;
    }
  },

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Create a new user account.
   *
   * @param {Object} params
   * @param {string} params.username
   * @param {string} params.email
   * @param {string} params.password
   * @param {string} params.password2
   * @returns {Promise<{ success: boolean, user?: Object, error?: string, code?: number, details?: Object }>}
   */
  async register({ username, email, password, password2 }) {
    try {
      const response = await apiClient.post('/auth/register/', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        password2,
      });

      const payload = extract(response);
      const userData = payload.user || payload;

      if (!userData || typeof userData !== 'object') {
        throw new Error('Invalid registration response: no user data');
      }

      console.info('[AuthService] Registration successful:', {
        username: userData.username,
        email: userData.email,
      });

      return { success: true, user: userData };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] Registration failed:', e);

      return {
        success: false,
        user: null,
        error: e.message,
        details: extractFieldErrors(e.details),
        code: e.code,
      };
    }
  },

  // ==========================================================================
  // Email Verification
  // ==========================================================================

  /**
   * Verify email using the token + uid from the verification link.
   * Persists tokens on success so the user is auto-logged-in.
   *
   * @param {string} token
   * @param {string} uid
   * @returns {Promise<{ success: boolean, user?: Object, redirect?: string, error?: string, code?: number }>}
   */
  async verifyEmail(token, uid) {
    try {
      const response = await apiClient.get('/auth/verify-email/', {
        params: { token, uid },
      });

      const payload = extract(response);
      const { access, refresh, user, redirect } = payload;

      if (access && refresh) {
        const remember = this.isRemembered();
        this.setTokens(access, refresh, remember);
        if (user) this.setUser(user, remember);
      }

      return {
        success: true,
        user,
        redirect: redirect || (user?.onboarded ? '/dashboard' : '/onboarding'),
      };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] Email verification failed:', e);
      return {
        success: false,
        error: e.message,
        code: e.code,
      };
    }
  },

  /**
   * Resend the verification email.
   * Accepts an email for unauthenticated users (backend reads from body).
   *
   * @param {string|null} email
   */
  async resendVerification(email = null) {
    try {
      const payload = email ? { email: email.trim().toLowerCase() } : {};
      const response = await apiClient.post('/auth/resend-verification/', payload);
      return { success: true, data: extract(response) };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] Resend verification failed:', e);
      return {
        success: false,
        error: e.message,
        code: e.code,
        retryAfter: e.code === 429 ? 60 : null,
      };
    }
  },

  // ==========================================================================
  // Password Reset
  // ==========================================================================

  async requestPasswordReset(email) {
    try {
      await apiClient.post('/auth/password-reset/', {
        email: email.trim().toLowerCase(),
      });
      return { success: true };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] Password reset request failed:', e);
      return { success: false, error: e.message, code: e.code };
    }
  },

  async confirmPasswordReset(token, uid, password, password2) {
    try {
      await apiClient.post('/auth/password-reset/confirm/', {
        token,
        uid,
        password,
        password2,
      });
      return { success: true };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] Password reset confirmation failed:', e);
      return { success: false, error: e.message, code: e.code };
    }
  },

  // ==========================================================================
  // Profile Management
  // ==========================================================================

  async getProfile() {
    try {
      const response = await apiClient.get('/auth/profile/');
      const payload = extract(response);
      const user = payload.user || payload;

      if (user?.id) {
        this.setUser(user, this.isRemembered());
      }

      return { success: true, user };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] Profile fetch failed:', e);
      return { success: false, user: null, error: e.message, code: e.code };
    }
  },

  async updateProfile(data) {
    try {
      const response = await apiClient.patch('/auth/profile/update/', data);
      const payload = extract(response);
      const user = payload.user || payload;

      if (user?.id) {
        this.setUser(user, this.isRemembered());
      }

      return { success: true, user };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] Profile update failed:', e);
      return {
        success: false,
        user: null,
        error: e.message,
        details: extractFieldErrors(e.details),
        code: e.code,
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
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] Password change failed:', e);
      return {
        success: false,
        error: e.message,
        details: extractFieldErrors(e.details),
        code: e.code,
      };
    }
  },

  // ==========================================================================
  // API Key Management
  // ==========================================================================

  /**
   * Create a new API key for the authenticated user.
   *
   * Backend: POST /api/v1/auth/api-keys/  (plural, not api-key/generate/)
   * Returns the raw key ONCE (it's never retrievable again).
   *
   * @param {string} name - Human-readable name for the key
   * @returns {Promise<{ success: boolean, key?: string, id?: number, error?: string, code?: number }>}
   */
  async generateApiKey(name) {
    try {
      const response = await apiClient.post('/auth/api-keys/', { name });
      const payload = extract(response);

      // Backend returns { id, name, raw_key, created_at }
      const rawKey = payload.raw_key || payload.key;

      if (!rawKey) {
        throw new Error('No API key in response');
      }

      console.info('[AuthService] API key created:', { id: payload.id, name });
      return {
        success: true,
        key: rawKey,
        id: payload.id,
        name: payload.name,
        createdAt: payload.created_at,
      };
    } catch (err) {
      const e = normalizeError(err);
      console.error('[AuthService] API key generation failed:', e);
      return { success: false, error: e.message, code: e.code };
    }
  },
};

// ============================================================================
// Multi-Tab Sync
// ============================================================================

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEYS.ACCESS_TOKEN) {
    const newToken = AuthService.getAccessToken();
    if (newToken) {
      setAuthToken(newToken, AuthService.isRemembered());
    } else {
      removeAuthToken();
    }
  }
});

// ============================================================================
// Export
// ============================================================================

export default AuthService;