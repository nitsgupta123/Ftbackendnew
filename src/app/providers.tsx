"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import RouteGuard from "@/components/auth/RouteGuard";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RouteGuard>{children}</RouteGuard>
    </AuthProvider>
  );
}
