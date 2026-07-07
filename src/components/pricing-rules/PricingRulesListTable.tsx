"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { deletePricingRule } from "@/lib/pricing-rules-api";
import type { PricingRuleRecord } from "@/lib/pricing-rules-types";
import { formatPackageDateTime } from "@/lib/format-date";
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
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
};

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  destination: "Destination",
  currency: "Currency",
  supplier_country: "Supplier country",
};

interface PricingRulesListTableProps {
  rules: PricingRuleRecord[];
  loading?: boolean;
  emptyMessage?: string;
  canDelete?: boolean;
  onView?: (rule: PricingRuleRecord) => void;
  onEdit?: (rule: PricingRuleRecord) => void;
  onRuleRemoved?: (id: number) => void;
}

const actionIconClass =
  "inline-flex items-center justify-center size-8 rounded-lg border border-[#E5E7EB] bg-white text-[#B48A2C] hover:bg-gray-50 hover:text-[#9A7424] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

function formatMarkup(rule: PricingRuleRecord): string {
  if (!rule.default_markup_value) return "—";
  if (rule.markup_type === "percentage") return `${rule.default_markup_value}%`;
  if (rule.markup_type === "fixed") return rule.default_markup_value;
  return "Tiered";
}

function formatExchangeRate(rule: PricingRuleRecord): string {
  if (rule.exchange_rate_type === "auto") return "Auto";
  if (rule.default_exchange_rate != null) return String(rule.default_exchange_rate);
  return "—";
}

function RuleRowActions({
  rule,
  canDelete,
  onView,
  onEdit,
  onRuleRemoved,
}: {
  rule: PricingRuleRecord;
  canDelete?: boolean;
  onView?: (rule: PricingRuleRecord) => void;
  onEdit?: (rule: PricingRuleRecord) => void;
  onRuleRemoved?: (id: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${rule.name}"? This cannot be undone.`)) return;

    setBusy(true);
    try {
      await deletePricingRule(rule.id);
      onRuleRemoved?.(rule.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete pricing rule");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onView?.(rule)}
        className={actionIconClass}
        title="View"
      >
        <Icon name="Eye" size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onEdit?.(rule)}
        className={actionIconClass}
        title="Edit"
      >
        <Icon name="Pencil" size={16} />
      </Button>
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

export default function PricingRulesListTable({
  rules,
  loading = false,
  emptyMessage = "No pricing rules found.",
  canDelete = false,
  onView,
  onEdit,
  onRuleRemoved,
}: PricingRulesListTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center text-sm text-gray-500">
        Loading pricing rules…
      </div>
    );
  }

  if (!rules.length) {
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
                Rule Name
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Scope
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Currencies
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Exchange Rate
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Markup
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Finance Approval
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Updated
              </TableHead>
              <TableHead className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#E5E7EB]">
            {rules.map((rule) => (
              <TableRow key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="px-4 py-3">
                  <div className="font-medium text-gray-900">{rule.name}</div>
                  {rule.is_default && (
                    <span className="inline-flex mt-1 text-xs font-medium text-[#B48A2C]">
                      Default
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600">
                  <span className="capitalize">{SCOPE_LABELS[rule.scope_type] ?? rule.scope_type}</span>
                  {rule.scope_value && (
                    <span className="block text-xs text-gray-400 mt-0.5">{rule.scope_value}</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs font-mono">
                  {rule.supplier_currency && rule.display_currency
                    ? `${rule.supplier_currency} → ${rule.display_currency}`
                    : "—"}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-700">
                  <span className="capitalize text-xs">{rule.exchange_rate_type}</span>
                  <span className="block text-xs text-gray-500">{formatExchangeRate(rule)}</span>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-700">
                  <span className="capitalize text-xs">{rule.markup_type}</span>
                  <span className="block text-xs text-gray-500">{formatMarkup(rule)}</span>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  {rule.requires_finance_approval ? (
                    <>
                      Below {rule.finance_approval_threshold ?? "—"}%
                    </>
                  ) : (
                    "Not required"
                  )}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      STATUS_STYLES[rule.status] ?? STATUS_STYLES.inactive
                    }`}
                  >
                    {rule.status}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  {formatPackageDateTime(rule.updated_at)}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <RuleRowActions
                    rule={rule}
                    canDelete={canDelete}
                    onView={onView}
                    onEdit={onEdit}
                    onRuleRemoved={onRuleRemoved}
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
