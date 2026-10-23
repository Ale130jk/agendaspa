import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, refreshSession, setAccessToken, subscribeAuthFailure, toApiError } from './api';
import { AuthContext } from './auth-context';
import type { AuthResponse, User } from '../types/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'anonymous'>('loading');

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAuthFailure(() => {
      if (active) {
        setUser(null);
        setStatus('anonymous');
      }
    });

    refreshSession()
      .then((session) => {
        if (active) {
          setUser(session.user);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setStatus('anonymous');
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const applySession = useCallback((session: AuthResponse) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await api.post<AuthResponse>('/auth/login', { email, password });
        return applySession(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (input: { email: string; password: string; fullName: string; phone?: string }) => {
      try {
        const response = await api.post<AuthResponse>('/auth/register', input);
        return applySession(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
