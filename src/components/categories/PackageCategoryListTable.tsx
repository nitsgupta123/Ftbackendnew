import { useState } from "react";

import { Icon } from "@/components/ui/icons";
import { deleteCategory } from "@/lib/category-api";
import type { PackageCategoryRecord } from "@/lib/category-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const GOLD = "#A68231";

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  active: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  inactive: {
    badge: "bg-gray-100 text-gray-600 ring-gray-500/10",
    dot: "bg-gray-400",
  },
};

interface PackageCategoryListTableProps {
  categories: PackageCategoryRecord[];
  loading?: boolean;
  emptyMessage?: string;
  canDelete?: boolean;
  onView?: (category: PackageCategoryRecord) => void;
  onEdit?: (category: PackageCategoryRecord) => void;
  onCreate?: () => void;
  onCategoryRemoved?: (id: number) => void;
}

function CategoryImage({ category }: { category: PackageCategoryRecord }) {
  const src = category.image_path || category.icon_path;
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    const initial = category.name.trim().charAt(0).toUpperCase() || "?";
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1"
        style={{
          backgroundColor: `${GOLD}12`,
          color: GOLD,
          borderColor: `${GOLD}25`,
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={category.name}
      width={40}
      height={40}
      className="h-10 w-10 rounded-lg object-cover border border-[#E8ECF0] shrink-0"
      onError={() => setHasError(true)}
    />
  );
}

function CategoryRowActions({
  category,
  canDelete,
  onView,
  onEdit,
  onCategoryRemoved,
}: {
  category: PackageCategoryRecord;
  canDelete?: boolean;
  onView?: (category: PackageCategoryRecord) => void;
  onEdit?: (category: PackageCategoryRecord) => void;
  onCategoryRemoved?: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${category.name}"? This cannot be undone.`)) return;

    setBusy(true);
    try {
      await deleteCategory(category.id);
      onCategoryRemoved?.(category.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onView?.(category)}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 disabled:opacity-40 transition-colors"
        title="View category"
      >
        <Icon name="Eye" size={15} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onEdit?.(category)}
        className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 disabled:opacity-40 transition-colors"
        title="Edit category"
      >
        <Icon name="Pencil" size={15} />
      </Button>
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-40 transition-colors"
          title="Delete category"
        >
          <Icon name="Trash2" size={15} />
        </Button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="divide-y divide-[#F1F5F9]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function PackageCategoryListTable({
  categories,
  loading = false,
  emptyMessage = "No categories found.",
  canDelete = false,
  onView,
  onEdit,
  onCreate,
  onCategoryRemoved,
}: PackageCategoryListTableProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!categories.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl ring-1 mb-4"
          style={{ backgroundColor: `${GOLD}10`, color: GOLD, borderColor: `${GOLD}25` }}
        >
          <Icon name="FileText" size={24} />
        </div>
        <p className="text-sm font-medium text-gray-700">{emptyMessage}</p>
        {onCreate && (
          <Button
            type="button"
            onClick={onCreate}
            className="mt-4 inline-flex h-10 items-center gap-2 px-5 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90"
            style={{ backgroundColor: GOLD }}
          >
            <Icon name="FileText" size={16} />
            Create Category
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-[#E8ECF0] bg-[#FAFBFC] hover:bg-[#FAFBFC]">
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Category
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden md:table-cell">
              Slug
            </TableHead>
            <TableHead className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Packages
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </TableHead>
            <TableHead className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden sm:table-cell">
              Order
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 hidden lg:table-cell">
              Updated
            </TableHead>
            <TableHead className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#F1F5F9]">
          {categories.map((category) => {
            const statusStyle = STATUS_STYLES[category.status] ?? STATUS_STYLES.inactive;

            return (
              <TableRow
                key={category.id}
                className="group hover:bg-[#FFFCF7]/60 transition-colors"
              >
                <TableCell className="px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <CategoryImage category={category} />
                    <div className="min-w-0">
                      <p className="font-medium text-[#1F2A44] truncate group-hover:text-[#A68231] transition-colors">
                        {category.name}
                      </p>
                      {category.is_featured && (
                        <span
                          className="inline-flex items-center gap-1 mt-0.5 text-xs font-medium"
                          style={{ color: GOLD }}
                        >
                          <Icon name="Star" size={12} />
                          Featured
                        </span>
                      )}
                      {!category.is_featured && (
                        <p className="mt-0.5 text-xs text-gray-400 font-mono md:hidden truncate">
                          /{category.slug}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5 hidden md:table-cell">
                  <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-[#E8ECF0]">
                    {category.slug}
                  </code>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-center">
                  <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                    {category.total_packages ?? 0}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${statusStyle.badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
                    {category.status}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-center hidden sm:table-cell">
                  <span className="inline-flex size-7 items-center justify-center rounded-md bg-gray-50 text-xs font-medium text-gray-600 border border-[#E8ECF0]">
                    {category.display_order}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-gray-500 text-xs hidden lg:table-cell">
                  {formatPackageDateTime(category.updated_at)}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <CategoryRowActions
                    category={category}
                    canDelete={canDelete}
                    onView={onView}
                    onEdit={onEdit}
                    onCategoryRemoved={onCategoryRemoved}
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
