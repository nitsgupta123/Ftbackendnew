import { Icon } from "@/components/ui/icons";
import {
  RELATIONSHIP_STATUS_LABELS,
  SUPPLIER_STATUS_LABELS,
  buildSupplierSummary,
  type SupplierRecord,
  type SupplierRelationshipStatus,
} from "@/lib/supplier-types";
import { formatPackageDate, formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";

interface SupplierDetailsModalProps {
  supplier: SupplierRecord | null;
  onClose: () => void;
  onEdit?: (supplier: SupplierRecord) => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  inactive: "bg-gray-100 text-gray-600 ring-gray-500/10",
  do_not_use: "bg-red-50 text-red-700 ring-red-600/20",
};

const RELATIONSHIP_STYLES: Record<SupplierRelationshipStatus, string> = {
  new: "bg-violet-50 text-violet-700 ring-violet-600/20",
  under_review: "bg-blue-50 text-blue-700 ring-blue-600/20",
  with_issues: "bg-orange-50 text-orange-800 ring-orange-600/20",
  on_probation: "bg-amber-50 text-amber-900 ring-amber-700/20",
  inactive: "bg-slate-100 text-slate-700 ring-slate-500/15",
  blacklisted: "bg-gray-800 text-white ring-gray-900/20",
  poor: "bg-red-50 text-red-700 ring-red-600/20",
  average: "bg-yellow-50 text-yellow-900 ring-yellow-600/20",
  good: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  excellent: "bg-emerald-800 text-emerald-50 ring-emerald-900/20",
};

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#EEF2F6] bg-[#FAFBFC] px-3.5 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-relaxed text-[#1F2A44] whitespace-pre-wrap break-words">
        {value}
      </dd>
    </div>
  );
}

function display(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-[#1F2A44]">{title}</h3>
      {children}
    </section>
  );
}

export default function SupplierDetailsModal({
  supplier,
  onClose,
  onEdit,
}: SupplierDetailsModalProps) {
  if (!supplier) return null;

  const statusStyle = STATUS_STYLES[supplier.status] ?? STATUS_STYLES.inactive;
  const relationshipStyle =
    RELATIONSHIP_STYLES[supplier.relationship_status] ??
    RELATIONSHIP_STYLES.average;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-[#0B3A5C]/35 backdrop-blur-[2px]"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
        <div className="shrink-0 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle}`}
                >
                  {SUPPLIER_STATUS_LABELS[supplier.status] ?? supplier.status}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${relationshipStyle}`}
                >
                  {RELATIONSHIP_STATUS_LABELS[supplier.relationship_status]}
                </span>
              </div>
              <h2 className="truncate text-lg font-semibold text-[#1F2A44] sm:text-xl">
                {supplier.company_name}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Icon name="Globe" size={14} className="text-gray-400" />
                  {supplier.country}
                </span>
                {supplier.city_tour_area ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-gray-300">·</span>
                    <Icon name="MapPin" size={14} className="text-gray-400" />
                    {supplier.city_tour_area}
                  </span>
                ) : null}
              </p>
            </div>
            <Button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <Section title="Status & ownership">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem
                label="Relationship Owner"
                value={display(supplier.relationship_owner)}
              />
              <DetailItem
                label="Date Added / Updated"
                value={
                  supplier.date_added_updated
                    ? formatPackageDate(supplier.date_added_updated)
                    : "—"
                }
              />
            </dl>
          </Section>

          <Section title="Services & contact">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem
                label="Services Offered"
                value={display(supplier.services_offered)}
              />
              <DetailItem label="Website" value={display(supplier.website)} />
              <DetailItem
                label="Point of Contact"
                value={display(supplier.contact_person)}
              />
              <DetailItem
                label="TC POC (Fixed Departure)"
                value={display(supplier.tc_poc_fixed_departure)}
              />
              <div className="sm:col-span-2">
                <DetailItem
                  label="Email Address"
                  value={display(supplier.email_address)}
                />
              </div>
              <div className="sm:col-span-2">
                <DetailItem
                  label="Contact Number"
                  value={display(supplier.contact_number)}
                />
              </div>
            </dl>
          </Section>

          <Section title="Notes & accounts">
            <dl className="grid grid-cols-1 gap-3">
              <DetailItem label="Notes" value={display(supplier.notes)} />
              <DetailItem
                label="Problems with Services"
                value={display(supplier.problems_with_services)}
              />
              <DetailItem
                label="Account Details / Local Currency"
                value={display(supplier.account_details)}
              />
            </dl>
          </Section>

          <Section title="Summary">
            <pre className="rounded-xl border border-[#E8ECF0] bg-[#F8FAFC] p-4 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap font-sans">
              {buildSupplierSummary(supplier)}
            </pre>
          </Section>

          <p className="border-t border-[#E8ECF0] pt-4 text-xs text-gray-400">
            Created {formatPackageDateTime(supplier.created_at)}
            {supplier.created_by ? ` by ${supplier.created_by}` : ""} · Updated{" "}
            {formatPackageDateTime(supplier.updated_at)}
            {supplier.updated_by ? ` by ${supplier.updated_by}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#E5E7EB] bg-white px-5 py-4 sm:px-6">
          <Button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </Button>
          {onEdit && (
            <Button
              type="button"
              onClick={() => onEdit(supplier)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#A68231] px-4 text-sm font-semibold text-white transition hover:bg-[#947329]"
            >
              <Icon name="Pencil" size={14} />
              Edit Supplier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
