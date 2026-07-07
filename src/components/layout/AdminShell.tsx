"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface AdminShellProps {
  breadcrumbs: { label: string; href?: string }[];
  children: ReactNode;
}

export default function AdminShell({ breadcrumbs, children }: AdminShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[280px]"
        }`}
      >
        <Header
          breadcrumbs={breadcrumbs}
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="p-4 lg:p-8 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
