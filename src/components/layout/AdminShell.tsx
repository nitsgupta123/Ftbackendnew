import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";

import { usePermissions } from "@/components/auth/PermissionsProvider";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Icon } from "@/components/ui/icons";
import { routeModules } from "@/lib/permission-types";

interface AdminShellProps {
  breadcrumbs: { label: string; href?: string }[];
  children: ReactNode;
}

export default function AdminShell({ breadcrumbs, children }: AdminShellProps) {
  const { pathname } = useLocation();
  const { can, loading: permissionsLoading } = usePermissions();
  const accessDenied =
    !permissionsLoading &&
    !routeModules(pathname).every((moduleKey) => can(moduleKey, "view"));
  // null until hydrated — avoids open/close flip (page-load animation) on first paint
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncSidebarState = () => {
      setSidebarCollapsed(!media.matches);
    };
    syncSidebarState();
    media.addEventListener("change", syncSidebarState);
    return () => media.removeEventListener("change", syncSidebarState);
  }, []);

  const isCollapsed = sidebarCollapsed === true;

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => (prev === false ? true : false));
  };

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    if (media.matches) return;
    setSidebarCollapsed(true);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <div
        className={`flex h-screen flex-col overflow-hidden ${
          isCollapsed ? "lg:ml-0" : "lg:ml-[280px]"
        }`}
      >
        <Header
          breadcrumbs={breadcrumbs}
          sidebarCollapsed={isCollapsed}
          onMenuToggle={toggleSidebar}
        />
        <main className="mx-auto w-full max-w-[1600px] flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-4 lg:px-8 lg:py-8">
          {accessDenied ? (
            <div className="mx-auto mt-12 max-w-md rounded-xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                <Icon name="Shield" size={22} className="text-amber-500" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">You don&apos;t have access</h1>
              <p className="mt-2 text-sm text-gray-500">
                Your role does not include permission to view this section. Ask an administrator if
                you need access.
              </p>
              {pathname !== "/" && (
                <Link
                  to="/"
                  className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#B48A2C] px-4 text-sm font-medium text-white hover:bg-[#9c7726]"
                >
                  Back to dashboard
                </Link>
              )}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
