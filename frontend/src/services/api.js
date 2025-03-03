import axios from 'axios';

const api = axios.create({
  // Use the Vite-specific environment variable (make sure it's prefixed with VITE_)
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000,
});

// Request interceptor: attach token and set default Content-Type
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: log 401 errors and handle token expiration if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized request - token may have expired.');
      // Optionally, add logic here to refresh the token or redirect to login.
    }
    return Promise.reject(error);
  }
);

export default api;
