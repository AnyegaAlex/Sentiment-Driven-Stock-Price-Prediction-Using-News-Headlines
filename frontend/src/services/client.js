import axios from 'axios';

/**
 * API Client for Sentiment-Driven Stock Prediction System
 * 
 * Features:
 * - API key authentication via X-API-Key header
 * - Automatic /api/v1/ URL prefixing
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
  // withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Request Interceptor
 * Handles: API key injection, URL prefixing, cache busting
 */
apiClient.interceptors.request.use(
  (config) => {
    // 1. Add API key to every request
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }

    // 2. Add /api/v1/ prefix to relative URLs - FIXED
    if (config.url && config.url.startsWith('/')) {
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
 * Handles: Response transformation, error formatting, mock fallback
 */
apiClient.interceptors.response.use(
  // Success handler - extract data from response
  (response) => {
    if (import.meta.env.DEV) {
      console.debug('[API Response]', response.config.url, response.status);
    }
    return response.data;
  },
  
  // Error handler - format errors consistently
  (error) => {
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

    // Handle 401 Unauthorized
    if (status === 401) {
      sessionStorage.removeItem('accessToken');
      window.dispatchEvent(new CustomEvent('unauthorized', {
        detail: { message: 'Your session has expired. Please login again.' }
      }));
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