import { useCallback, useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import { Icon } from "@/components/ui/icons";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import PricingRulesListTable from "@/components/pricing-rules/PricingRulesListTable";
import PricingRuleForm from "@/components/pricing-rules/PricingRuleForm";
import PricingRuleDetailsModal from "@/components/pricing-rules/PricingRuleDetailsModal";
import PricingRulesStatsGrid from "@/components/pricing-rules/PricingRulesStatsGrid";
import {
  createPricingRule,
  getPricingRulesStats,
  listPricingRules,
  updatePricingRule,
} from "@/lib/pricing-rules-api";
import {
  PRICING_RULE_SCOPE_FILTER_OPTIONS,
  PRICING_RULE_SORT_OPTIONS,
  PRICING_RULE_STATUS_FILTER_OPTIONS,
  type PricingRuleRecord,
  type PricingRuleScopeFilter,
  type PricingRuleStatusFilter,
  type PricingRulesStats,
} from "@/lib/pricing-rules-types";
import type { CreatePricingRuleFormValues } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const filterControlClass =
  "h-10 rounded-lg border border-[#E5E7EB] bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A68231]/25 focus:border-[#A68231] transition-colors";

type FormMode = "create" | "edit" | null;

export type PricingRulesPanelHandle = {
  openCreate: () => void;
};

export default forwardRef<PricingRulesPanelHandle>(function PricingRulesPanel(_props, ref) {
  const { can } = usePermissions();
  const canDelete = can("pricing_rules", "delete");

  const [rules, setRules] = useState<PricingRuleRecord[]>([]);
  const [stats, setStats] = useState<PricingRulesStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PricingRuleStatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<PricingRuleScopeFilter>("all");
  const [sort, setSort] = useState<"display_order" | "created_at" | "name">("display_order");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingRule, setEditingRule] = useState<PricingRuleRecord | null>(null);
  const [viewingRule, setViewingRule] = useState<PricingRuleRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await getPricingRulesStats();
      setStats(result);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPricingRules({
        search: search.trim() || undefined,
        status: statusFilter,
        scope_type: scopeFilter,
        sort,
        order,
        page,
        limit,
      });
      setRules(result.rules);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pricing rules");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, scopeFilter, sort, order, page]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadStats();
      void loadRules();
    });
  }, [loadStats, loadRules]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) return `No pricing rules match "${search.trim()}".`;
    if (statusFilter !== "all" || scopeFilter !== "all") {
      return "No pricing rules match the selected filters.";
    }
    return "No pricing rules found. Create your first rule to set global markup and exchange defaults.";
  }, [search, statusFilter, scopeFilter]);

  async function handleFormSubmit(data: CreatePricingRuleFormValues) {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...data,
        description: data.description || null,
        scope_value: data.scope_value || null,
        supplier_currency: data.supplier_currency || null,
        display_currency: data.display_currency || null,
        default_markup_value: data.default_markup_value || null,
        default_exchange_rate: data.default_exchange_rate ?? null,
        rate_lock_days: data.rate_lock_days ?? null,
        minimum_margin_percent: data.minimum_margin_percent ?? null,
        finance_approval_threshold: data.finance_approval_threshold ?? null,
        display_order: data.display_order ?? 0,
      };

      if (formMode === "edit" && editingRule) {
        await updatePricingRule(editingRule.id, payload);
        await loadRules();
      } else {
        await createPricingRule(payload);
        await loadRules();
        setPage(1);
      }

      await loadStats();
      setFormMode(null);
      setEditingRule(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pricing rule");
    } finally {
      setIsSaving(false);
    }
  }

  function openCreate() {
    setEditingRule(null);
    setFormMode("create");
    setViewingRule(null);
  }

  useImperativeHandle(ref, () => ({ openCreate }), []);

  function openEdit(rule: PricingRuleRecord) {
    setEditingRule(rule);
    setFormMode("edit");
    setViewingRule(null);
  }

  return (
    <>
      <PricingRulesStatsGrid stats={stats} loading={statsLoading || loading} />

      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Icon
              name="Search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by rule name or scope..."
              className={`w-full pl-9 pr-3 ${filterControlClass}`}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as PricingRuleStatusFilter);
                setPage(1);
              }}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[140px] px-3 pr-9 ${filterControlClass}`}
            >
              {PRICING_RULE_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={scopeFilter}
              onChange={(e) => {
                setScopeFilter(e.target.value as PricingRuleScopeFilter);
                setPage(1);
              }}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[150px] px-3 pr-9 ${filterControlClass}`}
            >
              {PRICING_RULE_SCOPE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={sort}
              onChange={(e) => setSort(e.target.value as "display_order" | "created_at" | "name")}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[160px] px-3 pr-9 ${filterControlClass}`}
            >
              {PRICING_RULE_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={order}
              onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              wrapperClassName="w-auto shrink-0"
              className={`min-w-[120px] px-3 pr-9 ${filterControlClass}`}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </NativeSelect>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#FAFBFC]">
          <p className="text-xs text-gray-500">
            {loading ? (
              "Loading pricing rules…"
            ) : total > 0 ? (
              <>
                Showing <span className="font-medium text-gray-700">{rules.length}</span> of{" "}
                <span className="font-medium text-gray-700">{total}</span> rules
              </>
            ) : (
              "No pricing rules to display"
            )}
          </p>
        </div>

        <PricingRulesListTable
          rules={rules}
          loading={loading}
          emptyMessage={emptyMessage}
          canDelete={canDelete}
          onView={setViewingRule}
          onEdit={openEdit}
          onRuleRemoved={(id) => {
            setRules((prev) => prev.filter((r) => r.id !== id));
            setTotal((t) => Math.max(0, t - 1));
            void loadStats();
          }}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E8ECF0] bg-[#FAFBFC]">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm"
              >
                <Icon name="ChevronLeft" size={16} className="mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 shadow-sm"
              >
                Next
                <Icon name="ChevronRight" size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 border-0 cursor-default"
            aria-label="Close"
            onClick={() => {
              if (!isSaving) {
                setFormMode(null);
                setEditingRule(null);
              }
            }}
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-[#E5E7EB]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-[#E5E7EB] bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {formMode === "edit" ? "Edit Pricing Rule" : "Create Pricing Rule"}
              </h2>
              <Button
                type="button"
                onClick={() => {
                  if (!isSaving) {
                    setFormMode(null);
                    setEditingRule(null);
                  }
                }}
                disabled={isSaving}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                <Icon name="X" size={20} />
              </Button>
            </div>
            <div className="p-6">
              <PricingRuleForm
                initialData={editingRule}
                isSaving={isSaving}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  if (!isSaving) {
                    setFormMode(null);
                    setEditingRule(null);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      <PricingRuleDetailsModal
        rule={viewingRule}
        onClose={() => setViewingRule(null)}
        onEdit={(rule) => {
          setViewingRule(null);
          openEdit(rule);
        }}
      />
    </>
  );
});
