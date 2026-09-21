import { Link } from "react-router-dom";
import { useState } from "react";

import { Icon } from "@/components/ui/icons";
import { deletePackageTemplate } from "@/lib/package-template-api";
import { TEMPLATE_STEP_OPTIONS, type PackageTemplateRecord } from "@/lib/package-template-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
};

const TYPE_STYLES: Record<string, string> = {
  full: "bg-violet-50 text-violet-700",
  partial: "bg-amber-50 text-amber-700",
};

const actionIconClass =
  "inline-flex items-center justify-center size-8 rounded-lg border border-[#E5E7EB] bg-white text-[#B48A2C] hover:bg-gray-50 hover:text-[#9A7424] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

function formatIncludedSteps(steps: number[]): string {
  if (!steps.length) return "—";
  const labels = steps
    .map((step) => TEMPLATE_STEP_OPTIONS.find((o) => o.step === step)?.label ?? `Step ${step}`)
    .slice(0, 3);
  const suffix = steps.length > 3 ? ` +${steps.length - 3}` : "";
  return labels.join(", ") + suffix;
}

interface PackageTemplateListTableProps {
  templates: PackageTemplateRecord[];
  loading?: boolean;
  emptyMessage?: string;
  canDelete?: boolean;
  onView?: (template: PackageTemplateRecord) => void;
  onEdit?: (template: PackageTemplateRecord) => void;
  onTemplateRemoved?: (id: number) => void;
}

function TemplateRowActions({
  template,
  canDelete,
  onView,
  onEdit,
  onTemplateRemoved,
}: {
  template: PackageTemplateRecord;
  canDelete?: boolean;
  onView?: (template: PackageTemplateRecord) => void;
  onEdit?: (template: PackageTemplateRecord) => void;
  onTemplateRemoved?: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${template.name}"? This cannot be undone.`)) return;

    setBusy(true);
    try {
      await deletePackageTemplate(template.id);
      onTemplateRemoved?.(template.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onView?.(template)}
        className={actionIconClass}
        title="View"
      >
        <Icon name="Eye" size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onEdit?.(template)}
        className={actionIconClass}
        title="Edit"
      >
        <Icon name="Pencil" size={16} />
      </Button>
      <Link
        to={`/add-package?templateId=${template.id}`}
        className={actionIconClass}
        title="Use template"
      >
        <Icon name="FileSpreadsheet" size={16} />
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

export default function PackageTemplateListTable({
  templates,
  loading = false,
  emptyMessage = "No templates found.",
  canDelete = false,
  onView,
  onEdit,
  onTemplateRemoved,
}: PackageTemplateListTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-sm text-gray-500">
        Loading templates…
      </div>
    );
  }

  if (!templates.length) {
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
                Template
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Type
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Included Steps
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Usage
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Order
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
            {templates.map((template) => (
              <TableRow key={template.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="px-4 py-3">
                  <div className="font-medium text-gray-900">{template.name}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{template.slug}</div>
                  {template.is_default && (
                    <span className="inline-flex mt-1 text-xs font-medium text-[#B48A2C]">
                      Default
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      TYPE_STYLES[template.template_type] ?? TYPE_STYLES.partial
                    }`}
                  >
                    {template.template_type}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs max-w-[220px]">
                  {formatIncludedSteps(template.included_steps)}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-700">{template.usage_count}</TableCell>
                <TableCell className="px-4 py-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      STATUS_STYLES[template.status] ?? STATUS_STYLES.inactive
                    }`}
                  >
                    {template.status}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-700">{template.display_order}</TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  {formatPackageDateTime(template.updated_at)}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <TemplateRowActions
                    template={template}
                    canDelete={canDelete}
                    onView={onView}
                    onEdit={onEdit}
                    onTemplateRemoved={onTemplateRemoved}
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
