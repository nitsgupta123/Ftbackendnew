import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { deleteSupplier } from "@/lib/supplier-api";
import {
  RELATIONSHIP_STATUS_LABELS,
  SUPPLIER_STATUS_LABELS,
  buildSupplierSummary,
  isSupplierSortField,
  type SupplierRecord,
  type SupplierRelationshipStatus,
  type SupplierSortField,
} from "@/lib/supplier-types";
import { formatPackageDate } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  active: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  inactive: {
    badge: "bg-gray-100 text-gray-600 ring-gray-500/10",
    dot: "bg-gray-400",
  },
  do_not_use: {
    badge: "bg-red-50 text-red-700 ring-red-600/20",
    dot: "bg-red-500",
  },
};

const RELATIONSHIP_STYLES: Record<SupplierRelationshipStatus, string> = {
  new: "bg-violet-600 text-white ring-violet-700/20",
  under_review: "bg-blue-500 text-white ring-blue-600/20",
  with_issues: "bg-[#F5D0B5] text-[#7A4A2A] ring-[#D4A574]/30",
  on_probation: "bg-[#5C4033] text-[#E8C9A0] ring-[#5C4033]/25",
  inactive: "bg-[#5C5A3A] text-[#E8E0B8] ring-[#5C5A3A]/25",
  blacklisted: "bg-gray-700 text-white ring-gray-800/20",
  poor: "bg-red-600 text-white ring-red-700/20",
  average: "bg-[#F5E6A8] text-[#6B4E16] ring-[#D4AF37]/25",
  good: "bg-[#C8E6C9] text-[#2E7D32] ring-emerald-600/20",
  excellent: "bg-[#1B5E20] text-[#C8E6C9] ring-emerald-800/25",
};

/** Sheet column order from Vendor/Supplier Google Sheet */
const SHEET_COLUMNS = [
  { key: "date_added_updated", label: "Date Added/Updated", minWidth: "130px", sortable: true },
  { key: "country", label: "Country", minWidth: "120px", sortable: true },
  { key: "status", label: "Active Status", minWidth: "120px", sortable: true },
  { key: "city_tour_area", label: "City / Tour Area", minWidth: "150px", sortable: true },
  { key: "relationship_status", label: "Relationship Status", minWidth: "140px", sortable: true },
  { key: "company_name", label: "Company Name", minWidth: "180px", sortable: true },
  { key: "services_offered", label: "Services Offered", minWidth: "160px", sortable: true },
  { key: "contact_person", label: "Point of Contact Name", minWidth: "160px", sortable: true },
  { key: "email_address", label: "Email Address", minWidth: "180px", sortable: true },
  { key: "contact_number", label: "Contact Number", minWidth: "150px", sortable: true },
  { key: "website", label: "Website", minWidth: "150px", sortable: true },
  { key: "notes", label: "Notes", minWidth: "180px", sortable: true },
  { key: "problems_with_services", label: "Problems with Services", minWidth: "180px", sortable: true },
  {
    key: "account_details",
    label: "Account details Local Currency /",
    minWidth: "170px",
    sortable: true,
  },
  {
    key: "tc_poc_fixed_departure",
    label: "TC POC for the Fixed Departure Package",
    minWidth: "160px",
    sortable: true,
  },
  { key: "relationship_owner", label: "Relationship Owner", minWidth: "130px", sortable: true },
  { key: "summary", label: "Summary", minWidth: "220px", sortable: false },
] as const;

interface SupplierListTableProps {
  suppliers: SupplierRecord[];
  loading?: boolean;
  emptyMessage?: string;
  canDelete?: boolean;
  sort?: SupplierSortField;
  order?: "asc" | "desc";
  onSortChange?: (sort: SupplierSortField, order: "asc" | "desc") => void;
  onView?: (supplier: SupplierRecord) => void;
  onEdit?: (supplier: SupplierRecord) => void;
  onSupplierRemoved?: (id: number) => void;
}

