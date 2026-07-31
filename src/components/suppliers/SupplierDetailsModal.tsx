"use client";

import { Icon } from "@/components/ui/icons";
import {
  RELATIONSHIP_STATUS_LABELS,
  SUPPLIER_STATUS_LABELS,
  buildSupplierSummary,
  type SupplierRecord,
} from "@/lib/supplier-types";
import { formatPackageDate, formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";

interface SupplierDetailsModalProps {
  supplier: SupplierRecord | null;
  onClose: () => void;
  onEdit?: (supplier: SupplierRecord) => void;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-gray-900 whitespace-pre-wrap break-words">{value}</dd>
    </div>
  );
}

function display(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

export default function SupplierDetailsModal({
  supplier,
  onClose,
  onEdit,
}: SupplierDetailsModalProps) {
  if (!supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#E5E7EB] pointer-events-auto">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{supplier.company_name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {supplier.country}
              {supplier.city_tour_area ? ` · ${supplier.city_tour_area}` : ""}
            </p>
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
          <div>
            <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Status</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <DetailItem
                label="Active Status"
                value={SUPPLIER_STATUS_LABELS[supplier.status] ?? supplier.status}
              />
              <DetailItem
                label="Relationship Status"
                value={RELATIONSHIP_STATUS_LABELS[supplier.relationship_status]}
              />
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
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Services & Contact</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Notes & Accounts</h3>
            <dl className="grid grid-cols-1 gap-4 text-sm">
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
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Summary</h3>
            <pre className="rounded-xl border border-[#E8ECF0] bg-[#F8FAFC] p-4 text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {buildSupplierSummary(supplier)}
            </pre>
          </div>

          <div className="text-xs text-gray-400 border-t border-[#E8ECF0] pt-4">
            Created {formatPackageDateTime(supplier.created_at)}
            {supplier.created_by ? ` by ${supplier.created_by}` : ""} · Updated{" "}
            {formatPackageDateTime(supplier.updated_at)}
            {supplier.updated_by ? ` by ${supplier.updated_by}` : ""}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-white">
          <Button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </Button>
          {onEdit && (
            <Button
              type="button"
              onClick={() => onEdit(supplier)}
              className="h-10 px-4 rounded-lg bg-[#A68231] text-sm font-semibold text-white hover:bg-[#A68231]/90"
            >
              Edit Supplier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
