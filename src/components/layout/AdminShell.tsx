"use client";

import { useEffect, useState, type ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface AdminShellProps {
  breadcrumbs: { label: string; href?: string }[];
  children: ReactNode;
}

export default function AdminShell({ breadcrumbs, children }: AdminShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncSidebarState = () => {
      setSidebarCollapsed(!media.matches);
    };
    syncSidebarState();
    media.addEventListener("change", syncSidebarState);
    return () => media.removeEventListener("change", syncSidebarState);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-0" : "lg:ml-[280px]"
        }`}
      >
        <Header
          breadcrumbs={breadcrumbs}
          sidebarCollapsed={sidebarCollapsed}
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="mx-auto max-w-[1600px] overflow-x-hidden px-3 py-4 sm:px-4 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
