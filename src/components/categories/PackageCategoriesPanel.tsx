"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useAuth } from "@/components/auth/AuthProvider";
import PackageCategoryListTable from "@/components/categories/PackageCategoryListTable";
import PackageCategoryForm from "@/components/categories/PackageCategoryForm";
import PackageCategoryDetailsModal from "@/components/categories/PackageCategoryDetailsModal";
import { createCategory, listCategories, updateCategory } from "@/lib/category-api";
import { CATEGORY_SORT_OPTIONS, CATEGORY_STATUS_FILTER_OPTIONS, type CategoryStatusFilter, type PackageCategoryRecord } from "@/lib/category-types";
import type { CreateCategoryFormValues } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
type FormMode = "create" | "edit" | null;
export default function PackageCategoriesPanel() {
  const {
    user
  } = useAuth();
  const canDelete = user?.role === "super_admin";
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
  const limit = 20;
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingCategory, setEditingCategory] = useState<PackageCategoryRecord | null>(null);
  const [viewingCategory, setViewingCategory] = useState<PackageCategoryRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
        limit
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
      const label = CATEGORY_STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label ?? statusFilter;
      return `No ${label.toLowerCase()} categories found.`;
    }
    return "No categories found. Create your first category to get started.";
  }, [search, statusFilter]);
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
        display_order: data.display_order ?? 0
      };
      if (formMode === "edit" && editingCategory) {
        const {
          category
        } = await updateCategory(editingCategory.id, payload);
        setCategories(prev => prev.map(c => c.id === category.id ? category : c));
      } else {
        const {
          category
        } = await createCategory(payload);
        await loadCategories();
        setPage(1);
        void category;
      }
      setFormMode(null);
      setEditingCategory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setIsSaving(false);
    }
  }
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
  return <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div />
        <Button type="button" onClick={openCreate} className="inline-flex h-11 px-5 items-center text-sm font-semibold text-white bg-[#B48A2C] rounded-xl hover:bg-[#B48A2C]/90 shadow-sm">
          
          + Add Category
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          
          <Input type="search" value={search} onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }} placeholder="Search by category name..." className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]" />
          
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect value={statusFilter} onChange={e => {
          setStatusFilter(e.target.value as CategoryStatusFilter);
          setPage(1);
        }} className="h-10 min-w-[140px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            
            {CATEGORY_STATUS_FILTER_OPTIONS.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </NativeSelect>

          <NativeSelect value={sort} onChange={e => setSort(e.target.value as "display_order" | "created_at")} className="h-10 min-w-[140px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            
            {CATEGORY_SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>)}
          </NativeSelect>

          <NativeSelect value={order} onChange={e => setOrder(e.target.value as "asc" | "desc")} className="h-10 min-w-[120px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm">
            
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </NativeSelect>
        </div>

        {!loading && total > 0 && <p className="text-xs text-gray-400 lg:ml-auto">
            {categories.length} of {total} categories
          </p>}
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>}

      <PackageCategoryListTable categories={categories} loading={loading} emptyMessage={emptyMessage} canDelete={canDelete} onView={setViewingCategory} onEdit={openEdit} onCategoryRemoved={id => {
      setCategories(prev => prev.filter(c => c.id !== id));
      setTotal(t => Math.max(0, t - 1));
    }} />
      

      {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-4">
          <Button type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-40">
          
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)} className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-40">
          
            Next
          </Button>
        </div>}

      {formMode && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Button type="button" className="absolute inset-0 bg-[#B48A2C]/40" aria-label="Close" onClick={() => {
        if (!isSaving) {
          setFormMode(null);
          setEditingCategory(null);
        }
      }} />
        
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {formMode === "edit" ? "Edit Category" : "Create Category"}
            </h2>
            <PackageCategoryForm initialData={editingCategory} isSaving={isSaving} onSubmit={handleFormSubmit} onCancel={() => {
          if (!isSaving) {
            setFormMode(null);
            setEditingCategory(null);
          }
        }} />
          
          </div>
        </div>}

      <PackageCategoryDetailsModal category={viewingCategory} onClose={() => setViewingCategory(null)} onEdit={category => {
      setViewingCategory(null);
      openEdit(category);
    }} />
      
    </>;
}
