import { DEFAULT_AUDIT_USER } from "@/lib/audit-context";
import { formatPackageDateTime } from "@/lib/format-date";
import type { PackageRecord } from "@/lib/package-types";

interface PackageAuditCardProps {
  packageData?: PackageRecord | null;
}

function formatAuditDateTime(value: string | null | undefined): string {
  return formatPackageDateTime(value);
}

export default function PackageAuditCard({ packageData }: PackageAuditCardProps) {
  const createdBy = packageData?.created_by ?? null;
  const updatedBy = packageData?.updated_by ?? null;
  const createdAt = packageData?.created_at ?? null;
  const updatedAt = packageData?.updated_at ?? null;
  const actingUser = updatedBy ?? createdBy ?? DEFAULT_AUDIT_USER;
  const createdSummary = createdBy
    ? `${createdBy} · ${formatAuditDateTime(createdAt)}`
    : "—";
  const updatedSummary = updatedBy
    ? `${updatedBy} · ${formatAuditDateTime(updatedAt)}`
    : "—";

  return (
    <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[#1F2A44] mb-3">Audit trail</h3>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Created by
          </dt>
          <dd className="mt-0.5 font-medium text-gray-900">{createdSummary}</dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Last updated by
          </dt>
          <dd className="mt-0.5 font-medium text-gray-900">{updatedSummary}</dd>
        </div>

        {!packageData && (
          <p className="text-xs text-gray-500 pt-1 border-t border-gray-100">
            New packages will be attributed to{" "}
            <span className="font-medium text-[#1F2A44]">{actingUser}</span> on first save.
          </p>
        )}
      </dl>
    </div>
  );
}

export function formatAuditSummary(pkg: PackageRecord): string {
  const date = formatAuditDateTime(pkg.updated_at);
  const user = pkg.updated_by ?? pkg.created_by;
  return user ? `${date} · ${user}` : date;
}
