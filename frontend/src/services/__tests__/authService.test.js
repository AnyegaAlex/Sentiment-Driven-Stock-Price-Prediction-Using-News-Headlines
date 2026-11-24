// src/services/__tests__/authService.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the client BEFORE importing the service
vi.mock('../client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
}));

import apiClient, { setAuthToken, removeAuthToken } from '../client';
import { AuthService } from '../authService';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Login
  // ==========================================================================

  describe('login', () => {
    it('returns { success, user } and persists tokens on success', async () => {
      apiClient.post.mockResolvedValue({
        success: true,
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: { id: 1, username: 'test', email_verified: true },
        },
      });

      const result = await AuthService.login('test', 'password', true);

      expect(result.success).toBe(true);
      expect(result.user.username).toBe('test');
      expect(localStorage.getItem('accessToken')).toBe('access-token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
      expect(setAuthToken).toHaveBeenCalledWith('access-token', true);
    });

    it('returns { success: false } with error message on 401', async () => {
      apiClient.post.mockRejectedValue({
        success: false,
        error: 'Invalid credentials',
        code: 401,
      });

      const result = await AuthService.login('test', 'wrong');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.code).toBe(401);
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('throws if tokens missing from response', async () => {
      apiClient.post.mockResolvedValue({
        success: true,
        data: { user: { id: 1 } },
      });

      const result = await AuthService.login('test', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing tokens');
    });
  });

  // ==========================================================================
  // Register
  // ==========================================================================

  describe('register', () => {
    it('returns { success, user } on successful registration', async () => {
      apiClient.post.mockResolvedValue({
        success: true,
        data: { id: 1, username: 'newuser', email: 'new@example.com' },
      });

      const result = await AuthService.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'pass1234',
        password2: 'pass1234',
      });

      expect(result.success).toBe(true);
      expect(result.user.username).toBe('newuser');
    });

    it('extracts field errors from details on validation failure', async () => {
      apiClient.post.mockRejectedValue({
        success: false,
        error: 'Validation failed',
        code: 400,
        details: {
          email: ['This email is already registered'],
          username: ['Username too short'],
        },
      });

      const result = await AuthService.register({
        username: 'ab',
        email: 'taken@example.com',
        password: 'x',
        password2: 'x',
      });

      expect(result.success).toBe(false);
      expect(result.details.email).toBe('This email is already registered');
      expect(result.details.username).toBe('Username too short');
    });
  });

  // ==========================================================================
  // Verify Email
  // ==========================================================================

  describe('verifyEmail', () => {
    it('returns { success, user, redirect } on success', async () => {
      apiClient.get.mockResolvedValue({
        success: true,
        data: {
          access: 'acc',
          refresh: 'ref',
          user: { id: 1, email_verified: true, onboarded: false },
          redirect: '/onboarding',
        },
      });

      const result = await AuthService.verifyEmail('tok', 'uid');

      expect(result.success).toBe(true);
      expect(result.user.email_verified).toBe(true);
      expect(result.redirect).toBe('/onboarding');
      expect(localStorage.getItem('accessToken')).toBe('acc');
    });

    it('falls back to onboarded-based redirect if redirect missing', async () => {
      apiClient.get.mockResolvedValue({
        success: true,
        data: {
          access: 'acc',
          refresh: 'ref',
          user: { id: 1, email_verified: true, onboarded: true },
        },
      });

      const result = await AuthService.verifyEmail('tok', 'uid');

      expect(result.success).toBe(true);
      expect(result.redirect).toBe('/dashboard');
    });

    it('returns { success: false } on invalid token', async () => {
      apiClient.get.mockRejectedValue({
        success: false,
        error: 'Invalid or expired verification link',
        code: 400,
      });

      const result = await AuthService.verifyEmail('bad', 'token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired verification link');
    });
  });

  // ==========================================================================
  // Resend Verification
  // ==========================================================================

  describe('resendVerification', () => {
    it('sends email payload when email provided', async () => {
      apiClient.post.mockResolvedValue({ success: true });

      const result = await AuthService.resendVerification('user@example.com');

      expect(result.success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith('/auth/resend-verification/', {
        email: 'user@example.com',
      });
    });

    it('sends empty payload when no email (authenticated user)', async () => {
      apiClient.post.mockResolvedValue({ success: true });

      await AuthService.resendVerification();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/resend-verification/', {});
    });

    it('sets retryAfter on 429', async () => {
      apiClient.post.mockRejectedValue({
        success: false,
        error: 'Rate limited',
        code: 429,
      });

      const result = await AuthService.resendVerification('x@y.com');

      expect(result.success).toBe(false);
      expect(result.retryAfter).toBe(60);
    });
  });

  // ==========================================================================
  // API Key Generation
  // ==========================================================================

  describe('generateApiKey', () => {
    it('calls /auth/api-keys/ (plural) and returns raw_key', async () => {
      apiClient.post.mockResolvedValue({
        success: true,
        data: {
          id: 42,
          name: 'Production',
          raw_key: 'ts_abc123def456',
          created_at: '2026-01-01T00:00:00Z',
        },
      });

      const result = await AuthService.generateApiKey('Production');

      expect(result.success).toBe(true);
      expect(result.key).toBe('ts_abc123def456');
      expect(result.id).toBe(42);
      expect(apiClient.post).toHaveBeenCalledWith('/auth/api-keys/', {
        name: 'Production',
      });
    });

    it('returns error on 400 (max keys reached)', async () => {
      apiClient.post.mockRejectedValue({
        success: false,
        error: 'Maximum 5 active keys allowed',
        code: 400,
      });

      const result = await AuthService.generateApiKey('Extra');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 5');
    });
  });

  // ==========================================================================
  // Logout
  // ==========================================================================

  describe('logout', () => {
    it('clears all storage even if API call fails', async () => {
      localStorage.setItem('accessToken', 'x');
      localStorage.setItem('refreshToken', 'y');
      apiClient.post.mockRejectedValue(new Error('Network error'));

      await AuthService.logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(removeAuthToken).toHaveBeenCalled();
    });
  });
});