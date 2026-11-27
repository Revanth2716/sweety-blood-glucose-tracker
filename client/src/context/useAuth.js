import { useContext } from 'react';
import { AuthContext } from './authContext.js';

/**
 * Read the authentication state.
 *
 * @returns {{
 *   user: { id: string, name: string, email: string } | null,
 *   token: string | null,
 *   initialising: boolean,
 *   login: (email: string, password: string) => Promise<void>,
 *   register: (name: string, email: string, password: string) => Promise<void>,
 *   logout: () => void
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return context;
}
