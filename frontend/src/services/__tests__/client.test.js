// src/services/__tests__/client.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';

// We mock axios BEFORE importing the client
vi.mock('axios');

describe('Unified API Client (client.js)', () => {
  let mockAxiosInstance;
  let clientModule;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();

    // Create a mock Axios instance with interceptors
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: { headers: { common: {} } },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };

    axios.create = vi.fn(() => mockAxiosInstance);
    axios.post = vi.fn();

    // Import the client AFTER axios is mocked
    clientModule = await import('../client');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Management', () => {
    it('sets Authorization header when setAuthToken is called', () => {
      clientModule.setAuthToken('test-token-123', true);

      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe(
        'Bearer test-token-123'
      );
      expect(localStorage.getItem('authToken')).toBe('test-token-123');
    });

    it('removes Authorization header when setAuthToken(null) is called', () => {
      clientModule.setAuthToken('test-token-123', true);
      clientModule.setAuthToken(null);

      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBeUndefined();
      expect(localStorage.getItem('authToken')).toBeNull();
    });

    it('setApiKey attaches X-API-Key header', () => {
      clientModule.setApiKey('ts_test_api_key');

      expect(mockAxiosInstance.defaults.headers.common['X-API-Key']).toBe('ts_test_api_key');
    });

    it('removeAuthToken clears all storage keys', () => {
      localStorage.setItem('authToken', 'x');
      localStorage.setItem('accessToken', 'y');
      localStorage.setItem('refreshToken', 'z');
      localStorage.setItem('user', '{}');

      clientModule.removeAuthToken();

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('restoreAuthToken', () => {
    it('restores token from sessionStorage when localStorage is empty', () => {
      sessionStorage.setItem('authToken', 'session-token');
      const restored = clientModule.restoreAuthToken();

      expect(restored).toBe(true);
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe(
        'Bearer session-token'
      );
    });

    it('restores token from localStorage accessToken', () => {
      localStorage.setItem('accessToken', 'ls-token');
      const restored = clientModule.restoreAuthToken();

      expect(restored).toBe(true);
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe(
        'Bearer ls-token'
      );
    });

    it('returns false when no token is stored', () => {
      const restored = clientModule.restoreAuthToken();
      expect(restored).toBe(false);
    });
  });
});