"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { useAuth } from "@/components/auth/AuthProvider";
import PageListTable from "@/components/pages/PageListTable";
import PageDetailsModal from "@/components/pages/PageDetailsModal";
import { listPages } from "@/lib/page-api";
import {
  PAGE_SORT_OPTIONS,
  PAGE_STATUS_FILTER_OPTIONS,
  PAGE_TYPE_OPTIONS,
  type CmsPageRecord,
  type PageStatus,
  type PageStatusFilter,
} from "@/lib/page-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

interface PagesPanelProps {
  defaultStatus?: PageStatus;
  hideStatusFilter?: boolean;
}

export default function PagesPanel({ defaultStatus, hideStatusFilter = false }: PagesPanelProps) {
  const { user } = useAuth();
  const canDelete = user?.role === "super_admin";

  const [pages, setPages] = useState<CmsPageRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
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
      void loadPages();
    });
  }, [loadPages]);

  useEffect(() => {
    if (defaultStatus) {
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

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div />
        <Link
          href="/pages/new"
          className="inline-flex h-11 px-5 items-center justify-center text-sm font-semibold text-white bg-[#B48A2C] rounded-xl hover:bg-[#B48A2C]/90 shadow-sm"
        >
          + Create New Page
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
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
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-white text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!hideStatusFilter && (
            <NativeSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as PageStatusFilter);
                setPage(1);
              }}
              className="h-10 min-w-[140px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm"
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
            className="h-10 min-w-[130px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm"
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
            className="h-10 min-w-[160px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm"
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
            className="h-10 min-w-[120px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </NativeSelect>
        </div>

        {!loading && total > 0 && (
          <p className="text-xs text-gray-400 lg:ml-auto">
            {pages.length} of {total} pages
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

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
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-40"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      )}

      <PageDetailsModal page={viewingPage} onClose={() => setViewingPage(null)} />
    </>
  );
}
