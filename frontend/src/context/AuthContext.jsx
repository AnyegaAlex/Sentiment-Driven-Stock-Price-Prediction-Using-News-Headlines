// AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, removeAuthToken } from '../services/api';
import { trackEvent } from '../utils/analytics';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setAuthToken(token);
      api.get('/auth/profile/')
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setAuthToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/auth/login/', { username, password });
    const { access, refresh, user } = response.data;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    setAuthToken(access);
    setUser(user);
    trackEvent('login', { username });
    return user;
  };

  const register = async (username, email, password, password2) => {
    const response = await api.post('/auth/register/', { username, email, password, password2 });
    trackEvent('signup', { username, email });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    removeAuthToken();
    setUser(null);
    trackEvent('logout');
  };

  const updateProfile = async (data) => {
    const response = await api.patch('/auth/profile/update/', data);
    setUser(response.data);
    return response.data;
  };

  const generateApiKey = async () => {
    const response = await api.post('/auth/api-key/generate/');
    setUser(prev => ({ ...prev, api_key: response.data.api_key }));
    return response.data.api_key;
  };

  // Refresh profile – fetches the latest user data from the backend
  const refreshProfile = async () => {
    try {
      const response = await api.get('/auth/profile/');
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    generateApiKey,
    refreshProfile,  
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);