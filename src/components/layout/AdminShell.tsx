import { useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface AdminShellProps {
  breadcrumbs: { label: string; href?: string }[];
  children: ReactNode;
}

export default function AdminShell({ breadcrumbs, children }: AdminShellProps) {
  const { pathname } = useLocation();
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
          {children}
        </main>
      </div>
    </div>
  );
}
