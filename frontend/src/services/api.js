import axios from 'axios';

// ✅ In development, use empty baseURL so Vite proxy handles /api/ requests.
// In production, use the Render URL (or env var) directly.
const baseURL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? '' : 'https://sentiment-driven-stock-price-prediction.onrender.com');

const api = axios.create({
  baseURL: baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL,
  timeout: 15000,
  withCredentials: true,
});

// Request interceptor – unchanged except we now have a proper baseURL
api.interceptors.request.use(
  (config) => {
    // If URL is relative and doesn't start with /api, prepend /api
    if (config.url && config.url.startsWith('/') && !config.url.startsWith('/api')) {
      config.url = `/api${config.url}`;
    }

    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers,
    };

    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (same as before)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        message: error.response.data?.message || 'Unknown error',
        url: error.config?.url,
      });
      if (error.response.status === 401) {
        sessionStorage.removeItem('accessToken');
        window.dispatchEvent(new Event('unauthorized'));
      }
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Request Setup Error:', error.message);
    }
    return Promise.reject({
      code: error.response?.status || 'NETWORK_ERROR',
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
  }
);

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