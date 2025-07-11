import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000
});

// Response interceptor to handle errors and fallback to mock data
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      console.warn('API Error, falling back to mock data:', error.message);
      return Promise.resolve({ data: null }); // Triggers mock data fallback
    }
    return Promise.reject(error);
  }
);

export default apiClient;