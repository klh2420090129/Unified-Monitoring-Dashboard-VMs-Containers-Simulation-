import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { request } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    request('/api/me', { token })
      .then((payload) => setUser(payload.user))
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      signIn: async (credentials) => {
        const payload = await request('/api/auth/login', { method: 'POST', body: credentials });
        setToken(payload.token);
        setUser(payload.user);
      },
      signUp: async (credentials) => {
        const payload = await request('/api/auth/signup', { method: 'POST', body: credentials });
        setToken(payload.token);
        setUser(payload.user);
      },
      signOut: () => {
        setToken(null);
        setUser(null);
      }
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}