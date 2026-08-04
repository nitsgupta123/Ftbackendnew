"use client";

import { Icon } from "@/components/ui/icons";
import type { PricingRuleRecord } from "@/lib/pricing-rules-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";

interface PricingRuleDetailsModalProps {
  rule: PricingRuleRecord | null;
  onClose: () => void;
  onEdit?: (rule: PricingRuleRecord) => void;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{value}</dd>
    </div>
  );
}

export default function PricingRuleDetailsModal({
  rule,
  onClose,
  onEdit,
}: PricingRuleDetailsModalProps) {
  if (!rule) return null;

  const currencies =
    rule.supplier_currency && rule.display_currency
      ? `${rule.supplier_currency} → ${rule.display_currency}`
      : "—";

  const markup =
    rule.markup_type === "percentage" && rule.default_markup_value
      ? `${rule.default_markup_value}%`
      : (rule.default_markup_value ?? "—");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 border-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#E5E7EB]">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{rule.name}</h2>
            {rule.is_default && (
              <span className="text-xs font-medium text-[#B48A2C]">Default rule</span>
            )}
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
          {rule.description && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{rule.description}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Scope</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <DetailItem label="Scope type" value={rule.scope_type.replace("_", " ")} />
              <DetailItem label="Scope value" value={rule.scope_value ?? "—"} />
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Exchange Rate</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <DetailItem label="Currencies" value={currencies} />
              <DetailItem label="Rate type" value={rule.exchange_rate_type} />
              <DetailItem
                label="Default rate"
                value={
                  rule.default_exchange_rate != null ? String(rule.default_exchange_rate) : "—"
                }
              />
              <DetailItem
                label="Rate lock"
                value={rule.rate_lock_days != null ? `${rule.rate_lock_days} days` : "—"}
              />
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Markup</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <DetailItem label="Markup type" value={rule.markup_type} />
              <DetailItem label="Markup value" value={markup} />
              <DetailItem
                label="Minimum margin alert"
                value={
                  rule.minimum_margin_percent != null
                    ? `${rule.minimum_margin_percent}%`
                    : "—"
                }
              />
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#1F2A44] mb-3">Finance Approval</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <DetailItem
                label="Required"
                value={rule.requires_finance_approval ? "Yes" : "No"}
              />
              <DetailItem
                label="Threshold"
                value={
                  rule.finance_approval_threshold != null
                    ? `Below ${rule.finance_approval_threshold}% margin`
                    : "—"
                }
              />
            </dl>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-[#E5E7EB] pt-4">
            <DetailItem label="Status" value={rule.status} />
            <DetailItem label="Display order" value={String(rule.display_order)} />
            <DetailItem label="Created by" value={rule.created_by ?? "—"} />
            <DetailItem label="Last updated" value={formatPackageDateTime(rule.updated_at)} />
          </dl>

          {onEdit && (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => onEdit(rule)}
                className="h-10 px-4 text-sm font-semibold text-white bg-[#B48A2C] rounded-xl hover:bg-[#B48A2C]/90"
              >
                Edit Rule
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
