"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/icons";
import { deletePage } from "@/lib/page-api";
import type { CmsPageRecord } from "@/lib/page-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-gray-100 text-gray-600",
};

interface PageListTableProps {
  pages: CmsPageRecord[];
  loading?: boolean;
  emptyMessage?: string;
  canDelete?: boolean;
  onView?: (page: CmsPageRecord) => void;
  onPageRemoved?: (id: number) => void;
}

const actionIconClass =
  "inline-flex items-center justify-center size-8 rounded-lg border border-[#E5E7EB] bg-white text-[#B48A2C] hover:bg-gray-50 hover:text-[#9A7424] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

function PageThumbnail({ page }: { page: CmsPageRecord }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !page.featured_image_path) {
    return (
      <div className="h-10 w-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
        <Icon name="FileStack" size={18} />
      </div>
    );
  }

  return (
    <Image
      src={page.featured_image_path}
      alt={page.title}
      width={56}
      height={40}
      unoptimized
      className="h-10 w-14 rounded-lg object-cover border border-[#E5E7EB]"
      onError={() => setHasError(true)}
    />
  );
}

function PageRowActions({
  page,
  canDelete,
  onView,
  onPageRemoved,
}: {
  page: CmsPageRecord;
  canDelete?: boolean;
  onView?: (page: CmsPageRecord) => void;
  onPageRemoved?: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${page.title}"? This cannot be undone.`)) return;

    setBusy(true);
    try {
      await deletePage(page.id);
      onPageRemoved?.(page.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete page");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onView?.(page)}
        className={actionIconClass}
        title="View"
      >
        <Icon name="Eye" size={16} />
      </Button>
      <Link href={`/pages/edit/${page.id}`} className={actionIconClass} title="Edit">
        <Icon name="Pencil" size={16} />
      </Link>
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

export default function PageListTable({
  pages,
  loading = false,
  emptyMessage = "No pages found.",
  canDelete = false,
  onView,
  onPageRemoved,
}: PageListTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-sm text-gray-500">
        Loading pages…
      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-[#E5E7EB] bg-gray-50/80">
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Image
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Title
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Type
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Nav
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Order
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Published
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Updated
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#E5E7EB]">
            {pages.map((page) => (
              <TableRow key={page.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="px-4 py-3">
                  <PageThumbnail page={page} />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="font-medium text-gray-900 max-w-xs truncate">{page.title}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{page.slug}</div>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 capitalize">
                  {page.page_type ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      STATUS_STYLES[page.status] ?? STATUS_STYLES.draft
                    }`}
                  >
                    {page.status}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600">
                  {page.show_in_nav ? (
                    <Icon name="Check" size={16} className="text-emerald-600" />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600">{page.display_order}</TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  {page.published_at ? formatPackageDateTime(page.published_at) : "—"}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  {formatPackageDateTime(page.updated_at)}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <PageRowActions
                    page={page}
                    canDelete={canDelete}
                    onView={onView}
                    onPageRemoved={onPageRemoved}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
