import axios from 'axios';

// Configure base URL with fallbacks
const baseURL = import.meta.env.VITE_API_BASE_URL || 
  'https://sentiment-driven-stock-price-prediction.onrender.com';

const api = axios.create({
  baseURL: baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL, // Remove trailing slash
  timeout: 15000, // Increased timeout for slower connections
  withCredentials: true, // For session/cookie auth if needed
});

// Request interceptor: attach token and set default Content-Type
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Standard headers
    config.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers, // Preserve existing headers
    };

    // Add cache-buster for GET requests
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => {
      console.error('Request error:', error);
      return Promise.reject(error);
    }
  );

// Response interceptor: log 401 errors and handle token expiration if needed
api.interceptors.response.use(
  (response) => {
    // Handle successful responses
    return response.data; // Directly return data instead of full response
  },
  (error) => {
    // Enhanced error handling
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', {
        status: error.response.status,
        message: error.response.data?.message || 'Unknown error',
        url: error.config.url,
      });

      // Specific status code handling
      if (error.response.status === 401) {
        // Token expired - trigger refresh or logout
        window.dispatchEvent(new Event('unauthorized'));
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.message);
    } else {
      // Something happened in setting up the request
      console.error('Request Setup Error:', error.message);
    }

    return Promise.reject({
      code: error.response?.status || 'NETWORK_ERROR',
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
  }
);

// Add retry logic wrapper
export const apiWithRetry = async (config, retries = 3) => {
  try {
    return await api(config);
  } catch (error) {
    if (retries > 0 && error.code !== 401) {
      await new Promise(res => setTimeout(res, 1000));
      return apiWithRetry(config, retries - 1);
    }
    throw error;
  }
};

export default api;
