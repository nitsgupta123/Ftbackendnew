import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Icon } from "@/components/ui/icons";
import PromotionListTable from "@/components/promotions/PromotionListTable";
import PromotionForm, { type PromotionFormValues } from "@/components/promotions/PromotionForm";
import { listAllPackages } from "@/lib/package-api";
import {
  createPromotion,
  deletePromotion,
  listPromotions,
  setPromotionStatus,
  updatePromotion,
} from "@/lib/promotion-api";
import {
  packageOptionKey,
  type PromotionInput,
  type PromotionPackageOption,
  type PromotionRecord,
} from "@/lib/promotion-types";
import { Button } from "@/components/ui/button";

type FormMode = "create" | "edit" | null;

function formValuesToInput(data: PromotionFormValues): PromotionInput {
  return {
    title: data.title.trim(),
    valid_from: data.valid_from || null,
    valid_to: data.valid_to || null,
    discount_type: data.discount_type,
    value: data.value,
    package_keys: data.package_keys,
    status: data.is_active ? "active" : "inactive",
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export interface PromotionsPanelHandle {
  openCreate: () => void;
}

const PromotionsPanel = forwardRef<PromotionsPanelHandle>(function PromotionsPanel(_, ref) {
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [packageOptions, setPackageOptions] = useState<PromotionPackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPromotions = useCallback(async () => {
    setPromotionsLoading(true);
    try {
      const { promotions: rows } = await listPromotions();
      setPromotions(rows);
    } catch (err) {
      setError(errorMessage(err, "Failed to load promotions"));
    } finally {
      setPromotionsLoading(false);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const { packages } = await listAllPackages();
      setPackageOptions(
        packages
          .filter((pkg) => pkg.status !== "deleted")
          .map((pkg) => ({
            key: packageOptionKey(pkg.source, pkg.id),
            label: pkg.package_title || `Package #${pkg.id}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      );
    } catch (err) {
      setPackageOptions([]);
      setError(errorMessage(err, "Failed to load packages"));
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPromotions();
      void loadPackages();
    });
  }, [loadPackages, loadPromotions]);

  function openCreate() {
    setEditingPromotion(null);
    setFormMode("create");
  }

  useImperativeHandle(ref, () => ({ openCreate }), []);

  function openEdit(promotion: PromotionRecord) {
    setEditingPromotion(promotion);
    setFormMode("edit");
  }

  function closeForm() {
    if (!isSaving) {
      setFormMode(null);
      setEditingPromotion(null);
    }
  }

  async function handleFormSubmit(data: PromotionFormValues) {
    setIsSaving(true);
    setError(null);
    try {
      const input = formValuesToInput(data);
      if (formMode === "edit" && editingPromotion) {
        const { promotion } = await updatePromotion(editingPromotion.id, input);
        setPromotions((prev) => prev.map((item) => (item.id === promotion.id ? promotion : item)));
      } else {
        const { promotion } = await createPromotion(input);
        setPromotions((prev) => [promotion, ...prev]);
      }
      setFormMode(null);
      setEditingPromotion(null);
    } catch (err) {
      setError(errorMessage(err, "Failed to save promotion"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(promotion: PromotionRecord) {
    setError(null);
    try {
      const { promotion: updated } = await setPromotionStatus(
        promotion.id,
        promotion.status === "active" ? "inactive" : "active"
      );
      setPromotions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(errorMessage(err, "Failed to update promotion status"));
    }
  }

  async function handleDelete(promotion: PromotionRecord) {
    if (!window.confirm(`Delete "${promotion.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await deletePromotion(promotion.id);
      setPromotions((prev) => prev.filter((item) => item.id !== promotion.id));
      if (editingPromotion?.id === promotion.id) {
        setFormMode(null);
        setEditingPromotion(null);
      }
    } catch (err) {
      setError(errorMessage(err, "Failed to delete promotion"));
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        {promotionsLoading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">Loading promotions…</div>
        ) : (
          <PromotionListTable
            promotions={promotions}
            onEdit={openEdit}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        )}
      </div>

      {formMode && (
        <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-base font-semibold text-[#1F2A44]">
              {formMode === "edit" ? "Edit Promotion" : "Add Promotion"}
            </h2>
            <Button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              className="size-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              aria-label="Close"
            >
              <Icon name="X" size={18} />
            </Button>
          </div>
          <div className="p-5">
            <PromotionForm
              key={editingPromotion?.id ?? "new"}
              initialData={editingPromotion}
              packageOptions={packageOptions}
              packagesLoading={packagesLoading}
              isSaving={isSaving}
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
    </>
  );
});

export default PromotionsPanel;
