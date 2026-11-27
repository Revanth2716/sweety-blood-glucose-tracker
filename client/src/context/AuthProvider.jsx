import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { AuthContext } from './authContext.js';

const TOKEN_KEY = 'sweety.token';
const USER_KEY = 'sweety.user';

/**
 * @returns {{ id: string, name: string, email: string } | null}
 */
function readStoredUser() {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Keeps the signed in user and the access token, and stores them in the browser.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [initialising, setInitialising] = useState(Boolean(token));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Check that a stored token is still valid when the app starts.
  useEffect(() => {
    if (!token) {
      setInitialising(false);
      return undefined;
    }

    let cancelled = false;

    apiFetch('/auth/me', { token })
      .then(({ user: currentUser }) => {
        if (!cancelled) {
          setUser(currentUser);
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInitialising(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  /**
   * @param {{ user: object, token: string }} session
   */
  const storeSession = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setToken(session.token);
    setUser(session.user);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const session = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      storeSession(session);
    },
    [storeSession],
  );

  const register = useCallback(
    async (name, email, password) => {
      const session = await apiFetch('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      storeSession(session);
    },
    [storeSession],
  );

  const value = useMemo(
    () => ({ user, token, initialising, login, register, logout }),
    [user, token, initialising, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
