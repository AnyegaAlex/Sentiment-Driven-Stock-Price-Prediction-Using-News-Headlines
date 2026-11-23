/**
 * Production API Client for Tickflow Intelligence
 * 
 * Features:
 * - JWT token authentication with automatic refresh
 * - Smart /api/v1/ URL prefixing
 * - Nested response handling ({ success, data })
 * - Selective cache busting
 * - Comprehensive error handling
 * - Exponential backoff retry with jitter
 * - Idempotency support
 * 
 * @version 2.0.0
 */

import axios from 'axios';

// ============================================================================
// Configuration
// ============================================================================

const ENV = import.meta.env.MODE || 'development';
const IS_PRODUCTION = ENV === 'production';
const IS_DEVELOPMENT = ENV === 'development';

const normalizeUrl = (url) => {
  if (!url) return '';
  return url.replace(/\/+$/, '');
};

const getApiUrl = () => {
  let baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  // Use VITE_API_BASE_URL when set; otherwise pick the URL for the build mode
  if (!baseUrl) {
    baseUrl = IS_DEVELOPMENT
      ? 'http://localhost:8000'
      : 'https://sentiment-driven-stock-price-prediction.onrender.com';
  }
  
  // Remove or comment out the env variable check
  // if (!baseUrl) {
  //   baseUrl = IS_DEVELOPMENT 
  //     ? 'http://localhost:8000' 
  //     : 'https://sentiment-driven-stock-price-prediction.onrender.com';
  // }
  
  baseUrl = normalizeUrl(baseUrl);
  
  if (!baseUrl.includes('/api/v1') && !baseUrl.includes('/api/')) {
    baseUrl = `${baseUrl}/api/v1`;
  }
  
  return baseUrl;
};

const CONFIG = {
  baseURL: getApiUrl(),
  env: ENV,
  isProduction: IS_PRODUCTION,
  isDevelopment: IS_DEVELOPMENT,
  timeout: {
    get: 30000,
    post: 30000,
    put: 30000,
    patch: 30000,
    delete: 15000,
    default: 30000,
  },
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    maxDelay: 30000,
    jitter: true,
    retryOnStatus: [408, 429, 500, 502, 503, 504],
    retryOnNetworkError: true,
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  security: {
    withCredentials: false,
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
  },
};

// ============================================================================
// Config Validation
// ============================================================================

export const validateConfig = () => {
  const warnings = [];
  if (!CONFIG.baseURL) warnings.push('VITE_API_BASE_URL is not set');
  if (CONFIG.isProduction && CONFIG.baseURL?.includes('localhost')) {
    warnings.push('Production pointing to localhost');
  }
  if (CONFIG.isDevelopment && CONFIG.baseURL?.includes('onrender.com')) {
    warnings.push('Development pointing to production API');
  }
  return warnings;
};

// ============================================================================
// Base URL Setup
// ============================================================================

const BASE_URL = CONFIG.baseURL.endsWith('/api/v1') 
  ? CONFIG.baseURL 
  : `${CONFIG.baseURL.replace(/\/+$/, '')}/api/v1`;

const BASE_URL_CONTAINS_API_V1 = /\/api\/v1/.test(BASE_URL);
const EXEMPT_PATHS = ['/health/', '/api/docs/', '/api/schema/', '/auth/refresh/'];

// ============================================================================
// Timeout Helper
// ============================================================================

const getTimeout = (method) => {
  const timeout = CONFIG.timeout;
  return timeout[method?.toLowerCase()] || timeout.default || 30000;
};

// ============================================================================
// ID Generator
// ============================================================================

const generateId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// ============================================================================
// Axios Instance
// ============================================================================

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: getTimeout('get'),
  headers: CONFIG.headers,
  withCredentials: CONFIG.security.withCredentials,
});

// ============================================================================
// Token Management
// ============================================================================

let tokenRefreshPromise = null;
let authFailureHandled = false;

export const setAuthToken = (token, remember = false) => {
  if (token) {
    authFailureHandled = false;
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('authToken', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  }
};

export const removeAuthToken = () => {
  delete apiClient.defaults.headers.common['Authorization'];
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
};

export const restoreAuthToken = () => {
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('accessToken');
  if (token) {
    setAuthToken(token);
    return true;
  }
  return false;
};

// ============================================================================
// Error Formatter (Moved BEFORE interceptors)
// ============================================================================

const ERROR_MESSAGES = {
  400: 'Some of the information needs attention. Please review your input.',
  401: 'Your sign-in details could not be verified.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  422: 'Some of the information needs attention. Please review your input.',
  429: 'You have made several requests in a short time. Please try again later.',
  500: 'TickFlow could not complete that request because of a server problem.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service is currently unavailable. Please try again later.',
  504: 'Request timed out. Please try again.',
};

const firstErrorMessage = (value) => {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstErrorMessage(item);
      if (message) return message;
    }
  }
  if (value && typeof value === 'object') {
    for (const key of ['detail', 'message', 'error', 'non_field_errors']) {
      const message = firstErrorMessage(value[key]);
      if (message) return message;
    }
  }
  return '';
};

