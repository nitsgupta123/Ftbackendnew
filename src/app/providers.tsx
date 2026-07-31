"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { PermissionsProvider } from "@/components/auth/PermissionsProvider";
import RouteGuard from "@/components/auth/RouteGuard";
import { Toaster } from "@/components/ui/sonner";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <RouteGuard>{children}</RouteGuard>
        <Toaster richColors position="top-right" />
      </PermissionsProvider>
    </AuthProvider>
  );
}
