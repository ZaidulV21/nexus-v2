import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService, type LoginInput } from '@/services/authService';
import { setAuthToken, setUnauthorizedHandler } from '@/lib/api';
import type { AuthActor } from '@/types';

interface AuthContextValue {
  actor: AuthActor | null;
  token: string | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'nexus.auth.token';
const ACTOR_KEY = 'nexus.auth.actor';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [actor, setActor] = useState<AuthActor | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setActor(null);
    setAuthToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACTOR_KEY);
  }, []);

  // Restore session from localStorage on first load, and wire the API
  // client's 401 handler to a clean logout so an expired token anywhere
  // in the app drops the user back to /login rather than showing broken data.
  useEffect(() => {
    setUnauthorizedHandler(logout);

    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedActor = localStorage.getItem(ACTOR_KEY);
    if (storedToken && storedActor) {
      setAuthToken(storedToken);
      setToken(storedToken);
      setActor(JSON.parse(storedActor));
    }
    setIsInitializing(false);
  }, [logout]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await authService.login(input);
    setAuthToken(result.token);
    setToken(result.token);
    setActor(result.actor);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(ACTOR_KEY, JSON.stringify(result.actor));
  }, []);

  const value = useMemo(
    () => ({ actor, token, isInitializing, isAuthenticated: !!token, login, logout }),
    [actor, token, isInitializing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