const actionIconClass =
  "inline-flex items-center justify-center size-8 rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] shadow-sm hover:bg-[#FFFCF7] hover:border-[#A68231]/40 hover:shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all";

const headerCellClass =
  "sticky top-0 z-20 text-left px-3.5 py-3.5 text-[11px] font-semibold text-white whitespace-normal leading-snug align-bottom border-r border-white/10 last:border-r-0 bg-[#0B3A5C]";

const bodyCellClass =
  "px-3.5 py-3 text-xs text-[#334155] align-top border-r border-[#EEF2F6] last:border-r-0 max-w-[220px]";

function display(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function SupplierRowActions({
  supplier,
  canDelete,
  onView,
  onEdit,
  onSupplierRemoved,
}: {
  supplier: SupplierRecord;
  canDelete?: boolean;
  onView?: (supplier: SupplierRecord) => void;
  onEdit?: (supplier: SupplierRecord) => void;
  onSupplierRemoved?: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(`Delete "${supplier.company_name}"? This cannot be undone.`)
    ) {
      return;
    }

    setBusy(true);
    try {
      await deleteSupplier(supplier.id);
      onSupplierRemoved?.(supplier.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete supplier");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onView?.(supplier)}
        className={actionIconClass}
        title="View"
      >
        <Icon name="Eye" size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onEdit?.(supplier)}
        className={actionIconClass}
        title="Edit"
      >
        <Icon name="Pencil" size={16} />
      </Button>
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleDelete}
          disabled={busy}
          className={actionIconClass}
          title="Delete"
        >
          <Icon name="Trash2" size={16} />
        </Button>
      )}
    </div>
  );
}

