// src/hooks/useAuth.js
// Reads the shared session created by AuthSessionProvider. It holds no state of its own.
import { useAuthSession } from '@/context/AuthSessionProvider';

export const useAuth = () => useAuthSession();

export default useAuth;
