import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCurrentUser,
  loginRequest,
  signupRequest,
  verifyEmailRequest,
} from "@/lib/auth-api";
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
} from "@/lib/auth-storage";
import type {
  AdminUser,
  LoginInput,
  SignupInput,
  SignupResult,
} from "@/lib/auth-types";

const SESSION_CHECK_TIMEOUT_MS = 8_000;

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<SignupResult>;
  verifyEmail: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function isUnauthorizedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /unauthorized|invalid token|jwt|401/i.test(message);
}

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
    applySession(storedToken, currentUser);
  }, [applySession, clearSession]);

  useLayoutEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);

    async function bootstrap() {
      const storedToken = getStoredToken();
      const cachedUser = getStoredUser();

      if (!storedToken) {
        if (!cancelled) {
          clearSession();
          setIsLoading(false);
        }
        return;
      }

      // Restore cached session before paint so RouteGuard does not stick.
      if (!cancelled) {
        setToken(storedToken);
        if (cachedUser) {
          setUser(cachedUser);
          setIsLoading(false);
        }
      }

      try {
        const { user: currentUser } = await fetchCurrentUser(controller.signal);
        if (cancelled) return;
        applySession(storedToken, currentUser);
      } catch (error) {
        if (cancelled || isAbortError(error)) {
          return;
        }
        if (isUnauthorizedError(error)) {
          clearSession();
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await loginRequest(input);
      applySession(result.token, result.user);
      setIsLoading(false);
    },
    [applySession]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const result = await signupRequest(input);
      if (result.status === "authenticated") {
        applySession(result.token, result.user);
        setIsLoading(false);
      }
      return result;
    },
    [applySession]
  );

  const verifyEmail = useCallback(
    async (verificationToken: string) => {
      const result = await verifyEmailRequest(verificationToken);
      applySession(result.token, result.user);
      setIsLoading(false);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearSession();
    setIsLoading(false);
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      signup,
      verifyEmail,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, signup, verifyEmail, logout, refreshUser]
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
