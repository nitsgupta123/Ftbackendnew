import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Icon } from "@/components/ui/icons";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import SupplierListTable from "@/components/suppliers/SupplierListTable";
import SupplierForm from "@/components/suppliers/SupplierForm";
import SupplierDetailsModal from "@/components/suppliers/SupplierDetailsModal";
import SupplierStatsGrid from "@/components/suppliers/SupplierStatsGrid";
import {
  createSupplier,
  getSuppliersStats,
  listSupplierCountries,
  listSuppliers,
  updateSupplier,
} from "@/lib/supplier-api";
import {
  SUPPLIER_RELATIONSHIP_FILTER_OPTIONS,
  SUPPLIER_SORT_OPTIONS,
  SUPPLIER_STATUS_FILTER_OPTIONS,
  type SupplierRecord,
  type SupplierRelationshipFilter,
  type SupplierSortField,
  type SupplierStatusFilter,
  type SuppliersStats,
} from "@/lib/supplier-types";
import type { CreateSupplierFormValues } from "@/lib/validation";
import { downloadSuppliersExcel } from "@/lib/supplier-excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const PAGE_SIZE = 10;
const filterControlClass =
  "h-9 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";
const filterSelectClass =
  `${filterControlClass} !w-full max-w-full shrink-0 px-2.5 pr-7`;

type FormMode = "create" | "edit" | null;

export interface SuppliersPanelHandle {
  openCreate: () => void;
}

