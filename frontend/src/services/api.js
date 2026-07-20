import axios from 'axios';

// Base URL – defaults to localhost with /api/v1
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken = null;

/**
 * Set JWT token in Authorization header
 * @param {string|null} token - JWT access token
 */
export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * Remove JWT token from Authorization header
 */
export const removeAuthToken = () => {
  authToken = null;
  delete api.defaults.headers.common['Authorization'];
};

// ============================================================================
// Response Interceptor – Token Refresh on 401
// ============================================================================

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ✅ Only attempt refresh on 401 and if not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No refresh token – redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        removeAuthToken();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // ✅ Use the same baseURL for refresh (which already includes /api/v1)
        const response = await axios.post(
          `${baseURL}/auth/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { access } = response.data;
        localStorage.setItem('accessToken', access);
        setAuthToken(access);

        // ✅ Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed – logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        removeAuthToken();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { api };