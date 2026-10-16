import { Link, useNavigate, useLocation } from "react-router-dom";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "../ui/icons";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import { navHrefModules } from "@/lib/permission-types";
import { getUserInitials } from "@/lib/auth-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BrandLogo from "./BrandLogo";
import { listAllPackages, getPackageEditHref, getPackageRecordKey } from "@/lib/package-api";
import { listEnquiries } from "@/lib/enquiry-api";
import { enquiryDisplayName } from "@/lib/enquiry-types";
import type { PackageRecord } from "@/lib/package-types";
import type { EnquiryRecord } from "@/lib/enquiry-types";
import { formatPackageDateTime } from "@/lib/format-date";

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

const FRONTEND_URL = (
  import.meta.env.VITE_FRONTEND_URL ?? "https://fayyaztravels.com"
).replace(/\/$/, "");

const QUICK_LINKS = [
  { label: "All Packages", href: "/packages/all", keywords: ["package", "packages", "tour"] },
  { label: "Add Package", href: "/add-package", keywords: ["add", "new", "create", "package"] },
  { label: "Help Desk", href: "/help", keywords: ["help", "guide", "how to", "docs", "manual"] },
  { label: "Enquiries", href: "/enquiry", keywords: ["enquiry", "enquiries", "lead", "leads"] },
  { label: "Suppliers", href: "/suppliers", keywords: ["supplier", "vendors"] },
  { label: "Blogs", href: "/blogs/all", keywords: ["blog", "blogs", "post"] },
  { label: "Pages", href: "/pages/all", keywords: ["page", "pages", "cms"] },
  { label: "Promotions", href: "/promotions", keywords: ["promo", "promotion", "discount"] },
  { label: "User Management", href: "/settings/user-management", keywords: ["user", "users", "admin", "staff"] },
  { label: "Role Management", href: "/settings/role-management", keywords: ["role", "roles", "permission"] },
  { label: "Access Control", href: "/settings/roles", keywords: ["access", "permission", "permissions", "control"] },
] as const;

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export default function Header({
  breadcrumbs,
  onMenuToggle,
  sidebarCollapsed = false,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [openEnquiries, setOpenEnquiries] = useState<EnquiryRecord[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const displayName = user?.fullName ?? "Admin";
  const initials = getUserInitials(displayName);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    setSearchOpen(false);
    setNotificationsOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function ensurePackagesLoaded() {
    if (packagesLoaded || searchLoading) return;
    setSearchLoading(true);
    try {
      const result = await listAllPackages();
      setPackages(result.packages.filter((pkg) => pkg.status !== "deleted"));
      setPackagesLoaded(true);
    } catch {
      setPackages([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function ensureNotificationsLoaded() {
    if (notificationsLoaded || notificationsLoading) return;
    setNotificationsLoading(true);
    try {
      const result = await listEnquiries({
        status: "open",
        sort: "insert_date",
        order: "desc",
        page: 1,
        limit: 8,
      });
      setOpenEnquiries(result.enquiries);
      setNotificationsLoaded(true);
    } catch {
      setOpenEnquiries([]);
    } finally {
      setNotificationsLoading(false);
    }
  }

  const packageResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return packages
      .filter((pkg) => {
        const title = pkg.package_title ?? "";
        const slug = pkg.slug ?? "";
        return (
          matchesQuery(title, q) ||
          matchesQuery(slug, q) ||
          matchesQuery(String(pkg.id), q) ||
          matchesQuery(String(pkg.package_id), q)
        );
      })
      .slice(0, 6);
  }, [packages, searchQuery]);

  const quickLinkResults = useMemo(() => {
    const allowedLinks = QUICK_LINKS.filter((link) =>
      navHrefModules(link.href).every((moduleKey) => can(moduleKey, "view"))
    );
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allowedLinks.slice(0, 5);
    return allowedLinks.filter(
      (link) =>
        link.label.toLowerCase().includes(q) ||
        link.keywords.some((keyword) => keyword.includes(q) || q.includes(keyword))
    ).slice(0, 5);
  }, [searchQuery, can]);

  const goToSearchResults = (query: string) => {
    const q = query.trim();
    setSearchOpen(false);
    if (!q) {
      navigate("/packages/all");
      return;
    }
    navigate(`/packages/all?search=${encodeURIComponent(q)}`);
  };

  const openFrontView = () => {
    window.open(FRONTEND_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-[#E5E7EB] bg-white">
      <div className="flex h-full items-center gap-3 px-3 sm:gap-4 sm:px-4 lg:px-6">
        <div
          className={`flex h-full shrink-0 items-center gap-2 border-r border-[#E5E7EB] pr-3 ${
            sidebarCollapsed ? "" : "lg:hidden"
          }`}
        >
          <Button
            onClick={onMenuToggle}
            variant="ghost"
            className={`${headerControlClass} w-10 p-0 text-gray-500 hover:text-gray-700`}
            aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            <Icon name="Menu" size={20} />
          </Button>

          {sidebarCollapsed && (
            <BrandLogo className="!h-8 !w-auto max-h-8 max-w-[140px] object-contain object-left sm:max-w-none" />
          )}
        </div>

        <nav
          className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto text-sm leading-none sm:flex"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, index) => (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && (
                <span className="shrink-0 text-gray-300" aria-hidden="true">
                  /
                </span>
              )}
              {crumb.href && index < breadcrumbs.length - 1 ? (
                <Link
                  to={crumb.href}
                  className="shrink-0 whitespace-nowrap text-gray-400 hover:text-gray-600"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`shrink-0 whitespace-nowrap ${
                    index === breadcrumbs.length - 1
                      ? "font-medium text-[#1F2A44]"
                      : "text-gray-400"
                  }`}
                >
                  {crumb.label}
                </span>
              )}
            </Fragment>
          ))}
        </nav>

      <div className="flex h-full shrink-0 items-center gap-1.5 sm:gap-2">
        <div ref={searchRef} className="relative hidden md:block">
          <div
            className={`flex h-10 w-[180px] items-center gap-2 px-3 lg:w-[240px] ${headerControlClass}`}
          >
            <Icon name="Search" size={14} className="shrink-0 text-gray-400" />
            <Input
              type="search"
              value={searchQuery}
              placeholder="Search..."
              onFocus={() => {
                setSearchOpen(true);
                void ensurePackagesLoaded();
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  goToSearchResults(searchQuery);
                }
                if (e.key === "Escape") {
                  setSearchOpen(false);
                }
              }}
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-gray-700 shadow-none placeholder:text-gray-400 focus-visible:border-0 focus-visible:ring-0"
            />
          </div>

          {searchOpen && (
            <div className="absolute top-full right-0 z-30 mt-2 w-[320px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg lg:w-[360px]">
              <div className="max-h-[360px] overflow-y-auto py-2">
                {searchLoading && (
                  <p className="px-3 py-2 text-sm text-gray-500">Searching packages...</p>
                )}

                {!searchLoading && quickLinkResults.length > 0 && (
                  <div className="px-2 pb-2">
                    <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                      Go to
                    </p>
                    {quickLinkResults.map((link) => (
                      <button
                        key={link.href}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setSearchOpen(false);
                          navigate(link.href);
                        }}
                      >
                        <Icon name="Search" size={14} className="text-gray-400" />
                        <span>{link.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!searchLoading && searchQuery.trim() && (
                  <div className="border-t border-[#E5E7EB] px-2 pt-2">
                    <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                      Packages
                    </p>
                    {packageResults.length === 0 ? (
                      <p className="px-2 py-2 text-sm text-gray-500">No matching packages</p>
                    ) : (
                      packageResults.map((pkg) => (
                        <button
                          key={getPackageRecordKey(pkg)}
                          type="button"
                          className="flex w-full flex-col rounded-lg px-2 py-2 text-left hover:bg-gray-50"
                          onClick={() => {
                            setSearchOpen(false);
                            navigate(getPackageEditHref(pkg));
                          }}
                        >
                          <span className="truncate text-sm font-medium text-gray-900">
                            {pkg.package_title || "Untitled package"}
                          </span>
                          <span className="truncate text-xs text-gray-500">
                            {pkg.slug ? `/${pkg.slug}` : `ID ${pkg.id}`} ·{" "}
                            {pkg.status.replaceAll("_", " ")}
                          </span>
                        </button>
                      ))
                    )}
                    <button
                      type="button"
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-[#B48A2C] hover:bg-[#B48A2C]/5"
                      onClick={() => goToSearchResults(searchQuery)}
                    >
                      View all results for “{searchQuery.trim()}”
                    </button>
                  </div>
                )}

                {!searchLoading && !searchQuery.trim() && (
                  <p className="px-3 py-2 text-xs text-gray-400">
                    Type to find packages, or jump to a section.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {can("enquiries", "view") && (
          <div ref={notificationsRef} className="relative">
            <Button
              type="button"
              variant="ghost"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                void ensureNotificationsLoaded();
              }}
              className={`relative w-10 p-0 text-gray-500 hover:text-gray-700 ${headerControlClass}`}
            >
              <Icon name="Bell" size={18} />
              {openEnquiries.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
              )}
            </Button>

            {notificationsOpen && (
              <div className="absolute top-full right-0 z-30 mt-2 w-[320px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg sm:w-[360px]">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    <p className="text-xs text-gray-500">
                      {notificationsLoading
                        ? "Loading open enquiries..."
                        : `${openEnquiries.length} open enquir${openEnquiries.length === 1 ? "y" : "ies"}`}
                    </p>
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {notificationsLoading && (
                    <p className="px-4 py-6 text-center text-sm text-gray-500">Loading...</p>
                  )}
                  {!notificationsLoading && openEnquiries.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-gray-500">
                      No open enquiries right now.
                    </p>
                  )}
                  {!notificationsLoading &&
                    openEnquiries.map((enquiry) => (
                      <button
                        key={enquiry.id}
                        type="button"
                        className="flex w-full flex-col gap-0.5 border-b border-[#F3F4F6] px-4 py-3 text-left hover:bg-gray-50"
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate("/enquiry");
                        }}
                      >
                        <span className="truncate text-sm font-medium text-gray-900">
                          {enquiryDisplayName(enquiry)}
                        </span>
                        <span className="truncate text-xs text-gray-500">
                          {enquiry.destinationName || enquiry.destination || "Enquiry"} ·{" "}
                          {formatPackageDateTime(enquiry.insertDate)}
                        </span>
                      </button>
                    ))}
                </div>
                <div className="border-t border-[#E5E7EB] p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-full justify-center rounded-lg text-sm font-medium text-[#B48A2C] hover:bg-[#B48A2C]/5"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate("/enquiry");
                    }}
                  >
                    View all enquiries
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={openFrontView}
          title={`Open ${FRONTEND_URL}`}
          className={`hidden items-center gap-2 px-3 text-sm sm:inline-flex ${headerControlClass}`}
        >
          <Icon name="EyeIcon" size={14} />
          <span>Front View</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={openFrontView}
          title={`Open ${FRONTEND_URL}`}
          aria-label="Front View"
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
      </div>
    </header>
  );
}
