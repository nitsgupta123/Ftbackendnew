"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import {
  TEMPLATE_STEP_OPTIONS,
  type PackageTemplateRecord,
} from "@/lib/package-template-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";

interface PackageTemplateDetailsModalProps {
  template: PackageTemplateRecord | null;
  onClose: () => void;
  onEdit?: (template: PackageTemplateRecord) => void;
}

export default function PackageTemplateDetailsModal({
  template,
  onClose,
  onEdit,
}: PackageTemplateDetailsModalProps) {
  if (!template) return null;

  const stepLabels = template.included_steps
    .map((step) => TEMPLATE_STEP_OPTIONS.find((o) => o.step === step))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#E5E7EB]">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{template.name}</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{template.slug}</p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {template.description && (
            <p className="text-sm text-gray-700 leading-relaxed">{template.description}</p>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Type</dt>
              <dd className="mt-0.5 capitalize text-gray-900">{template.template_type}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
              <dd className="mt-0.5 capitalize text-gray-900">{template.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Usage Count</dt>
              <dd className="mt-0.5 text-gray-900">{template.usage_count}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Display Order</dt>
              <dd className="mt-0.5 text-gray-900">{template.display_order}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Default</dt>
              <dd className="mt-0.5 text-gray-900">{template.is_default ? "Yes" : "No"}</dd>
            </div>
          </dl>

          <div>
            <h3 className="text-sm font-bold text-[#1F2A44] mb-2">Included Steps</h3>
            <div className="flex flex-wrap gap-2">
              {stepLabels.map((step) => (
                <span
                  key={step!.step}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#B48A2C]/10 text-[#9A7424] border border-[#B48A2C]/20"
                >
                  <Icon name="CheckCircle" size={12} />
                  {step!.label}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-4">
            <h3 className="text-sm font-bold text-[#1F2A44] mb-2">Audit Trail</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Created By</dt>
                <dd className="text-gray-900">{template.created_by ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Created At</dt>
                <dd className="text-gray-900">{formatPackageDateTime(template.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Updated By</dt>
                <dd className="text-gray-900">{template.updated_by ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Updated At</dt>
                <dd className="text-gray-900">{formatPackageDateTime(template.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-gray-50/80">
          <Button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-medium text-gray-700 hover:bg-white"
          >
            Close
          </Button>
          <Link
            href={`/add-package?templateId=${template.id}`}
            className="h-10 px-4 inline-flex items-center rounded-lg text-sm font-semibold text-white bg-[#1F2A44] hover:bg-[#1F2A44]/90"
          >
            Use Template
          </Link>
          {onEdit && (
            <Button
              type="button"
              onClick={() => onEdit(template)}
              className="h-10 px-4 rounded-lg text-sm font-semibold text-white bg-[#B48A2C] hover:bg-[#B48A2C]/90"
            >
              Edit Template
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
