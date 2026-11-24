// src/context/AuthSessionProvider.jsx
// Single shared auth session for the whole app.
// useAuthState (the state machine) is instantiated exactly once, here. That gives one
// refresh timer, one activity monitor and one logout path. Components read the shared
// value through useAuth / useAuthSession and never create their own state machine.
import { createContext, useContext } from 'react';
import { useAuthState } from '@/hooks/useAuthState';

export const AuthSessionContext = createContext(null);

export function AuthSessionProvider({ children }) {
  const auth = useAuthState();
  return <AuthSessionContext.Provider value={auth}>{children}</AuthSessionContext.Provider>;
}

export const useAuthSession = () => {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthSessionProvider>.');
  }
  return ctx;
};
