import { Link } from "react-router-dom";
import { useState } from "react";

import { Icon } from "@/components/ui/icons";
import PackageDetailsModal from "@/components/packages/PackageDetailsModal";
import {
  archivePackageRecord,
  deletePackageRecord,
  getPackageEditHref,
  getPackageRecordKey,
  isWizardPackage,
} from "@/lib/package-api";
import type { PackageRecord } from "@/lib/package-types";
import { formatPackageDate, formatPackageTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending_review: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-600",
  deleted: "bg-red-50 text-red-600"
};

interface PackageListTableProps {
  packages: PackageRecord[];
  loading?: boolean;
  emptyMessage?: string;
  showValidity?: boolean;
  showSupplier?: boolean;
  readOnly?: boolean;
  variant?: "default" | "dashboard";
  fullActions?: boolean;
  onPackageRemoved?: (pkg: PackageRecord) => void;
  onPackageUpdated?: (pkg: PackageRecord) => void;
}

const actionIconClass =
"inline-flex items-center justify-center size-8 rounded-lg border border-[#E5E7EB] bg-white text-[#B48A2C] hover:bg-gray-50 hover:text-[#9A7424] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

const actionLinkClass =
"text-[#B48A2C] font-medium hover:underline";

function formatUpdatedTimeAndName(pkg: PackageRecord): string {
  if (!pkg.updated_at) return "—";
  const time = formatPackageTime(pkg.updated_at);
  return pkg.updated_by ? `${time} · ${pkg.updated_by}` : time;
}

function getPackageDisplayId(pkg: PackageRecord): string {
  return pkg.slug || `ID #${pkg.package_id ?? pkg.id}`;
}

function PackageNameButton({
  pkg,
  onClick,
  titleClassName
}: {
  pkg: PackageRecord;
  onClick: () => void;
  titleClassName: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      size="sm"
      className="h-auto w-full max-w-full flex-col items-start justify-start gap-0 bg-transparent hover:bg-transparent px-0 py-0 text-left cursor-pointer group"
    >
      <span className={`block w-full max-w-full whitespace-normal break-words leading-snug ${titleClassName}`}>
        {pkg.package_title || "Untitled package"}
      </span>
      <span className="block w-full max-w-full whitespace-normal break-all text-xs text-gray-400 mt-0.5 leading-snug">
        {getPackageDisplayId(pkg)}
      </span>
    </Button>
  );
}

function PackageRowActions({
  pkg,
  editHref,
  onPackageRemoved,
  onPackageUpdated





}: {pkg: PackageRecord;editHref: string;onPackageRemoved?: (pkg: PackageRecord) => void;onPackageUpdated?: (pkg: PackageRecord) => void;}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const title = pkg.package_title || "this package";
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;

    setBusy(true);
    try {
      await deletePackageRecord(pkg);
      onPackageRemoved?.(pkg);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete package");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (pkg.status === "archived") {
      window.alert("This package is already archived.");
      return;
    }
    const title = pkg.package_title || "this package";
    if (!window.confirm(`Archive "${title}"?`)) return;

    setBusy(true);
    try {
      const { package: updated } = await archivePackageRecord(pkg);
      onPackageUpdated?.(updated);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to archive package");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link to={editHref} className={actionIconClass} title="Edit">
        <Icon name="Pencil" size={16} />
      </Link>
      <Button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        variant="ghost"
        className={actionIconClass}
        title="Delete">
        
        <Icon name="Trash2" size={16} />
      </Button>
      <Button
        type="button"
        onClick={handleArchive}
        disabled={busy}
        variant="ghost"
        className={actionIconClass}
        title="Archive">
        
        <Icon name="Archive" size={16} />
      </Button>
    </div>);

}

