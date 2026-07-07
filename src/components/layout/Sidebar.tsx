"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../ui/icons";
import { NAV_ITEMS } from "@/lib/constants";
import { NavItem } from "@/lib/types";
import BrandLogo from "./BrandLogo";
import { Button } from "@/components/ui/button";

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
    w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-150
    ${
      isActive || hasActiveChild
        ? "bg-white text-[#B48A2C] font-medium rounded-lg mx-2 border border-[#E5E7EB]"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg mx-2"
    }
    ${depth === 0 ? "font-medium" : ""}
  `;

  const childTextClasses = `
    w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors duration-150 rounded-lg mx-2
    ${
      isActive
        ? "bg-white text-[#B48A2C] font-medium border border-[#E5E7EB]"
        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
    }
  `;

  const iconClasses = `flex-shrink-0 ${
    isActive || hasActiveChild ? "text-[#B48A2C]" : "text-gray-400"
  }`;

  if (!hasChildren && item.href) {
    return (
      <Link
        href={item.href}
        className={depth === 0 ? itemClasses : childTextClasses}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {depth === 0 && item.icon && (
          <Icon name={item.icon} size={18} className={iconClasses} />
        )}
        <span className="flex-1 truncate">{item.label}</span>
      </Link>
    );
  }

  if (!hasChildren) {
    return (
      <div
        className={`${depth === 0 ? itemClasses : childTextClasses} cursor-default opacity-60`}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {depth === 0 && item.icon && (
          <Icon name={item.icon} size={18} className={iconClasses} />
        )}
        <span className="flex-1 truncate">{item.label}</span>
      </div>
    );
  }

  if (hasChildren && item.href) {
    return (
      <div>
        <div
          className={depth === 0 ? itemClasses : childTextClasses}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {depth === 0 && item.icon && (
            <Icon name={item.icon} size={18} className={iconClasses} />
          )}
          <Link href={item.href} className="flex-1 truncate hover:underline">
            {item.label}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 shrink-0 text-gray-400 hover:text-gray-600"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
          >
            <Icon name={expanded ? "ChevronDown" : "ChevronRight"} size={14} />
          </Button>
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
      <Button
        variant="ghost"
        onClick={() => setExpanded(!expanded)}
        className={depth === 0 ? itemClasses : childTextClasses}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {depth === 0 && item.icon && (
          <Icon name={item.icon} size={18} className={iconClasses} />
        )}
        <span className="flex-1 truncate">{item.label}</span>
        <Icon
          name={expanded ? "ChevronDown" : "ChevronRight"}
          size={14}
          className="text-gray-400 flex-shrink-0"
        />
      </Button>
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
          fixed top-0 left-0 h-full bg-white border-r border-[#E5E7EB] z-40
          transition-all duration-300 flex flex-col
          ${collapsed ? "-translate-x-full lg:translate-x-0 lg:w-[72px]" : "translate-x-0 w-[280px]"}
        `}
      >
        <div className="h-16 flex items-center gap-3 px-4 border-b border-[#E5E7EB] flex-shrink-0">
          <Button
            variant="ghost"
            onClick={onToggle}
            className="lg:hidden flex items-center justify-center w-10 h-10 text-gray-500 hover:text-gray-700"
          >
            <Icon name="X" size={20} />
          </Button>
          {!collapsed ? (
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <BrandLogo />
              <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                Admin Panel
              </span>
            </div>
          ) : (
            <BrandLogo variant="icon" className="mx-auto" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavTreeItem key={item.label} item={item} />
          ))}
        </nav>

        {!collapsed && (
          <div className="p-4 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B48A2C]/10 flex items-center justify-center">
                <Icon name="User" size={16} className="text-[#B48A2C]" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Admin User
                </p>
                <p className="text-xs text-gray-400">admin@fayyaztravels.com</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
