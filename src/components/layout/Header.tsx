"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../ui/icons";
import { useAuth } from "@/components/auth/AuthProvider";
import { getUserInitials } from "@/lib/auth-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BrandLogo from "./BrandLogo";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  breadcrumbs: BreadcrumbItem[];
  onMenuToggle: () => void;
  sidebarCollapsed?: boolean;
}

const headerControlClass =
  "h-10 shrink-0 rounded-xl border border-[#E5E7EB] bg-white text-[#1F2A44] hover:bg-gray-50 transition-colors";

export default function Header({
  breadcrumbs,
  onMenuToggle,
  sidebarCollapsed = false,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = user?.fullName ?? "Admin";
  const initials = getUserInitials(displayName);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-[#E5E7EB] bg-white px-3 shadow-sm sm:gap-3 sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          onClick={onMenuToggle}
          variant="ghost"
          className={`${headerControlClass} w-10 p-0 text-gray-500 hover:text-gray-700 ${
            sidebarCollapsed ? "" : "lg:hidden"
          }`}
          aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
        >
          <Icon name="Menu" size={20} />
        </Button>

        {sidebarCollapsed && <BrandLogo className="h-8" />}

        <nav className="max-w-[45vw] overflow-x-auto whitespace-nowrap text-sm sm:max-w-none" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.label} className="flex shrink-0 items-center gap-2">
              {index > 0 && <span className="text-gray-300">/</span>}
              {crumb.href && index < breadcrumbs.length - 1 ? (
                <a
                  href={crumb.href}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                >
                  {crumb.label}
                </a>
              ) : (
                <span
                  className={
                    index === breadcrumbs.length - 1
                      ? "font-medium text-gray-900"
                      : "text-gray-400"
                  }
                >
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
        <div
          className={`hidden h-10 items-center gap-2 px-3 md:flex md:min-w-[180px] md:max-w-xs md:flex-1 lg:min-w-[240px] ${headerControlClass}`}
        >
          <Icon name="Search" size={14} className="shrink-0 text-gray-400" />
          <Input
            type="text"
            placeholder="Search..."
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-700 shadow-none placeholder:text-gray-400 focus-visible:border-0 focus-visible:ring-0"
          />
        </div>

        <Button
          variant="ghost"
          className={`relative w-10 p-0 text-gray-500 hover:text-gray-700 ${headerControlClass}`}
        >
          <Icon name="Bell" size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </Button>

        <Button
          variant="ghost"
          className={`hidden items-center gap-2 px-3 text-sm sm:inline-flex ${headerControlClass}`}
        >
          <Icon name="EyeIcon" size={14} />
          <span>Front View</span>
        </Button>

        <Button
          variant="ghost"
          className={`w-10 p-0 text-gray-500 hover:text-gray-700 sm:hidden ${headerControlClass}`}
        >
          <Icon name="EyeIcon" size={18} />
        </Button>

        <div className="relative shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMenuOpen((open) => !open)}
            className={`flex items-center gap-2 px-2 ${headerControlClass}`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1F2A44] to-[#B48A2C]">
              <span className="text-xs font-semibold text-white">{initials}</span>
            </div>
            <span className="hidden text-sm leading-none text-gray-700 sm:block">
              {displayName}
            </span>
            <Icon name="ChevronDown" size={14} className="hidden text-gray-400 sm:block" />
          </Button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default bg-transparent"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute top-full right-0 z-20 mt-2 w-48 rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg">
                <div className="border-b border-[#E5E7EB] px-3 py-2">
                  <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleLogout}
                  className="h-auto w-full justify-start rounded-none px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
