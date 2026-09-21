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

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  active: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  inactive: {
    badge: "bg-gray-100 text-gray-600 ring-gray-500/10",
    dot: "bg-gray-400",
  },
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
  "inline-flex items-center justify-center size-8 rounded-lg border border-[#E5E7EB] bg-white text-[#A68231] hover:bg-[#FFFCF7] hover:border-[#A68231]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

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
      <div className="p-12 text-center text-sm text-gray-500">
        Loading pricing rules…
      </div>
    );
  }

  if (!rules.length) {
    return (
      <div className="p-12 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-[#E8ECF0] bg-[#FAFBFC] hover:bg-[#FAFBFC]">
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Rule Name
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Scope
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Currencies
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Exchange Rate
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Markup
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Finance Approval
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Status
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Updated
            </TableHead>
            <TableHead className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#F1F5F9]">
          {rules.map((rule) => {
            const statusStyle = STATUS_STYLES[rule.status] ?? STATUS_STYLES.inactive;
            return (
              <TableRow
                key={rule.id}
                className="group hover:bg-[#FFFCF7]/60 transition-colors"
              >
                <TableCell className="px-4 py-3">
                  <div className="font-medium text-[#1F2A44] max-w-xs truncate group-hover:text-[#A68231] transition-colors">
                    {rule.name}
                  </div>
                  {rule.is_default && (
                    <span className="inline-flex mt-0.5 text-xs font-medium text-[#A68231]">
                      Default
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600">
                  <span className="capitalize">
                    {SCOPE_LABELS[rule.scope_type] ?? rule.scope_type}
                  </span>
                  {rule.scope_value && (
                    <span className="block text-xs text-gray-400 mt-0.5">{rule.scope_value}</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs font-mono">
                  {rule.supplier_currency && rule.display_currency
                    ? `${rule.supplier_currency} → ${rule.display_currency}`
                    : "—"}
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  <div className="space-y-0.5">
                    <p className="capitalize">{rule.exchange_rate_type}</p>
                    <p className="text-[11px] text-gray-400">{formatExchangeRate(rule)}</p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  <div className="space-y-0.5">
                    <p className="capitalize">{rule.markup_type}</p>
                    <p className="text-[11px] text-gray-400">{formatMarkup(rule)}</p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 text-xs">
                  {rule.requires_finance_approval
                    ? `Below ${rule.finance_approval_threshold ?? "—"}%`
                    : "Not required"}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${statusStyle.badge}`}
                  >
                    <span className={`size-1.5 rounded-full ${statusStyle.dot}`} />
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
