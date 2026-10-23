// src/hooks/useAuth.js
/**
 * useAuth — context-aware wrapper.
 * All 18 components import this and get the SAME shared auth state.
 * The actual state machine lives in `useAuthState.js`.
 */
import { useAuthContext } from '@/context/AuthContext';

export const useAuth = useAuthContext;
export default useAuth;