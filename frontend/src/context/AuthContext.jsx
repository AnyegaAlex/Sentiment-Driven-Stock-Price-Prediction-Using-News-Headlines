// src/context/AuthContext.jsx
/**
 * AuthContext — shared auth state via React Context.
 * This ensures ONE instance of useAuthState is shared across the app.
 */
import React, { createContext, useContext } from 'react';
import { useAuth as useAuthState } from '@/hooks/useAuthState';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
};