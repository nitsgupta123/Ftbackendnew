"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import PageListTable from "@/components/pages/PageListTable";
import PageDetailsModal from "@/components/pages/PageDetailsModal";
import { getPageStats, listPages } from "@/lib/page-api";
import {
  PAGE_SORT_OPTIONS,
  PAGE_STATUS_FILTER_OPTIONS,
  PAGE_TYPE_OPTIONS,
  type CmsPageRecord,
  type PageStats,
  type PageStatus,
  type PageStatusFilter,
} from "@/lib/page-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const GOLD = "#A68231";
const filterControlClass =
  "h-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";

interface PagesPanelProps {
  defaultStatus?: PageStatus;
  hideStatusFilter?: boolean;
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E8ECF0] bg-white px-4 py-3.5 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: accent ? `${accent}14` : `${GOLD}14`,
          color: accent ?? GOLD,
        }}
      >
        <Icon name={icon} size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-[#1F2A44] leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function PagesPanel({ defaultStatus, hideStatusFilter = false }: PagesPanelProps) {
  const { can } = usePermissions();
  const canDelete = can("pages", "delete");

  const [pages, setPages] = useState<CmsPageRecord[]>([]);
  const [stats, setStats] = useState<PageStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PageStatusFilter>(defaultStatus ?? "all");
  const [typeFilter, setTypeFilter] = useState("");
  const [sort, setSort] = useState<"published_at" | "created_at" | "title" | "display_order">(
    "display_order"
  );
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [viewingPage, setViewingPage] = useState<CmsPageRecord | null>(null);
  const limit = 20;

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await getPageStats();
      setStats(result);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPages({
        search: search.trim() || undefined,
        status: statusFilter,
        page_type: typeFilter || undefined,
        sort,
        order,
        page,
        limit,
      });
      setPages(result.pages);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pages");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, sort, order, page]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStats();
      void loadPages();
    });
  }, [loadStats, loadPages]);

  const prevDefaultStatus = useRef(defaultStatus);
  useEffect(() => {
    if (defaultStatus && defaultStatus !== prevDefaultStatus.current) {
      prevDefaultStatus.current = defaultStatus;
      setStatusFilter(defaultStatus);
    }
  }, [defaultStatus]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return `No pages match "${search.trim()}".`;
    if (statusFilter !== "all") {
      const label =
        PAGE_STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
      return `No ${label.toLowerCase()} pages found.`;
    }
    return "No pages found. Create your first page to get started.";
  }, [search, statusFilter]);

  const inNavOnPage = useMemo(() => pages.filter((p) => p.show_in_nav).length, [pages]);

  const statCards = useMemo(() => {
    const busy = loading || statsLoading;

    if (defaultStatus === "published") {
      return [
        { label: "Published Pages", value: busy ? "—" : total, icon: "CheckCircle", accent: "#27AE60" },
        { label: "In Navigation", value: busy ? "—" : inNavOnPage, icon: "Menu" },
        { label: "All Pages", value: busy ? "—" : (stats?.total ?? 0), icon: "FileStack" },
      ];
    }
    if (defaultStatus === "draft") {
      return [
        { label: "Draft Pages", value: busy ? "—" : total, icon: "FileText" },
        { label: "Published", value: busy ? "—" : (stats?.published ?? 0), icon: "CheckCircle", accent: "#27AE60" },
        { label: "Archived", value: busy ? "—" : (stats?.archived ?? 0), icon: "Archive" },
      ];
    }
    if (defaultStatus === "archived") {
      return [
        { label: "Archived Pages", value: busy ? "—" : total, icon: "Archive" },
        { label: "Published", value: busy ? "—" : (stats?.published ?? 0), icon: "CheckCircle", accent: "#27AE60" },
        { label: "Draft Pages", value: busy ? "—" : (stats?.draft ?? 0), icon: "FileText" },
      ];
    }

    return [
      { label: "Total Pages", value: busy ? "—" : (stats?.total ?? total), icon: "FileText" },
      { label: "Published", value: busy ? "—" : (stats?.published ?? 0), icon: "CheckCircle", accent: "#27AE60" },
      { label: "In Navigation", value: busy ? "—" : (stats?.in_nav ?? 0), icon: "Menu" },
    ];
  }, [defaultStatus, inNavOnPage, loading, stats, statsLoading, total]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Icon
              name="Search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, slug, or excerpt..."
              className={`w-full pl-9 pr-3 ${filterControlClass}`}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {!hideStatusFilter && (
              <NativeSelect
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as PageStatusFilter);
                  setPage(1);
                }}
                wrapperClassName="w-auto shrink-0"
                className={`min-w-[140px] px-3 pr-9 ${filterControlClass}`}
              >
                {PAGE_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            )}

            <NativeSelect
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[130px] px-3 pr-9 ${filterControlClass}`}
            >
              {PAGE_TYPE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as "published_at" | "created_at" | "title" | "display_order")
              }
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[160px] px-3 pr-9 ${filterControlClass}`}
            >
              {PAGE_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={order}
              onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[120px] px-3 pr-9 ${filterControlClass}`}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </NativeSelect>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#FAFBFC]">
          <p className="text-xs text-gray-500">
            {loading ? (
              "Loading pages…"
            ) : total > 0 ? (
              <>
                Showing <span className="font-medium text-gray-700">{pages.length}</span> of{" "}
                <span className="font-medium text-gray-700">{total}</span> pages
              </>
            ) : (
              "No pages to display"
            )}
          </p>
        </div>

        <PageListTable
          pages={pages}
          loading={loading}
          emptyMessage={emptyMessage}
          canDelete={canDelete}
          onView={setViewingPage}
          onPageRemoved={(id) => {
            setPages((prev) => prev.filter((p) => p.id !== id));
            setTotal((t) => Math.max(0, t - 1));
          }}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E8ECF0] bg-[#FAFBFC]">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm"
              >
                <Icon name="ChevronLeft" size={16} className="mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm"
              >
                Next
                <Icon name="ChevronRight" size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <PageDetailsModal page={viewingPage} onClose={() => setViewingPage(null)} />
    </>
  );
}