function CellText({ value, lines = 3 }: { value: string; lines?: number }) {
  return (
    <span
      className="block whitespace-pre-wrap break-words"
      style={{
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
      title={value === "—" ? undefined : value}
    >
      {value}
    </span>
  );
}

function SortArrows({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  return (
    <span className="inline-flex flex-col items-center leading-none shrink-0" aria-hidden>
      <Icon
        name="ChevronUp"
        size={10}
        className={
          active && order === "asc" ? "text-white" : "text-white/35"
        }
      />
      <Icon
        name="ChevronDown"
        size={10}
        className={`-mt-0.5 ${
          active && order === "desc" ? "text-white" : "text-white/35"
        }`}
      />
    </span>
  );
}

const SLIDE_AMOUNT = 280;

const slideArrowClass =
  "absolute top-1/2 z-40 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0B3A5C] shadow-md transition hover:border-[#A68231]/40 hover:bg-[#FFFCF7] hover:text-[#A68231] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A68231]/40";

export default function SupplierListTable({
  suppliers,
  loading = false,
  emptyMessage = "No suppliers found.",
  canDelete = false,
  sort = "company_name",
  order = "asc",
  onSortChange,
  onView,
  onEdit,
  onSupplierRemoved,
}: SupplierListTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(maxScroll - el.scrollLeft > 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, suppliers.length, loading]);

  function handleSort(columnKey: string) {
    if (!onSortChange || !isSupplierSortField(columnKey)) return;
    if (sort === columnKey) {
      onSortChange(columnKey, order === "asc" ? "desc" : "asc");
    } else {
      onSortChange(columnKey, "asc");
    }
  }

  function slideHorizontal(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "right" ? SLIDE_AMOUNT : -SLIDE_AMOUNT,
      behavior: "smooth",
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#A68231]/10 text-[#A68231]">
          <Icon name="Loader2" size={22} className="animate-spin" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Loading suppliers</p>
          <p className="mt-1 text-xs text-gray-500">
            Fetching the latest vendor directory…
          </p>
        </div>
      </div>
    );
  }

  if (!suppliers.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8FAFC] text-gray-400 ring-1 ring-[#E8ECF0]">
          <Icon name="Building" size={26} />
        </div>
        <div className="max-w-sm">
          <p className="text-sm font-medium text-gray-700">No suppliers found</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="max-h-[calc(5rem+10*3.75rem)] overflow-auto overscroll-contain"
      >
        <Table
          containerClassName="overflow-visible"
          className="w-max min-w-full text-sm border-separate border-spacing-0"
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {SHEET_COLUMNS.map((column) => {
                const isActive = column.sortable && sort === column.key;
                return (
                  <TableHead
                    key={column.key}
                    className={headerCellClass}
                    style={{ minWidth: column.minWidth }}
                    aria-sort={
                      isActive
                        ? order === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-start gap-1.5 text-left text-white hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-sm"
                      >
                        <span>{column.label}</span>
                        <SortArrows active={isActive} order={order} />
                      </button>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                );
              })}
              <TableHead
                className={`${headerCellClass} sticky right-0 z-30 shadow-[-6px_0_8px_rgba(0,0,0,0.08)]`}
                style={{ minWidth: "110px" }}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier, index) => {
              const statusStyle =
                STATUS_STYLES[supplier.status] ?? STATUS_STYLES.inactive;
              const relationshipStyle =
                RELATIONSHIP_STYLES[supplier.relationship_status] ??
                RELATIONSHIP_STYLES.average;
                  const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#F9FBFD]";

              return (
                <TableRow
                  key={supplier.id}
                  className={`group transition-colors hover:bg-[#FFFCF7] ${rowBg}`}
                >
                  <TableCell className={bodyCellClass}>
                    {formatPackageDate(
                      supplier.date_added_updated || supplier.created_at
                    )}
                  </TableCell>
                  <TableCell
                    className={`${bodyCellClass} font-medium text-[#1F2A44]`}
                  >
                    {display(supplier.country)}
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${statusStyle.badge}`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${statusStyle.dot}`}
                      />
                      {SUPPLIER_STATUS_LABELS[supplier.status] ?? supplier.status}
                    </span>
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={display(supplier.city_tour_area)} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${relationshipStyle}`}
                    >
                      {RELATIONSHIP_STATUS_LABELS[supplier.relationship_status]}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`${bodyCellClass} font-semibold text-[#1F2A44]`}
                  >
                    <CellText value={supplier.company_name} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={display(supplier.services_offered)} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={display(supplier.contact_person)} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={display(supplier.email_address)} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={display(supplier.contact_number)} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    {supplier.website?.trim() ? (
                      <a
                        href={
                          supplier.website.startsWith("http")
                            ? supplier.website
                            : `https://${supplier.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0B3A5C] underline-offset-2 hover:underline break-all"
                      >
                        <CellText value={supplier.website} />
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={display(supplier.notes)} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={display(supplier.problems_with_services)} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={display(supplier.account_details)} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={display(supplier.tc_poc_fixed_departure)} />
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    {display(supplier.relationship_owner)}
                  </TableCell>
                  <TableCell className={bodyCellClass}>
                    <CellText value={buildSupplierSummary(supplier)} lines={4} />
                  </TableCell>
                  <TableCell
                    className={`${bodyCellClass} sticky right-0 z-10 ${rowBg} group-hover:bg-[#FFFCF7] shadow-[-6px_0_8px_rgba(0,0,0,0.04)]`}
                  >
                    <SupplierRowActions
                      supplier={supplier}
                      canDelete={canDelete}
                      onView={onView}
                      onEdit={onEdit}
                      onSupplierRemoved={onSupplierRemoved}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => slideHorizontal("left")}
          className={`${slideArrowClass} left-0.5`}
          title="Slide left"
          aria-label="Slide table left"
        >
          <Icon name="ChevronLeft" size={16} strokeWidth={2.25} />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => slideHorizontal("right")}
          className={`${slideArrowClass} right-[8.75rem]`}
          title="Slide right"
          aria-label="Slide table right"
        >
          <Icon name="ChevronRight" size={16} strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}
