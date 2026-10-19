// src/hooks/__tests__/useAuth.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock client BEFORE import
vi.mock('@/services/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
  restoreAuthToken: vi.fn(() => false),
}));

import apiClient, { setAuthToken, restoreAuthToken } from '@/services/client';
import { useAuth } from '../useAuth';

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe('useAuth hook', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    restoreAuthToken.mockReturnValue(false);
  });

  // ==========================================================================
  // Login
  // ==========================================================================

  describe('login', () => {
    it('stores tokens and returns { success, user } on successful login', async () => {
      apiClient.post.mockResolvedValueOnce({
        success: true,
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: { id: 1, username: 'test', onboarded: true },
        },
      });
      // Mock refreshUser's profile call
      apiClient.get.mockResolvedValueOnce({
        success: true,
        data: { id: 1, username: 'test', onboarded: true },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('test', 'pass', false);
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.user.username).toBe('test');
      expect(sessionStorage.getItem('accessToken')).toBe('access-token');
      expect(setAuthToken).toHaveBeenCalled();
    });

    it('returns { success: false, error } on invalid credentials', async () => {
      apiClient.post.mockRejectedValueOnce({
        success: false,
        error: 'Invalid credentials',
        code: 401,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('test', 'wrong');
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Invalid credentials');
      expect(loginResult.code).toBe(401);
    });

    it('preserves 403 EMAIL_NOT_VERIFIED error code', async () => {
      apiClient.post.mockRejectedValueOnce({
        success: false,
        error: 'Please verify your email before logging in.',
        code: 403,
        details: { email: 'test@example.com' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login('test', 'pass');
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.code).toBe(403);
      expect(loginResult.error).toContain('verify');
    });
  });

  // ==========================================================================
  // Register
  // ==========================================================================

  describe('register', () => {
    it('returns { success, user } on success', async () => {
      apiClient.post.mockResolvedValueOnce({
        success: true,
        data: { id: 2, username: 'new', email: 'new@test.com' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      let regResult;
      await act(async () => {
        regResult = await result.current.register(
          'new',
          'new@test.com',
          'pass1234',
          'pass1234'
        );
      });

      expect(regResult.success).toBe(true);
      expect(regResult.user.username).toBe('new');
    });

    it('extracts field errors from details', async () => {
      apiClient.post.mockRejectedValueOnce({
        success: false,
        error: 'Validation failed',
        code: 400,
        details: { email: ['Already taken'], username: ['Too short'] },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      let regResult;
      await act(async () => {
        regResult = await result.current.register('ab', 'x@y.com', 'p', 'p');
      });

      expect(regResult.success).toBe(false);
      expect(regResult.details.email).toBe('Already taken');
      expect(regResult.details.username).toBe('Too short');
    });
  });

  // ==========================================================================
  // Logout
  // ==========================================================================

  describe('logout', () => {
    it('clears all storage and sets isAuthenticated to false', async () => {
      localStorage.setItem('accessToken', 'x');
      localStorage.setItem('refreshToken', 'y');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout(false);
      });

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ==========================================================================
  // refreshUser
  // ==========================================================================

  describe('refreshUser', () => {
    it('returns null on network failure (does not throw)', async () => {
      apiClient.get.mockRejectedValueOnce({ code: 'NETWORK_ERROR' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      let refreshedUser;
      await act(async () => {
        refreshedUser = await result.current.refreshUser();
      });

      expect(refreshedUser).toBeNull();
    });

    it('returns user data on success', async () => {
      apiClient.get.mockResolvedValueOnce({
        success: true,
        data: { id: 1, username: 'test', email_verified: true },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      let refreshedUser;
      await act(async () => {
        refreshedUser = await result.current.refreshUser();
      });

      expect(refreshedUser?.username).toBe('test');
    });
  });

  // ==========================================================================
  // Unauthorized Event
  // ==========================================================================

  describe('unauthorized event listener', () => {
    it('clears auth when window dispatches unauthorized event', async () => {
      localStorage.setItem('accessToken', 'x');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('unauthorized', {
            detail: { message: 'Session expired' },
          })
        );
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(localStorage.getItem('accessToken')).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Permissions
  // ==========================================================================

  describe('hasPermission', () => {
    it('free tier cannot access pro features', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.hasPermission('pro')).toBe(false);
      expect(result.current.hasPermission('free')).toBe(true);
    });
  });
});