const SuppliersPanel = forwardRef<SuppliersPanelHandle>(function SuppliersPanel(_, ref) {
  const { can } = usePermissions();
  const canDelete = can("suppliers", "delete");

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [stats, setStats] = useState<SuppliersStats | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupplierStatusFilter>("all");
  const [relationshipFilter, setRelationshipFilter] =
    useState<SupplierRelationshipFilter>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [sort, setSort] = useState<SupplierSortField>("company_name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const limit = PAGE_SIZE;

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<SupplierRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [result, countryList] = await Promise.all([
        getSuppliersStats(),
        listSupplierCountries(),
      ]);
      setStats(result);
      setCountries(countryList);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listSuppliers({
        search: search.trim() || undefined,
        status: statusFilter,
        relationship_status: relationshipFilter,
        country: countryFilter,
        sort,
        order,
        page,
        limit,
      });
      setSuppliers(result.suppliers);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, relationshipFilter, countryFilter, sort, order, page]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStats();
      void loadSuppliers();
    });
  }, [loadStats, loadSuppliers]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return `No suppliers match "${search.trim()}".`;
    if (
      statusFilter !== "all" ||
      relationshipFilter !== "all" ||
      countryFilter !== "all"
    ) {
      return "No suppliers match the selected filters.";
    }
    return "No suppliers found. Add your first vendor to start the supplier directory.";
  }, [search, statusFilter, relationshipFilter, countryFilter]);

  async function handleFormSubmit(data: CreateSupplierFormValues) {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...data,
        city_tour_area: data.city_tour_area || null,
        services_offered: data.services_offered || null,
        contact_person: data.contact_person || null,
        email_address: data.email_address || null,
        contact_number: data.contact_number || null,
        website: data.website || null,
        notes: data.notes || null,
        problems_with_services: data.problems_with_services || null,
        account_details: data.account_details || null,
        tc_poc_fixed_departure: data.tc_poc_fixed_departure || null,
        relationship_owner: data.relationship_owner || null,
        date_added_updated: data.date_added_updated || null,
      };

      if (formMode === "edit" && editingSupplier) {
        const { supplier } = await updateSupplier(editingSupplier.id, payload);
        setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? supplier : s)));
      } else {
        await createSupplier(payload);
        await loadSuppliers();
        setPage(1);
      }

      await loadStats();
      setFormMode(null);
      setEditingSupplier(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save supplier");
    } finally {
      setIsSaving(false);
    }
  }

  function openCreate() {
    setEditingSupplier(null);
    setFormMode("create");
    setViewingSupplier(null);
  }

  useImperativeHandle(ref, () => ({ openCreate }), []);

  function openEdit(supplier: SupplierRecord) {
    setEditingSupplier(supplier);
    setFormMode("edit");
    setViewingSupplier(null);
  }

  async function handleDownloadExcel() {
    setIsExporting(true);
    setError(null);
    try {
      const all: SupplierRecord[] = [];
      let exportPage = 1;
      let exportTotalPages = 1;
      const exportLimit = 100;

      do {
        const result = await listSuppliers({
          search: search.trim() || undefined,
          status: statusFilter,
          relationship_status: relationshipFilter,
          country: countryFilter,
          sort,
          order,
          page: exportPage,
          limit: exportLimit,
        });
        all.push(...result.suppliers);
        exportTotalPages = result.totalPages;
        exportPage += 1;
      } while (exportPage <= exportTotalPages);

      if (!all.length) {
        window.alert("No suppliers to download for the current filters.");
        return;
      }

      downloadSuppliersExcel(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download Excel");
    } finally {
      setIsExporting(false);
    }
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    relationshipFilter !== "all" ||
    countryFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setRelationshipFilter("all");
    setCountryFilter("all");
    setPage(1);
  }

  if (!can("suppliers")) {
    return (
      <div className="rounded-2xl border border-[#E8ECF4] bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <Icon name="Shield" size={22} />
        </div>
        <p className="text-sm font-medium text-gray-700">Access restricted</p>
        <p className="mt-1 text-sm text-gray-500">
          You do not have permission to view suppliers.
        </p>
      </div>
    );
  }

  return (
    <>
      <SupplierStatsGrid stats={stats} loading={statsLoading || loading} />

      <div className="overflow-hidden rounded-2xl border border-[#E8ECF0] bg-white shadow-sm">
        <div className="border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white px-4 py-4 sm:px-5">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
            <div className="relative w-[13.5rem] shrink-0 sm:w-[15rem]">
              <Icon
                name="Search"
                size={15}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search suppliers…"
                className={`w-full pl-8 pr-2.5 ${filterControlClass}`}
                aria-label="Search suppliers"
              />
            </div>

            <NativeSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SupplierStatusFilter);
                setPage(1);
              }}
              wrapperClassName="w-[7.5rem] shrink-0"
              className={filterSelectClass}
              aria-label="Filter by status"
            >
              {SUPPLIER_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={relationshipFilter}
              onChange={(e) => {
                setRelationshipFilter(
                  e.target.value as SupplierRelationshipFilter
                );
                setPage(1);
              }}
              wrapperClassName="w-[8.75rem] shrink-0"
              className={filterSelectClass}
              aria-label="Filter by relationship"
            >
              {SUPPLIER_RELATIONSHIP_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setPage(1);
              }}
              wrapperClassName="w-[7.75rem] shrink-0"
              className={filterSelectClass}
              aria-label="Filter by country"
            >
              <option value="all">All countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SupplierSortField);
                setPage(1);
              }}
              wrapperClassName="w-[10.5rem] shrink-0"
              className={filterSelectClass}
              aria-label="Sort by"
            >
              {SUPPLIER_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={order}
              onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              wrapperClassName="w-[7rem] shrink-0"
              className={filterSelectClass}
              aria-label="Sort order"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </NativeSelect>

            <Button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExporting || loading}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#0B3A5C] shadow-sm transition hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              <Icon name="FileSpreadsheet" size={15} />
              {isExporting ? "Preparing…" : "Export Excel"}
            </Button>
          </div>

          {(hasActiveFilters || total > 0) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] pt-3">
              <p className="text-xs text-gray-500">
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon
                      name="Loader2"
                      size={12}
                      className="animate-spin text-[#A68231]"
                    />
                    Loading suppliers…
                  </span>
                ) : total > 0 ? (
                  <>
                    Showing{" "}
                    <span className="font-semibold text-gray-700">
                      {suppliers.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-700">{total}</span>{" "}
                    suppliers
                    {hasActiveFilters ? " (filtered)" : ""}
                  </>
                ) : (
                  "No suppliers to display"
                )}
              </p>

              {hasActiveFilters && (
                <Button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#A68231] hover:bg-[#A68231]/10"
                >
                  <Icon name="X" size={12} />
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5">
            <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SupplierListTable
          suppliers={suppliers}
          loading={loading}
          emptyMessage={emptyMessage}
          canDelete={canDelete}
          sort={sort}
          order={order}
          onSortChange={(nextSort, nextOrder) => {
            setSort(nextSort);
            setOrder(nextOrder);
            setPage(1);
          }}
          onView={setViewingSupplier}
          onEdit={openEdit}
          onSupplierRemoved={(id) => {
            setSuppliers((prev) => prev.filter((s) => s.id !== id));
            setTotal((t) => Math.max(0, t - 1));
            void loadStats();
          }}
        />

        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E8ECF0] bg-[#FAFBFC] px-4 py-3.5 sm:flex-row sm:px-5">
            <span className="text-sm text-gray-500">
              Page{" "}
              <span className="font-medium text-gray-700">{page}</span> of{" "}
              <span className="font-medium text-gray-700">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-white hover:border-gray-300 disabled:opacity-40"
              >
                <Icon name="ChevronLeft" size={16} className="mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-white hover:border-gray-300 disabled:opacity-40"
              >
                Next
                <Icon name="ChevronRight" size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            disabled={isSaving}
            onClick={() => {
              if (!isSaving) {
                setFormMode(null);
                setEditingSupplier(null);
              }
            }}
            className="absolute inset-0 bg-[#0B3A5C]/35 backdrop-blur-[2px]"
          />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#F1F5F9] pb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1F2A44]">
                  {formMode === "edit" ? "Edit Supplier" : "Add Supplier"}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {formMode === "edit"
                    ? "Update vendor details and relationship status."
                    : "Add a new vendor to the supplier directory."}
                </p>
              </div>
              <Button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  if (!isSaving) {
                    setFormMode(null);
                    setEditingSupplier(null);
                  }
                }}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
                aria-label="Close"
                title="Close"
              >
                <Icon name="X" size={20} />
              </Button>
            </div>
            <SupplierForm
              initialData={editingSupplier}
              isSaving={isSaving}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                if (!isSaving) {
                  setFormMode(null);
                  setEditingSupplier(null);
                }
              }}
            />
          </div>
        </div>
      )}

      <SupplierDetailsModal
        supplier={viewingSupplier}
        onClose={() => setViewingSupplier(null)}
        onEdit={(supplier) => {
          setViewingSupplier(null);
          openEdit(supplier);
        }}
      />
    </>
  );
});

export default SuppliersPanel;
