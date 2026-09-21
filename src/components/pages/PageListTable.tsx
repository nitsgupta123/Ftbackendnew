import { Link } from "react-router-dom";
import { useState } from "react";


import { Icon } from "@/components/ui/icons";
import { deletePage } from "@/lib/page-api";
import type { CmsPageRecord } from "@/lib/page-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  draft: {
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  published: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  archived: {
    badge: "bg-gray-100 text-gray-600 ring-gray-500/10",
    dot: "bg-gray-400",
  },
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
  "inline-flex items-center justify-center size-8 rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

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
    <img
      src={page.featured_image_path}
      alt={page.title}
      width={56}
      height={40}
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
      <Link to={`/pages/edit/${page.id}`} className={actionIconClass} title="Edit">
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
  const resolvePublishedByName = (page: CmsPageRecord) => page.created_by ?? "—";
  const resolveUpdatedByName = (page: CmsPageRecord) =>
    page.updated_by ?? page.created_by ?? "—";

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-gray-500">
        Loading pages…
      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="p-12 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-[#E8ECF0] bg-[#FAFBFC] hover:bg-[#FAFBFC]">
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Image
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Title
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Type
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Status
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Nav
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Order
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Published
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Updated
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#F1F5F9]">
            {pages.map((page) => (
              <TableRow key={page.id} className="group hover:bg-[#FFFCF7]/60 transition-colors">
                <TableCell className="px-4 py-3">
                  <PageThumbnail page={page} />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="font-medium text-[#1F2A44] max-w-xs truncate group-hover:text-[#A68231] transition-colors">
                    {page.title}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{page.slug}</div>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 capitalize">
                  {page.page_type ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  {(() => {
                    const statusStyle = STATUS_STYLES[page.status] ?? STATUS_STYLES.draft;
                    return (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${statusStyle.badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                    {page.status}
                  </span>
                    );
                  })()}
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
                  <div className="space-y-0.5">
                    <p>{page.published_at ? formatPackageDateTime(page.published_at) : "—"}</p>
                    <p className="text-[11px] text-gray-400">By {resolvePublishedByName(page)}</p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  <div className="space-y-0.5">
                    <p>{formatPackageDateTime(page.updated_at)}</p>
                    <p className="text-[11px] text-gray-400">By {resolveUpdatedByName(page)}</p>
                  </div>
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
  );
}