const formatError = (error) => {
  const response = error.response;
  const status = response?.status || 0;
  const data = response?.data || {};
  const config = response?.config || {};
  const responseMessage = firstErrorMessage(data?.detail)
    || firstErrorMessage(data?.message)
    || firstErrorMessage(data?.error);
  const message = status >= 500
    ? (ERROR_MESSAGES[status] || 'TickFlow could not complete that request because of a server problem.')
    : (responseMessage || ERROR_MESSAGES[status] || 'Something unexpected happened. Please try again.');

  return {
    code: status,
    message,
    details: data?.details ?? data?.errors ?? data,
    serviceCode: data?.code ?? data?.error_code ?? null,
    retryAfter: Number(response?.headers?.['retry-after']) || undefined,
    timestamp: new Date().toISOString(),
    requestId: config?.headers?.['X-Request-ID'],
    technical: IS_DEVELOPMENT ? error.message : undefined,
  };
};

// ============================================================================
// Logout Helper (Moved BEFORE interceptors)
// ============================================================================

const handleLogout = () => {
  removeAuthToken();
  if (authFailureHandled) return;
  authFailureHandled = true;

  const from = {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };

  window.dispatchEvent(new CustomEvent('unauthorized', {
    detail: {
      message: 'Your session has expired. Sign in again to continue where you left off.',
      from,
    },
  }));
};

// ============================================================================
// Token Refresh Helper (Moved BEFORE interceptors)
// ============================================================================

