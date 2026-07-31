"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../ui/icons";
import { NAV_ITEMS } from "@/lib/constants";
import { NavItem } from "@/lib/types";
import BrandLogo from "./BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import { NAV_HREF_MODULE } from "@/lib/permission-types";

function isNavPathActive(pathname: string, href: string): boolean {
  if (href === "/add-package") {
    return pathname.startsWith("/add-package");
  }
  if (href === "/packages") {
    return pathname === "/packages";
  }
  if (href === "/blogs/all") {
    return pathname === "/blogs/all";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActiveDescendant(pathname: string, item: NavItem): boolean {
  if (item.href && isNavPathActive(pathname, item.href)) {
    return true;
  }
  return item.children?.some((child) => hasActiveDescendant(pathname, child)) ?? false;
}

function resolveModuleKey(item: NavItem): string | null {
  if (item.href && NAV_HREF_MODULE[item.href]) {
    return NAV_HREF_MODULE[item.href];
  }
  if (item.label === "Destinations") return null;
  if (item.label === "Promotions") return null;
  if (item.label === "Blogs Management") return "blogs";
  if (item.label === "Page Management") return "pages";
  if (item.label === "Packages") return "packages";
  if (item.label === "Settings") return "settings";
  return null;
}

function filterNavByPermission(
  items: NavItem[],
  canView: (moduleKey: string) => boolean
): NavItem[] {
  return items
    .map((item) => {
      const children = item.children
        ? filterNavByPermission(item.children, canView)
        : undefined;

      if (children && children.length > 0) {
        return { ...item, children };
      }

      if (item.href) {
        const hrefModule = NAV_HREF_MODULE[item.href];
        if (hrefModule && !canView(hrefModule)) {
          return null;
        }
        const { children: _omit, ...rest } = item;
        return children ? { ...rest, children: [] } : rest;
      }

      const moduleKey = resolveModuleKey(item);
      if (moduleKey && !canView(moduleKey)) {
        return null;
      }

      // Parent with no visible children and no href → hide
      if (item.children) {
        return null;
      }

      return item;
    })
    .filter((item): item is NavItem => item != null);
}

function NavTreeItem({
  item,
  depth = 0,
}: {
  item: NavItem;
  depth?: number;
}) {
  const pathname = usePathname();
  const hasChildren = Boolean(item.children?.length);
  const [expanded, setExpanded] = useState(() => hasActiveDescendant(pathname, item));

  const isActive =
    Boolean(item.href) &&
    isNavPathActive(pathname, item.href!) &&
    !hasChildren;
  const hasActiveChild = hasChildren && hasActiveDescendant(pathname, item);
  const paddingLeft = 16 + depth * 16;

  const itemClasses = `
    w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-150 box-border
    ${
      isActive || hasActiveChild
        ? "bg-white text-[#B48A2C] font-medium rounded-lg border border-[#E5E7EB]"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-transparent"
    }
    ${depth === 0 ? "font-medium" : ""}
  `;

  const childTextClasses = `
    w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors duration-150 rounded-lg box-border
    ${
      isActive
        ? "bg-white text-[#B48A2C] font-medium border border-[#E5E7EB]"
        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
    }
  `;

  const iconClasses = `flex-shrink-0 ${
    isActive || hasActiveChild ? "text-[#B48A2C]" : "text-gray-400"
  }`;

  const chevronIcon = (
    <Icon
      name={expanded ? "ChevronDown" : "ChevronRight"}
      size={14}
      className="shrink-0 text-gray-400"
    />
  );

  if (!hasChildren && item.href) {
    return (
      <div className="mx-2">
        <Link
          href={item.href}
          className={depth === 0 ? itemClasses : childTextClasses}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {depth === 0 && item.icon && (
            <Icon name={item.icon} size={18} className={iconClasses} />
          )}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </Link>
      </div>
    );
  }

  if (!hasChildren) {
    return (
      <div className="mx-2">
        <div
          className={`${depth === 0 ? itemClasses : childTextClasses} cursor-default opacity-60`}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {depth === 0 && item.icon && (
            <Icon name={item.icon} size={18} className={iconClasses} />
          )}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </div>
      </div>
    );
  }

  if (hasChildren && item.href) {
    return (
      <div>
        <div className="mx-2">
          <div
            className={depth === 0 ? itemClasses : childTextClasses}
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {depth === 0 && item.icon && (
              <Icon name={item.icon} size={18} className={iconClasses} />
            )}
            <Link href={item.href} className="min-w-0 flex-1 truncate hover:underline">
              {item.label}
            </Link>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:text-gray-600"
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
            >
              {chevronIcon}
            </button>
          </div>
        </div>
        {expanded && (
          <div className="mt-1">
            {item.children?.map((child) => (
              <NavTreeItem key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mx-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={depth === 0 ? itemClasses : childTextClasses}
          style={{ paddingLeft: `${paddingLeft}px` }}
          aria-expanded={expanded}
        >
          {depth === 0 && item.icon && (
            <Icon name={item.icon} size={18} className={iconClasses} />
          )}
          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
          <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center">
            {chevronIcon}
          </span>
        </button>
      </div>
      {expanded && (
        <div className="mt-1">
          {item.children?.map((child) => (
            <NavTreeItem key={child.label} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { user } = useAuth();
  const { can, loading } = usePermissions();

  const visibleNav = useMemo(() => {
    if (loading && !user) return NAV_ITEMS;
    return filterNavByPermission(NAV_ITEMS, (moduleKey) => can(moduleKey, "view"));
  }, [can, loading, user]);

  return (
    <>
      {!collapsed && (
        <div
          className="fixed inset-0 bg-[#B48A2C]/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-[280px] bg-white border-r border-[#E5E7EB] z-40 overflow-x-hidden
          transition-transform duration-300 flex flex-col
          ${collapsed ? "-translate-x-full" : "translate-x-0"}
        `}
      >
        <div className="h-16 flex items-center gap-3 px-4 border-b border-[#E5E7EB] flex-shrink-0">
          <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
            <BrandLogo />
          </div>
          <Button
            variant="ghost"
            onClick={onToggle}
            className="flex items-center justify-center w-10 h-10 shrink-0 text-gray-500 hover:text-gray-700"
            aria-label="Close sidebar"
          >
            <Icon name="Menu" size={20} />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-0.5">
          {visibleNav.map((item) => (
            <NavTreeItem key={item.label} item={item} />
          ))}
        </nav>

        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#B48A2C]/10 flex items-center justify-center">
              <Icon name="User" size={16} className="text-[#B48A2C]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.fullName ?? "Admin User"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.email ?? "admin@fayyaztravels.com"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
