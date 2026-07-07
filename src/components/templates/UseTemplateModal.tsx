"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { applyPackageTemplate, listActiveTemplates } from "@/lib/package-template-api";
import { TEMPLATE_STEP_OPTIONS } from "@/lib/package-template-types";
import { Button } from "@/components/ui/button";

interface UseTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (templateId: number) => Promise<void>;
  applying?: boolean;
}

export default function UseTemplateModal({
  open,
  onClose,
  onApply,
  applying = false,
}: UseTemplateModalProps) {
  const [templates, setTemplates] = useState<
    Awaited<ReturnType<typeof listActiveTemplates>>["templates"]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      setSelectedId(null);
      listActiveTemplates()
        .then((result) => setTemplates(result.templates))
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Failed to load templates")
        )
        .finally(() => setLoading(false));
    });
  }, [open]);

  if (!open) return null;

  async function handleApply() {
    if (!selectedId) return;
    await onApply(selectedId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Button
        type="button"
        className="absolute inset-0 bg-[#B48A2C]/40"
        aria-label="Close"
        onClick={() => {
          if (!applying) onClose();
        }}
      />

      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-white rounded-2xl shadow-xl border border-[#E5E7EB] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Use Package Template</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Pre-fill wizard steps from a reusable skeleton
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <p className="text-sm text-gray-500 text-center py-8">Loading templates…</p>
          )}

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && templates.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No active templates available.</p>
              <Link
                href="/packages/templates"
                className="inline-flex mt-3 text-sm font-medium text-[#B48A2C] hover:underline"
              >
                Manage templates →
              </Link>
            </div>
          )}

          {templates.map((template) => {
            const selected = selectedId === template.id;
            const stepCount = template.included_steps.length;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  selected
                    ? "border-[#B48A2C] bg-[#B48A2C]/5 ring-2 ring-[#B48A2C]/20"
                    : "border-[#E5E7EB] bg-white hover:border-[#B48A2C]/40 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{template.name}</p>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      template.template_type === "full"
                        ? "bg-violet-50 text-violet-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {template.template_type}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {stepCount} step{stepCount === 1 ? "" : "s"}:{" "}
                  {template.included_steps
                    .slice(0, 4)
                    .map(
                      (step) =>
                        TEMPLATE_STEP_OPTIONS.find((o) => o.step === step)?.label ?? `Step ${step}`
                    )
                    .join(", ")}
                  {stepCount > 4 ? ` +${stepCount - 4} more` : ""}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-gray-50/80">
          <Link
            href="/packages/templates"
            className="text-sm text-[#B48A2C] hover:underline"
          >
            Manage templates
          </Link>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-gray-700 hover:bg-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={!selectedId || applying}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-white bg-[#B48A2C] hover:bg-[#B48A2C]/90 disabled:opacity-50"
            >
              {applying && <Icon name="Loader2" size={16} className="animate-spin" />}
              Apply Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export helper for direct apply without modal selection
