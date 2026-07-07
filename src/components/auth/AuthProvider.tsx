"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCurrentUser, loginRequest, signupRequest } from "@/lib/auth-api";
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
} from "@/lib/auth-storage";
import type { AdminUser, LoginInput, SignupInput } from "@/lib/auth-types";

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((nextToken: string, nextUser: AdminUser) => {
    setStoredAuth(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = getStoredToken();
    if (!storedToken) {
      clearSession();
      return;
    }

    const { user: currentUser } = await fetchCurrentUser();
    setStoredAuth(storedToken, currentUser);
    setToken(storedToken);
    setUser(currentUser);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedToken = getStoredToken();
      const cachedUser = getStoredUser();

      if (!storedToken) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      setToken(storedToken);
      if (cachedUser) {
        setUser(cachedUser);
      }

      try {
        await refreshUser();
      } catch {
        clearSession();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearSession, refreshUser]);

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await loginRequest(input);
      applySession(result.token, result.user);
    },
    [applySession]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const result = await signupRequest(input);
      applySession(result.token, result.user);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
