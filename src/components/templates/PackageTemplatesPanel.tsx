"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import PackageTemplateListTable from "@/components/templates/PackageTemplateListTable";
import PackageTemplateForm from "@/components/templates/PackageTemplateForm";
import PackageTemplateDetailsModal from "@/components/templates/PackageTemplateDetailsModal";
import PackageTemplatesStatsGrid from "@/components/templates/PackageTemplatesStatsGrid";
import {
  createPackageTemplate,
  getPackageTemplateStats,
  listPackageTemplates,
  updatePackageTemplate,
} from "@/lib/package-template-api";
import {
  TEMPLATE_SORT_OPTIONS,
  TEMPLATE_STATUS_FILTER_OPTIONS,
  TEMPLATE_TYPE_FILTER_OPTIONS,
  type PackageTemplateRecord,
  type PackageTemplatesStats,
  type TemplateStatusFilter,
  type TemplateTypeFilter,
} from "@/lib/package-template-types";
import type { CreatePackageTemplateFormValues } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type FormMode = "create" | "edit" | null;

export default function PackageTemplatesPanel() {
  const { can } = usePermissions();
  const canDelete = can("package_templates", "delete");

  const [templates, setTemplates] = useState<PackageTemplateRecord[]>([]);
  const [stats, setStats] = useState<PackageTemplatesStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TemplateStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TemplateTypeFilter>("all");
  const [sort, setSort] = useState<"display_order" | "created_at" | "usage_count">("display_order");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingTemplate, setEditingTemplate] = useState<PackageTemplateRecord | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<PackageTemplateRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await getPackageTemplateStats();
      setStats(result.stats);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPackageTemplates({
        search: search.trim() || undefined,
        status: statusFilter,
        template_type: typeFilter,
        sort,
        order,
        page,
        limit,
      });
      setTemplates(result.templates);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, sort, order, page]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStats();
      void loadTemplates();
    });
  }, [loadStats, loadTemplates]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return `No templates match "${search.trim()}".`;
    if (statusFilter !== "all" || typeFilter !== "all") {
      return "No templates match the selected filters.";
    }
    return "No templates found. Create your first template to speed up package uploads.";
  }, [search, statusFilter, typeFilter]);

  async function handleFormSubmit(data: CreatePackageTemplateFormValues) {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...data,
        description: data.description || null,
        display_order: data.display_order ?? 0,
      };

      if (formMode === "edit" && editingTemplate) {
        const { template } = await updatePackageTemplate(editingTemplate.id, payload);
        setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
        void loadStats();
      } else {
        await createPackageTemplate(payload);
        await loadTemplates();
        await loadStats();
        setPage(1);
      }

      setFormMode(null);
      setEditingTemplate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  }

  function openCreate() {
    setEditingTemplate(null);
    setFormMode("create");
    setViewingTemplate(null);
  }

  function openEdit(template: PackageTemplateRecord) {
    setEditingTemplate(template);
    setFormMode("edit");
    setViewingTemplate(null);
  }

  function closeFormModal() {
    if (!isSaving) {
      setFormMode(null);
      setEditingTemplate(null);
    }
  }

  return (
    <>
      <PackageTemplatesStatsGrid stats={stats} loading={statsLoading} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div />
        <Button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 px-5 items-center text-sm font-semibold text-white bg-[#B48A2C] rounded-xl hover:bg-[#B48A2C]/90 shadow-sm"
        >
          + Add Template
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
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
            placeholder="Search templates…"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B48A2C]/30 focus:border-[#B48A2C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TemplateStatusFilter);
              setPage(1);
            }}
            className="h-10 min-w-[140px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm"
          >
            {TEMPLATE_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as TemplateTypeFilter);
              setPage(1);
            }}
            className="h-10 min-w-[130px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm"
          >
            {TEMPLATE_TYPE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "display_order" | "created_at" | "usage_count")
            }
            className="h-10 min-w-[150px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm"
          >
            {TEMPLATE_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            value={order}
            onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
            className="h-10 min-w-[120px] px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </NativeSelect>
        </div>

        {!loading && total > 0 && (
          <p className="text-xs text-gray-400 lg:ml-auto">
            {templates.length} of {total} templates
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <PackageTemplateListTable
        templates={templates}
        loading={loading}
        emptyMessage={emptyMessage}
        canDelete={canDelete}
        onView={setViewingTemplate}
        onEdit={openEdit}
        onTemplateRemoved={(id) => {
          setTemplates((prev) => prev.filter((t) => t.id !== id));
          setTotal((t) => Math.max(0, t - 1));
          void loadStats();
        }}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-40"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      )}

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Button
            type="button"
            className="absolute inset-0 bg-[#B48A2C]/40"
            aria-label="Close"
            onClick={closeFormModal}
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {formMode === "edit" ? "Edit Template" : "Create Template"}
              </h2>
              <Button
                type="button"
                onClick={closeFormModal}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                aria-label="Close"
              >
                <Icon name="X" size={20} />
              </Button>
            </div>
            <PackageTemplateForm
              initialData={editingTemplate}
              isSaving={isSaving}
              onSubmit={handleFormSubmit}
              onCancel={closeFormModal}
            />
          </div>
        </div>
      )}

      <PackageTemplateDetailsModal
        template={viewingTemplate}
        onClose={() => setViewingTemplate(null)}
        onEdit={(template) => {
          setViewingTemplate(null);
          openEdit(template);
        }}
      />
    </>
  );
}
