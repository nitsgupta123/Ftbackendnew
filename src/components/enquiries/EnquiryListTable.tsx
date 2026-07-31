"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import type { EnquiryRecord } from "@/lib/enquiry-types";
import {
  enquiryDisplayName,
  enquiryTypeLabel,
  isEnquiryOpen,
} from "@/lib/enquiry-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { deleteEnquiry, updateEnquiryStatus } from "@/lib/enquiry-api";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const GOLD = "#A68231";

const TYPE_STYLES: Record<string, string> = {
  contactus: "bg-blue-50 text-blue-700 ring-blue-600/20",
  popupenquery: "bg-violet-50 text-violet-700 ring-violet-600/20",
  contactus_visa: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  contactus_corporate: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

const STATUS_STYLES = {
  open: {
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  closed: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
};

interface EnquiryListTableProps {
  enquiries: EnquiryRecord[];
  loading?: boolean;
  emptyMessage?: string;
  onView?: (enquiry: EnquiryRecord) => void;
  onEnquiryUpdated?: (enquiry: EnquiryRecord) => void;
  onEnquiryRemoved?: (id: number) => void;
}

const actionIconClass =
  "inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 disabled:opacity-40 transition-colors";

function formatPhone(enquiry: EnquiryRecord): string {
  const phone = enquiry.phone.trim();
  if (!phone) return "—";
  const code = enquiry.countryCode.trim();
  return code ? `${code} ${phone}` : phone;
}

function EnquiryRowActions({
  enquiry,
  onView,
  onEnquiryUpdated,
  onEnquiryRemoved,
}: {
  enquiry: EnquiryRecord;
  onView?: (enquiry: EnquiryRecord) => void;
  onEnquiryUpdated?: (enquiry: EnquiryRecord) => void;
  onEnquiryRemoved?: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const open = isEnquiryOpen(enquiry.status);

  async function handleToggleStatus() {
    const next = open ? "closed" : "open";
    if (
      !window.confirm(
        `${next === "closed" ? "Mark as closed" : "Reopen"} "${enquiryDisplayName(enquiry)}"?`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const { enquiry: updated } = await updateEnquiryStatus(enquiry.id, next);
      onEnquiryUpdated?.(updated);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to update enquiry"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete enquiry from "${enquiryDisplayName(enquiry)}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      await deleteEnquiry(enquiry.id);
      onEnquiryRemoved?.(enquiry.id);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete enquiry"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onView?.(enquiry)}
        disabled={busy}
        className={actionIconClass}
        title="View enquiry"
      >
        <Icon name="Eye" size={15} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={handleToggleStatus}
        disabled={busy}
        className={actionIconClass}
        title={open ? "Mark as closed" : "Reopen enquiry"}
      >
        <Icon name={open ? "CheckCircle" : "Clock"} size={15} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={handleDelete}
        disabled={busy}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-40 transition-colors"
        title="Delete enquiry"
      >
        <Icon name="Trash2" size={15} />
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-[#F1F5F9]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function EnquiryListTable({
  enquiries,
  loading = false,
  emptyMessage = "No enquiries found.",
  onView,
  onEnquiryUpdated,
  onEnquiryRemoved,
}: EnquiryListTableProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!enquiries.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl ring-1 mb-4"
          style={{
            backgroundColor: `${GOLD}10`,
            color: GOLD,
            borderColor: `${GOLD}25`,
          }}
        >
          <Icon name="MessageSquare" size={24} />
        </div>
        <p className="text-sm font-medium text-gray-700">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-[#E8ECF0] bg-[#FAFBFC] hover:bg-[#FAFBFC]">
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Contact
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden md:table-cell">
              Type
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden lg:table-cell">
              Destination
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden sm:table-cell">
              Received
            </TableHead>
            <TableHead className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#F1F5F9]">
          {enquiries.map((enquiry) => {
            const open = isEnquiryOpen(enquiry.status);
            const statusStyle = open ? STATUS_STYLES.open : STATUS_STYLES.closed;
            const destination =
              enquiry.destinationName || enquiry.destination.trim() || "—";

            return (
              <TableRow
                key={enquiry.id}
                className="group hover:bg-[#FFFCF7]/60 transition-colors"
              >
                <TableCell className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => onView?.(enquiry)}
                    className="text-left min-w-[200px]"
                  >
                    <p className="font-medium text-[#1F2A44] truncate max-w-[280px] group-hover:text-[#A68231] transition-colors">
                      {enquiryDisplayName(enquiry)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 truncate max-w-[280px]">
                      {enquiry.email.trim() || "No email"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 truncate max-w-[280px]">
                      {formatPhone(enquiry)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 md:hidden">
                      {enquiryTypeLabel(enquiry.messageType)}
                    </p>
                  </button>
                </TableCell>
                <TableCell className="px-4 py-3.5 hidden md:table-cell">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                      TYPE_STYLES[enquiry.messageType] ??
                      "bg-gray-100 text-gray-600 ring-gray-500/10"
                    }`}
                  >
                    {enquiryTypeLabel(enquiry.messageType)}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-gray-600 hidden lg:table-cell">
                  {destination}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle.badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                    {open ? "Open" : "Closed"}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap hidden sm:table-cell">
                  {formatPackageDateTime(enquiry.insertDate)}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <EnquiryRowActions
                    enquiry={enquiry}
                    onView={onView}
                    onEnquiryUpdated={onEnquiryUpdated}
                    onEnquiryRemoved={onEnquiryRemoved}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
