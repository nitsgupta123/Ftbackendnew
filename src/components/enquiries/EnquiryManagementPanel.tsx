import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import EnquiryStatsGrid from "@/components/enquiries/EnquiryStatsGrid";
import EnquiryListTable from "@/components/enquiries/EnquiryListTable";
import EnquiryDetailsModal from "@/components/enquiries/EnquiryDetailsModal";
import { getEnquiryStats, listEnquiries } from "@/lib/enquiry-api";
import type { EnquiryRecord } from "@/lib/enquiry-types";
import {
  ENQUIRY_SORT_OPTIONS,
  ENQUIRY_STATUS_FILTER_OPTIONS,
  ENQUIRY_TYPE_FILTER_OPTIONS,
  type EnquirySortField,
  type EnquiryStats,
  type EnquiryStatusFilter,
  type EnquiryTypeFilter,
} from "@/lib/enquiry-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

const filterControlClass =
  "h-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";

export default function EnquiryManagementPanel() {
  const [stats, setStats] = useState<EnquiryStats | null>(null);
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnquiryStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<EnquiryTypeFilter>("all");
  const [sort, setSort] = useState<EnquirySortField>("insert_date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<EnquiryRecord | null>(null);
  const limit = 20;

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { stats: nextStats } = await getEnquiryStats();
      setStats(nextStats);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listEnquiries({
        search: search.trim() || undefined,
        status: statusFilter,
        type: typeFilter,
        sort,
        order,
        page,
        limit,
      });
      setEnquiries(result.enquiries);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, sort, order, page]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStats();
    });
  }, [loadStats]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadEnquiries();
    });
  }, [loadEnquiries]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return `No enquiries match "${search.trim()}".`;
    if (statusFilter !== "all" || typeFilter !== "all") {
      return "No enquiries match the selected filters.";
    }
    return "No enquiries found.";
  }, [search, statusFilter, typeFilter]);

  return (
    <>
      <div className="mb-5">
        <EnquiryStatsGrid stats={stats} loading={statsLoading} />
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
              placeholder="Search name, email, phone, or message..."
              className={`w-full pl-9 pr-3 ${filterControlClass}`}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as EnquiryStatusFilter);
                setPage(1);
              }}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[140px] px-3 pr-9 ${filterControlClass}`}
            >
              {ENQUIRY_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as EnquiryTypeFilter);
                setPage(1);
              }}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[160px] px-3 pr-9 ${filterControlClass}`}
            >
              {ENQUIRY_TYPE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={sort}
              onChange={(e) => setSort(e.target.value as EnquirySortField)}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[160px] px-3 pr-9 ${filterControlClass}`}
            >
              {ENQUIRY_SORT_OPTIONS.map((option) => (
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
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </NativeSelect>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
            <span>
              {error}
              {error === "Unauthorized" ? (
                <>
                  {" "}
                  — please{" "}
                  <Link to="/login" className="underline font-medium">
                    sign in again
                  </Link>
                  .
                </>
              ) : null}
            </span>
          </div>
        )}

        <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#FAFBFC]">
          <p className="text-xs text-gray-500">
            {loading ? (
              "Loading enquiries…"
            ) : total > 0 ? (
              <>
                Showing{" "}
                <span className="font-medium text-gray-700">
                  {enquiries.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-700">{total}</span>{" "}
                enquiries
              </>
            ) : (
              "No enquiries to display"
            )}
          </p>
        </div>

        <EnquiryListTable
          enquiries={enquiries}
          loading={loading}
          emptyMessage={emptyMessage}
          onView={setViewing}
          onEnquiryUpdated={(updated) => {
            setEnquiries((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            );
            if (viewing?.id === updated.id) setViewing(updated);
            void loadStats();
          }}
          onEnquiryRemoved={(id) => {
            setEnquiries((prev) => prev.filter((item) => item.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
            if (viewing?.id === id) setViewing(null);
            void loadStats();
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

      <EnquiryDetailsModal
        enquiry={viewing}
        onClose={() => setViewing(null)}
      />
    </>
  );
}