export default function PackageListTable({
  packages,
  loading = false,
  emptyMessage = "No packages found.",
  showValidity = false,
  showSupplier = false,
  readOnly = false,
  variant = "default",
  fullActions = false,
  onPackageRemoved,
  onPackageUpdated
}: PackageListTableProps) {
  const [selectedPackage, setSelectedPackage] = useState<PackageRecord | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center text-sm text-gray-500">
        Loading packages from API...
      </div>);

  }

  if (!packages.length) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-8 text-center">
        <p className="text-sm text-gray-500">{emptyMessage}</p>
        <Link
          to="/add-package"
          className="inline-flex mt-4 h-10 px-5 items-center text-sm font-medium text-white bg-[#B48A2C] rounded-lg hover:bg-[#B48A2C]/90">
          
          Add New Package
        </Link>
      </div>);

  }

  if (variant === "dashboard") {
    return (
      <>
      <PackageDetailsModal
          pkg={selectedPackage}
          onClose={() => setSelectedPackage(null)} />
        
      <div className="rounded-2xl border border-[#E8ECF4] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-[#EEF2F7]">
          <h3 className="text-base font-semibold text-[#111827]">Recent Packages</h3>
          <Link
              to="/packages/all"
              className="text-xs font-medium text-[#B48A2C] hover:underline">
              
            View all packages
          </Link>
        </div>
        <Table className="w-full table-fixed text-sm">
            <TableHeader className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <TableRow className="text-left text-xs font-medium text-[#6B7280]">
                <TableHead className="px-3 py-2">Package Name</TableHead>
                <TableHead className="px-3 py-2">Source</TableHead>
                <TableHead className="px-3 py-2">Destination</TableHead>
                <TableHead className="px-3 py-2">Status</TableHead>
                <TableHead className="px-3 py-2">Created By</TableHead>
                <TableHead className="px-3 py-2">Last Updated</TableHead>
                <TableHead className="px-3 py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#EEF2F7]">
              {packages.slice(0, 5).map((pkg) => {
                  const statusText = pkg.status.replaceAll("_", " ");
                  const destination =
                  pkg.package_basics?.citiesOrRegions ||
                  pkg.package_basics?.countriesCovered ||
                  "International";
                  const editHref = getPackageEditHref(pkg);

                  return (
                    <TableRow key={getPackageRecordKey(pkg)} className="hover:bg-[#FAFBFD]">
                    <TableCell className="w-[35%] px-3 py-3 whitespace-normal">
                      <PackageNameButton
                        pkg={pkg}
                        onClick={() => setSelectedPackage(pkg)}
                        titleClassName="font-medium text-[#111827] group-hover:text-[#B48A2C] transition-colors"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span className="inline-flex px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                        {isWizardPackage(pkg) ? "Wizard" : "Legacy"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3 whitespace-normal break-words text-[#4B5563]">{destination}</TableCell>
                    <TableCell className="px-3 py-3">
                      <span
                          className={`inline-flex px-2 py-1 rounded-full text-[11px] font-medium ${
                          STATUS_STYLES[pkg.status] ?? STATUS_STYLES.draft}`
                          }>
                          
                        {statusText}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3 whitespace-normal text-[#6B7280]">
                      <span className="block">{pkg.created_by ?? "—"}</span>
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {formatPackageDate(pkg.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3 whitespace-normal text-[#6B7280]">
                      <span className="block">{formatPackageDate(pkg.updated_at)}</span>
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {formatUpdatedTimeAndName(pkg)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Link to={editHref} className="hover:text-[#111827]" title="Open">
                          <Icon name="EyeIcon" size={14} />
                        </Link>
                        {isWizardPackage(pkg) &&
                          <Link to={editHref} className="hover:text-[#111827]" title="Edit">
                            <Icon name="FileText" size={14} />
                          </Link>
                          }
                      </div>
                    </TableCell>
                  </TableRow>);

                })}
            </TableBody>
          </Table>
      </div>
      </>);

  }

  return (
    <>
    <PackageDetailsModal
        pkg={selectedPackage}
        onClose={() => setSelectedPackage(null)} />
      
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
      <Table className="w-full table-fixed text-sm">
          <TableHeader className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <TableRow className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <TableHead className="px-3 py-2">Package</TableHead>
              <TableHead className="px-3 py-2">Source</TableHead>
              {showSupplier && <TableHead className="px-3 py-2">Supplier</TableHead>}
              <TableHead className="px-3 py-2">Status</TableHead>
              <TableHead className="px-3 py-2">Step</TableHead>
              {showValidity && <TableHead className="px-3 py-2">Validity To</TableHead>}
              <TableHead className="px-3 py-2">Created By</TableHead>
              <TableHead className="px-3 py-2">Last Updated</TableHead>
              <TableHead className="px-3 py-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100">
            {packages.map((pkg) => {
                const editHref = getPackageEditHref(pkg);
                const wizard = isWizardPackage(pkg);

                return (
                  <TableRow key={getPackageRecordKey(pkg)} className="hover:bg-gray-50/80">
                  <TableCell className="w-[35%] px-3 py-3 whitespace-normal">
                    <PackageNameButton
                      pkg={pkg}
                      onClick={() => setSelectedPackage(pkg)}
                      titleClassName="font-semibold text-[#1F2A44] group-hover:text-[#B48A2C] transition-colors"
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                      {wizard ? "Wizard" : "Legacy"}
                    </span>
                  </TableCell>
                  {showSupplier &&
                    <TableCell className="px-3 py-3 whitespace-normal break-words text-gray-600">
                      {pkg.supplier_name || "—"}
                    </TableCell>
                    }
                  <TableCell className="px-3 py-3">
                    <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        STATUS_STYLES[pkg.status] ?? STATUS_STYLES.draft}`
                        }>
                        
                      {pkg.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-gray-600">{pkg.current_step}/14</TableCell>
                  {showValidity &&
                    <TableCell className="px-3 py-3 whitespace-normal text-gray-600">
                      {(pkg.supplier_source as { validityTo?: string } | null)?.validityTo || "—"}
                    </TableCell>
                    }
                  <TableCell className="px-3 py-3 whitespace-normal text-gray-600">
                    <span className="block">{pkg.created_by ?? "—"}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {formatPackageDate(pkg.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 whitespace-normal text-gray-500">
                    <span className="block">{formatPackageDate(pkg.updated_at)}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {formatUpdatedTimeAndName(pkg)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {readOnly && !wizard ?
                      <span className="text-gray-400">Legacy</span> :
                      fullActions ?
                      <PackageRowActions
                        pkg={pkg}
                        editHref={editHref}
                        onPackageRemoved={onPackageRemoved}
                        onPackageUpdated={onPackageUpdated} /> :


                      <Link to={editHref} className={actionLinkClass}>
                        {wizard ? "Edit" : "View"}
                      </Link>
                      }
                  </TableCell>
                </TableRow>);

              })}
          </TableBody>
        </Table>
    </div>
    </>);

}
