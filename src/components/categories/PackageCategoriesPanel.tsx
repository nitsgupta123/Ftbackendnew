"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import PackageCategoryListTable from "@/components/categories/PackageCategoryListTable";
import PackageCategoryForm from "@/components/categories/PackageCategoryForm";
import PackageCategoryDetailsModal from "@/components/categories/PackageCategoryDetailsModal";
import { createCategory, listCategories, updateCategory } from "@/lib/category-api";
import {
  CATEGORY_SORT_OPTIONS,
  CATEGORY_STATUS_FILTER_OPTIONS,
  type CategoryStatusFilter,
  type PackageCategoryRecord,
} from "@/lib/category-types";
import type { CreateCategoryFormValues } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const GOLD = "#A68231";

const filterControlClass =
  "h-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";

type FormMode = "create" | "edit" | null;

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

export default function PackageCategoriesPanel() {
  const { can } = usePermissions();
  const canDelete = can("package_categories", "delete");

  const [categories, setCategories] = useState<PackageCategoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>("all");
  const [sort, setSort] = useState<"display_order" | "created_at">("display_order");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingCategory, setEditingCategory] = useState<PackageCategoryRecord | null>(null);
  const [viewingCategory, setViewingCategory] = useState<PackageCategoryRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const limit = 20;

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCategories({
        search: search.trim() || undefined,
        status: statusFilter,
        sort,
        order,
        page,
        limit,
      });
      setCategories(result.categories);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sort, order, page]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadCategories();
    });
  }, [loadCategories]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return `No categories match "${search.trim()}".`;
    if (statusFilter !== "all") {
      const label =
        CATEGORY_STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
      return `No ${label.toLowerCase()} categories found.`;
    }
    return "No categories found. Create your first category to get started.";
  }, [search, statusFilter]);

  const activeCount = useMemo(
    () => categories.filter((c) => c.status === "active").length,
    [categories]
  );

  const totalPackages = useMemo(
    () => categories.reduce((sum, c) => sum + (c.total_packages ?? 0), 0),
    [categories]
  );

  function openCreate() {
    setEditingCategory(null);
    setFormMode("create");
    setViewingCategory(null);
  }

  function openEdit(category: PackageCategoryRecord) {
    setEditingCategory(category);
    setFormMode("edit");
    setViewingCategory(null);
  }

  function closeForm() {
    if (!isSaving) {
      setFormMode(null);
      setEditingCategory(null);
    }
  }

  async function handleFormSubmit(data: CreateCategoryFormValues) {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...data,
        description: data.description || null,
        icon_path: data.icon_path || null,
        image_path: data.image_path || null,
        seo_meta_title: data.seo_meta_title || null,
        seo_meta_description: data.seo_meta_description || null,
        display_order: data.display_order ?? 0,
      };
      if (formMode === "edit" && editingCategory) {
        const { category } = await updateCategory(editingCategory.id, payload);
        setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
      } else {
        await createCategory(payload);
        await loadCategories();
        setPage(1);
      }
      setFormMode(null);
      setEditingCategory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Categories" value={loading ? "—" : total} icon="FileText" />
        <StatCard
          label="Active on Page"
          value={loading ? "—" : activeCount}
          icon="CheckCircle"
          accent="#27AE60"
        />
        <StatCard label="Linked Packages" value={loading ? "—" : totalPackages} icon="FileStack" />
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
              placeholder="Search by category name..."
              className={`w-full pl-9 pr-3 ${filterControlClass}`}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as CategoryStatusFilter);
                setPage(1);
              }}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[130px] px-3 pr-9 ${filterControlClass}`}
            >
              {CATEGORY_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={sort}
              onChange={(e) => setSort(e.target.value as "display_order" | "created_at")}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[150px] px-3 pr-9 ${filterControlClass}`}
            >
              {CATEGORY_SORT_OPTIONS.map((option) => (
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

          <Button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 shrink-0 items-center gap-2 px-5 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-90 sm:ml-auto"
            style={{ backgroundColor: GOLD }}
          >
            <Icon name="FileText" size={16} />
            Add Category
          </Button>
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
              "Loading categories…"
            ) : total > 0 ? (
              <>
                Showing <span className="font-medium text-gray-700">{categories.length}</span> of{" "}
                <span className="font-medium text-gray-700">{total}</span> categories
              </>
            ) : (
              "No categories to display"
            )}
          </p>
        </div>

        <PackageCategoryListTable
          categories={categories}
          loading={loading}
          emptyMessage={emptyMessage}
          canDelete={canDelete}
          onView={setViewingCategory}
          onEdit={openEdit}
          onCreate={openCreate}
          onCategoryRemoved={(id) => {
            setCategories((prev) => prev.filter((c) => c.id !== id));
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

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-[#1F2A44]/55 backdrop-blur-[3px]"
            aria-label="Close"
            onClick={closeForm}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="package-category-modal-title"
            className="relative flex flex-col w-full max-w-3xl max-h-[min(90vh,760px)] bg-white rounded-2xl shadow-2xl border border-[#E8ECF0] overflow-hidden"
          >
            <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white">
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1"
                  style={{ backgroundColor: `${GOLD}14`, color: GOLD, borderColor: `${GOLD}33` }}
                >
                  <Icon name="FileText" size={20} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2
                    id="package-category-modal-title"
                    className="text-lg font-semibold text-[#1F2A44] tracking-tight"
                  >
                    {formMode === "edit" ? "Edit Category" : "Create Category"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                    {formMode === "edit"
                      ? "Update category details, visibility, and SEO settings."
                      : "Add a new category to organize and merchandise travel packages."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                disabled={isSaving}
                onClick={closeForm}
                className="shrink-0 size-9 rounded-lg border border-[#E5E7EB] bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                aria-label="Close"
              >
                <Icon name="X" size={18} />
              </Button>
            </div>
            <div className="overflow-y-auto p-6">
              <PackageCategoryForm
                initialData={editingCategory}
                isSaving={isSaving}
                onSubmit={handleFormSubmit}
                onCancel={closeForm}
              />
            </div>
          </div>
        </div>
      )}

      <PackageCategoryDetailsModal
        category={viewingCategory}
        onClose={() => setViewingCategory(null)}
        onEdit={(category) => {
          setViewingCategory(null);
          openEdit(category);
        }}
      />
    </>
  );
}
