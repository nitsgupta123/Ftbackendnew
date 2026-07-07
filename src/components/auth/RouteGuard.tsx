"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export default function RouteGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isPublicPath) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isAuthenticated && isPublicPath) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, isPublicPath, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500">
        Checking session...
      </div>
    );
  }

  if (!isAuthenticated && !isPublicPath) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500">
        Redirecting to sign in...
      </div>
    );
  }

  if (isAuthenticated && isPublicPath) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500">
        Redirecting...
      </div>
    );
  }

  return <>{children}</>;
}
