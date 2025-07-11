import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 5000
});

// Response interceptor to properly handle errors
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    if (import.meta.env.VITE_USE_MOCK_DATA === "true") {
      console.warn('Using mock data due to API error');
      return { data: null }; // Triggers mock data fallback
    }
    // Format error for React
    throw {
      code: error.response?.status || 500,
      message: error.message || 'API request failed'
    };
  }
);

export default apiClient;