import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { FORGOT_PASSWORD_PATH, LEGACY_PASSWORD_RECOVERY_PATH } from "@/lib/auth-paths";

const PUBLIC_PATHS = new Set([
  "/login",
  "/signup",
  "/verify-email",
  FORGOT_PASSWORD_PATH,
  LEGACY_PASSWORD_RECOVERY_PATH,
  "/reset-password",
]);

export default function RouteGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!isAuthenticated && !isPublicPath) {
      navigate(`/login?next=${encodeURIComponent(pathname)}`, { replace: true });
      return;
    }

    if (isAuthenticated && isPublicPath) {
      navigate("/", { replace: true });
    }
  }, [mounted, isAuthenticated, isLoading, isPublicPath, pathname, navigate]);

  if (isPublicPath) {
    if (mounted && isAuthenticated && !isLoading) {
      return (
        <div
          className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500"
          suppressHydrationWarning
        >
          Redirecting...
        </div>
      );
    }
    return <>{children}</>;
  }

  // Authenticated (including cached session): never block the app shell.
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Still hydrating / validating with no session yet.
  if (!mounted || isLoading) {
    return (
      <div
        className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500"
        suppressHydrationWarning
      >
        Checking session...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500"
      suppressHydrationWarning
    >
      Redirecting to sign in...
    </div>
  );
}
