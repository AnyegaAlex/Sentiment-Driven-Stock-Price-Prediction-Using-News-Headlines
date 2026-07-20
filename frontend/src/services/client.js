import axios from 'axios';

/**
 * API Client for Sentiment-Driven Stock Prediction System
 * 
 * Features:
 * - JWT token authentication (primary) with automatic refresh
 * - API key authentication (fallback for public/demo endpoints)
 * - Automatic /api/v1/ URL prefixing (only if not already in baseURL)
 * - Request caching with timestamp
 * - Comprehensive error handling
 * - Retry logic for failed requests
 * - Mock data fallback for development
 */

// Base URL configuration with fallback
const baseURL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? '' : 'https://sentiment-driven-stock-price-prediction.onrender.com');

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Check if baseURL already contains /api/v1
 */
const BASE_URL_CONTAINS_API_V1 = /\/api\/v1/.test(baseURL);

/**
 * Request Interceptor
 * Handles: JWT/API key injection, URL prefixing, cache busting
 */
apiClient.interceptors.request.use(
  (config) => {
    // 1. Authentication: JWT first, API key as fallback
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      // ✅ Primary: JWT token for authenticated users
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      // ✅ Fallback: API key for public/demo endpoints
      const apiKey = import.meta.env.VITE_API_KEY;
      if (apiKey) {
        config.headers['X-API-Key'] = apiKey;
      }
    }

    // 2. Add /api/v1/ prefix ONLY if baseURL doesn't already contain it
    if (config.url && config.url.startsWith('/') && !BASE_URL_CONTAINS_API_V1) {
      // Skip prefixing for health, docs, and schema endpoints
      const exemptPaths = ['/health/', '/api/docs/', '/api/schema/'];
      const isExempt = exemptPaths.some(path => config.url.startsWith(path));
      
      if (!isExempt) {
        // Check if URL already has /api/v1/ or /api/
        const hasApiV1 = config.url.startsWith('/api/v1/');
        const hasApi = config.url.startsWith('/api/');
        
        if (hasApiV1) {
          // Already has /api/v1/ - do nothing
          // config.url stays as is
        } else if (hasApi) {
          // Has /api/ but not /api/v1/ - replace with /api/v1/
          config.url = config.url.replace('/api/', '/api/v1/');
        } else {
          // No /api/ prefix - add /api/v1/
          config.url = `/api/v1${config.url}`;
        }
      }
    }

    // 3. Add cache-busting timestamp for GET requests
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    // 4. Log request in development
    if (import.meta.env.DEV) {
      console.debug('[API Request]', config.method?.toUpperCase(), config.url, config.params || {});
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles: Response transformation, error formatting, token refresh
 */
apiClient.interceptors.response.use(
  // Success handler - extract data from response
  (response) => {
    if (import.meta.env.DEV) {
      console.debug('[API Response]', response.config.url, response.status);
    }
    return response.data;
  },
  
  // Error handler - format errors consistently, handle token refresh
  async (error) => {
    const originalRequest = error.config;

    // Network errors (no response)
    if (!error.response) {
      console.error('[Network Error]', error.message);
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please check your internet connection.',
      });
    }

    // HTTP errors with response
    const { status, data, config } = error.response;
    
    // Log error details
    console.error('[API Error]', {
      status,
      url: config?.url,
      method: config?.method?.toUpperCase(),
      message: data?.message || data?.error || error.message,
    });

    // Handle 401 Unauthorized – attempt token refresh
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          // Call refresh endpoint
          const refreshResponse = await axios.post(
            `${baseURL}/auth/refresh/`,
            { refresh: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          const newAccessToken = refreshResponse.data.access;
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed – logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.dispatchEvent(new CustomEvent('unauthorized', {
            detail: { message: 'Your session has expired. Please login again.' }
          }));
          return Promise.reject({
            code: 401,
            message: 'Session expired. Please login again.',
          });
        }
      } else {
        // No refresh token – logout
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new CustomEvent('unauthorized', {
          detail: { message: 'Your session has expired. Please login again.' }
        }));
      }
    }

    // Handle 429 Rate Limiting
    if (status === 429) {
      const resetTime = error.response.headers['x-ratelimit-reset'];
      const message = resetTime 
        ? `Rate limit exceeded. Try again in ${resetTime} seconds.`
        : 'Too many requests. Please try again later.';
      
      return Promise.reject({
        code: status,
        message,
        resetTime: resetTime ? parseInt(resetTime, 10) : null,
      });
    }

    // Handle mock data fallback
    if (import.meta.env.VITE_USE_MOCK_DATA === "true") {
      console.warn('[Mock Fallback] Using mock data for:', config?.url);
      return { data: null, _mockFallback: true };
    }

    // Format error for React components
    return Promise.reject({
      code: status,
      message: data?.message || data?.error || error.message || 'An unexpected error occurred.',
      details: data?.details || data,
    });
  }
);

/**
 * Retry wrapper for failed requests
 * @param {Object} config - Axios request config
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise} Axios response
 */
export const apiWithRetry = async (config, retries = 3, delay = 1000) => {
  try {
    return await apiClient(config);
  } catch (error) {
    // Don't retry on 401 (unauthorized) or 400 (bad request)
    if (error.code === 401 || error.code === 400 || retries <= 0) {
      throw error;
    }

    console.warn(`[Retry] Attempt ${4 - retries} failed for ${config.url}. Retrying...`);
    
    // Exponential backoff
    const backoffDelay = delay * Math.pow(2, 3 - retries);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    return apiWithRetry(config, retries - 1, delay);
  }
};

export default apiClient;