const refreshAccessToken = async () => {
  const refreshToken =
    localStorage.getItem('refreshToken') ||
    sessionStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/auth/refresh/`,
      { refresh: refreshToken },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': generateId(),
        },
        timeout: getTimeout('post'),
      }
    );
    
    const newAccessToken = response.data.data?.access || response.data.access;
    
    if (!newAccessToken) {
      throw new Error('No access token in refresh response');
    }
    
    const rememberSession = !!localStorage.getItem('refreshToken');
    const tokenStorage = rememberSession ? localStorage : sessionStorage;
    tokenStorage.setItem('accessToken', newAccessToken);
    setAuthToken(newAccessToken, rememberSession);
    return newAccessToken;
  } catch (error) {
    if (IS_DEVELOPMENT) console.warn('[Token refresh failed]', error?.response?.status || error?.code || 'unknown');
    throw error;
  }
};

// ============================================================================
// Request Interceptor
// ============================================================================

apiClient.interceptors.request.use(
  (config) => {
    // Set method-specific timeout
    config.timeout = getTimeout(config.method);

    // API Explorer requests can explicitly authenticate with an API key
    // without also sending the browser's JWT.
    const skipAuth = config.skipAuth === true;
    delete config.skipAuth;

    if (skipAuth) {
      delete config.headers.Authorization;
      delete config.headers.authorization;
    } else {
      const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('authToken');
      if (accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
      } else {
        const isPublicEndpoint = EXEMPT_PATHS.some(path => config.url?.includes(path));
        if (isPublicEndpoint) {
          const apiKey = import.meta.env.VITE_PUBLIC_API_KEY;
          if (apiKey) {
            config.headers['X-API-Key'] = apiKey;
          }
        }
      }
    }

    // Smart URL prefixing
    if (config.url && config.url.startsWith('/') && !BASE_URL_CONTAINS_API_V1) {
      const isExempt = EXEMPT_PATHS.some(path => config.url.startsWith(path));
      if (!isExempt) {
        if (config.url.startsWith('/api/')) {
          config.url = config.url.replace('/api/', '/api/v1/');
        } else if (!config.url.startsWith('/api/v1/')) {
          config.url = `/api/v1${config.url}`;
        }
      }
    }

    // Selective cache busting
    const dynamicEndpoints = ['/sentiment/', '/technical-indicators/', '/stock-analysis/'];
    const isDynamic = dynamicEndpoints.some(path => config.url?.includes(path));
    if (isDynamic && config.method?.toLowerCase() === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }

    // Idempotency key
    const idempotentMethods = ['post', 'put', 'patch'];
    if (idempotentMethods.includes(config.method?.toLowerCase()) && !config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = generateId();
    }

    // Development logging
    if (IS_DEVELOPMENT) {
      console.debug('[API Request]', {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
      });
    }

    return config;
  },
  (error) => {
    if (IS_DEVELOPMENT) console.warn('[API request setup failed]', error?.message || 'Unknown request error');
    return Promise.reject(formatError(error));
  }
);

// ============================================================================
// Response Interceptor
// ============================================================================

apiClient.interceptors.response.use(
  (response) => {
    if (IS_DEVELOPMENT) {
      console.debug('[API Response]', {
        url: response.config.url,
        status: response.status,
      });
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Distinguish timeouts from connection failures so the UI gives useful guidance.
    if (!error.response) {
      const timedOut = ['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code);
      if (IS_DEVELOPMENT) {
        console.warn(timedOut ? '[API request timed out]' : '[Network request failed]', error.message);
      }
      return Promise.reject({
        code: timedOut ? 408 : 'NETWORK_ERROR',
        message: timedOut
          ? 'The request took too long. Check your connection and try again.'
          : 'Unable to connect to server. Please check your internet connection.',
        timestamp: new Date().toISOString(),
      });
    }

    const { status, data, config } = error.response;
    
    if (IS_DEVELOPMENT) {
      console.warn('[API request failed]', {
        status,
        url: config?.url?.split('?')[0],
        method: config?.method?.toUpperCase(),
      });
    }

    // Token refresh on 401
    // Login/register failures are credential errors, not expired sessions.
    const authOnlyPaths = [
      '/login/',
      '/register/',
      '/refresh/',
      '/verify-email/',
      '/resend-verification/',
      '/password-reset/',
    ];
    const isAuthAttempt = authOnlyPaths.some((path) => originalRequest?.url?.includes(path));
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthAttempt) {
      originalRequest._retry = true;
      
      if (!tokenRefreshPromise) {
        tokenRefreshPromise = refreshAccessToken();
      }

      try {
        const newAccessToken = await tokenRefreshPromise;
        tokenRefreshPromise = null;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        tokenRefreshPromise = null;
        const refreshStatus = Number(refreshError?.response?.status || refreshError?.code || 0);
        const hasRefreshToken = Boolean(
          localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
        );
        const refreshTokenRejected = !hasRefreshToken || [400, 401, 403].includes(refreshStatus);

        if (refreshTokenRejected) {
          handleLogout();
          return Promise.reject({
            code: 401,
            message: 'Your session has expired. Sign in again to continue.',
          });
        }

        return Promise.reject({
          code: refreshStatus || 'NETWORK_ERROR',
          message: 'We couldn’t refresh your session right now. Check your connection and try again.',
        });
      }
    }

    // Rate limiting
    if (status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'], 10) || 60;
      return Promise.reject({
        code: status,
        message: 'You have made several requests in a short time. Please try again later.',
        retryAfter,
        timestamp: new Date().toISOString(),
      });
    }

    // Server errors. Preserve the application error code so the UI can
    // distinguish intentionally unavailable data from an unexpected outage.
    if (status >= 500) {
      return Promise.reject({
        code: status,
        serviceCode: data?.code ?? data?.error_code ?? null,
        message: status === 503
          ? 'This service is temporarily unavailable. Please try again in a moment.'
          : 'We couldn’t complete that request. Please try again shortly.',
        timestamp: new Date().toISOString(),
      });
    }

    return Promise.reject(formatError(error));
  }
);

// ============================================================================
// Retry Wrapper
// ============================================================================

export const apiWithRetry = async (requestConfig, options = {}) => {
  const retryConfig = CONFIG.retry;
  const {
    maxRetries = retryConfig.maxRetries,
    initialDelay = retryConfig.initialDelay,
    backoffFactor = retryConfig.backoffFactor,
    maxDelay = retryConfig.maxDelay,
    jitter = retryConfig.jitter,
    retryOnStatus = retryConfig.retryOnStatus,
  } = options;

  let lastError = null;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await apiClient(requestConfig);
      return response;
    } catch (error) {
      lastError = error;
      const status = error.code || error.response?.status;
      
      const shouldRetryStatus = retryOnStatus.includes(status);
      const shouldRetryNetwork = retryConfig.retryOnNetworkError && !error.response;
      
      if ((!shouldRetryStatus && !shouldRetryNetwork) || attempt === maxRetries - 1) {
        throw error;
      }

      let delay = initialDelay * Math.pow(backoffFactor, attempt);
      if (jitter) {
        delay += delay * 0.1 * (Math.random() - 0.5);
      }
      const waitTime = Math.max(0, Math.min(delay, maxDelay));
      
      console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed for ${requestConfig.url}. Retrying in ${waitTime.toFixed(0)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      attempt++;
    }
  }
  
  throw lastError;
};

// ============================================================================
// Config Validation (Auto-run in development)
// ============================================================================

if (IS_DEVELOPMENT) {
  const warnings = validateConfig();
  if (warnings.length) {
    console.warn('[Config Warnings]', warnings);
  }
}

// ============================================================================
// Export
// ============================================================================

export default apiClient;