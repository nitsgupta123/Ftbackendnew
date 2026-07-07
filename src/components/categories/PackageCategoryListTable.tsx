"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { deleteCategory } from "@/lib/category-api";
import type { PackageCategoryRecord } from "@/lib/category-types";
import { formatPackageDateTime } from "@/lib/format-date";import { Button } from "@/components/ui/button";import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import Image from "next/image";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600"
};

interface PackageCategoryListTableProps {
  categories: PackageCategoryRecord[];
  loading?: boolean;
  emptyMessage?: string;
  canDelete?: boolean;
  onView?: (category: PackageCategoryRecord) => void;
  onEdit?: (category: PackageCategoryRecord) => void;
  onCategoryRemoved?: (id: number) => void;
}

const actionIconClass =
"inline-flex items-center justify-center size-8 rounded-lg border border-[#E5E7EB] bg-white text-[#B48A2C] hover:bg-gray-50 hover:text-[#9A7424] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

function CategoryImage({ category }: {category: PackageCategoryRecord;}) {
  const src = category.image_path || category.icon_path;
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
        <Icon name="Image" size={18} />
      </div>);

  }
  if (!src) {
    return (
      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
        <Icon name="Image" size={18} />
      </div>);

  }
  return (
    <Image
      src={src}
      alt={category.name}
      width={40}
      height={40}
      unoptimized
      className="h-10 w-10 rounded-lg object-cover border border-[#E5E7EB]"
      onError={() => setHasError(true)} />);


}

function CategoryRowActions({
  category,
  canDelete,
  onView,
  onEdit,
  onCategoryRemoved






}: {category: PackageCategoryRecord;canDelete?: boolean;onView?: (category: PackageCategoryRecord) => void;onEdit?: (category: PackageCategoryRecord) => void;onCategoryRemoved?: (id: number) => void;}) {
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
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onView?.(category)}
        className={actionIconClass}
        title="View">
        
        <Icon name="Eye" size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onEdit?.(category)}
        className={actionIconClass}
        title="Edit">
        
        <Icon name="Pencil" size={16} />
      </Button>
      {canDelete &&
      <Button
        type="button"
        variant="ghost"
        onClick={handleDelete}
        disabled={busy}
        className={actionIconClass}
        title="Delete">
        
          <Icon name="Trash2" size={16} />
        </Button>
      }
    </div>);

}

export default function PackageCategoryListTable({
  categories,
  loading = false,
  emptyMessage = "No categories found.",
  canDelete = false,
  onView,
  onEdit,
  onCategoryRemoved
}: PackageCategoryListTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-sm text-gray-500">
        Loading categories…
      </div>);

  }

  if (!categories.length) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>);

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
                Category Name
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Slug
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Packages
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Order
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Created By
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Last Updated
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#E5E7EB]">
            {categories.map((category) =>
            <TableRow key={category.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="px-4 py-3">
                  <CategoryImage category={category} />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="font-medium text-gray-900">{category.name}</div>
                  {category.is_featured &&
                <span className="inline-flex mt-1 text-xs font-medium text-[#B48A2C]">
                      Featured
                    </span>
                }
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 font-mono text-xs">{category.slug}</TableCell>
                <TableCell className="px-4 py-3 text-gray-700">{category.total_packages ?? 0}</TableCell>
                <TableCell className="px-4 py-3">
                  <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  STATUS_STYLES[category.status] ?? STATUS_STYLES.inactive}`
                  }>
                  
                    {category.status}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-700">{category.display_order}</TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  {category.created_by ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  {formatPackageDateTime(category.updated_at)}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <CategoryRowActions
                  category={category}
                  canDelete={canDelete}
                  onView={onView}
                  onEdit={onEdit}
                  onCategoryRemoved={onCategoryRemoved} />
                
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>);

}
