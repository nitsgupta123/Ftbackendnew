import type { PackageAuditContext } from "./audit-context";
import {
  deleteSettingBlob,
  getSettingBlobById,
  insertSettingBlob,
  listSettingBlobs,
  updateSettingBlob,
} from "./legacy-settings-store";
import { SETTINGS_BLOB } from "./legacy-tables";
import { nowIsoSgt } from "./format-date";
import type {
  CreatePricingRuleInput,
  ListPricingRulesParams,
  ListPricingRulesResult,
  PricingRuleRecord,
  PricingRulesStats,
  UpdatePricingRuleInput,
} from "./pricing-rules-types";

type StoredRule = PricingRuleRecord & { _rowId?: number };

function nowIso(): string {
  return nowIsoSgt();
}

function stripRow(rule: StoredRule): PricingRuleRecord {
  const { _rowId: _omit, ...rest } = rule;
  return rest;
}

async function loadAll(): Promise<StoredRule[]> {
  return listSettingBlobs<PricingRuleRecord>(SETTINGS_BLOB.pricingRule);
}

export async function listPricingRules(
  params: ListPricingRulesParams = {}
): Promise<ListPricingRulesResult> {
  const {
    search,
    status = "all",
    scope_type = "all",
    sort = "display_order",
    order = "asc",
    page = 1,
    limit = 20,
    activeOnly = false,
  } = params;

  let rules = (await loadAll()).map(stripRow);

  if (activeOnly || status === "active") rules = rules.filter((r) => r.status === "active");
  else if (status === "inactive") rules = rules.filter((r) => r.status === "inactive");

  if (scope_type !== "all") rules = rules.filter((r) => r.scope_type === scope_type);

  if (search?.trim()) {
    const term = search.trim().toLowerCase();
    rules = rules.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        (r.scope_value ?? "").toLowerCase().includes(term) ||
        (r.description ?? "").toLowerCase().includes(term)
    );
  }

  rules.sort((a, b) => {
    const dir = order === "desc" ? -1 : 1;
    if (sort === "name") return a.name.localeCompare(b.name) * dir;
    if (sort === "created_at") return a.created_at.localeCompare(b.created_at) * dir;
    return (a.display_order - b.display_order) * dir || a.name.localeCompare(b.name);
  });

  const total = rules.length;
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  return {
    rules: rules.slice(offset, offset + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getPricingRuleById(id: number): Promise<PricingRuleRecord | null> {
  const blob = await getSettingBlobById<PricingRuleRecord>(SETTINGS_BLOB.pricingRule, id);
  return blob ? stripRow(blob) : null;
}

export async function getDefaultPricingRule(): Promise<PricingRuleRecord | null> {
  const rules = await loadAll();
  const found = rules.find((r) => r.is_default && r.status === "active");
  return found ? stripRow(found) : null;
}

export async function getPricingRulesStats(): Promise<PricingRulesStats> {
  const rules = (await loadAll()).map(stripRow);
  return {
    total: rules.length,
    active: rules.filter((r) => r.status === "active").length,
    inactive: rules.filter((r) => r.status === "inactive").length,
    default_rule: rules.find((r) => r.is_default && r.status === "active") ?? null,
  };
}

async function clearDefaultFlag(excludeId?: number): Promise<void> {
  const rules = await loadAll();
  for (const rule of rules) {
    if (!rule.is_default) continue;
    if (excludeId && rule.id === excludeId) continue;
    await updateSettingBlob(SETTINGS_BLOB.pricingRule, rule.id, {
      ...stripRow(rule),
      is_default: false,
    });
  }
}

export async function createPricingRule(
  input: CreatePricingRuleInput,
  audit?: PackageAuditContext
): Promise<PricingRuleRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Rule name is required");

  const existing = await loadAll();
  if (existing.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("A pricing rule with this name already exists");
  }

  if (input.is_default) await clearDefaultFlag();

  const stamp = nowIso();
  const draft: Omit<PricingRuleRecord, "id"> & { id?: number } = {
    name,
    description: input.description?.trim() || null,
    scope_type: input.scope_type ?? "global",
    scope_value: input.scope_value?.trim() || null,
    supplier_currency: input.supplier_currency?.trim() || null,
    display_currency: input.display_currency?.trim() || null,
    exchange_rate_type: input.exchange_rate_type ?? "manual",
    default_exchange_rate: input.default_exchange_rate ?? null,
    rate_lock_days: input.rate_lock_days ?? null,
    markup_type: input.markup_type ?? "percentage",
    default_markup_value: input.default_markup_value?.trim() || null,
    tiered_markup_json: input.tiered_markup_json ?? null,
    minimum_margin_percent: input.minimum_margin_percent ?? null,
    finance_approval_threshold: input.finance_approval_threshold ?? null,
    requires_finance_approval: input.requires_finance_approval !== false,
    status: input.status ?? "active",
    is_default: Boolean(input.is_default),
    display_order: input.display_order ?? 0,
    created_by: audit?.user ?? null,
    updated_by: audit?.user ?? null,
    created_at: stamp,
    updated_at: stamp,
  };

  const id = await insertSettingBlob(SETTINGS_BLOB.pricingRule, name, draft);
  const created = await getPricingRuleById(id);
  if (!created) throw new Error("Failed to load pricing rule after create");
  return created;
}

export async function updatePricingRule(
  id: number,
  input: UpdatePricingRuleInput,
  audit?: PackageAuditContext
): Promise<PricingRuleRecord | null> {
  const existing = await getPricingRuleById(id);
  if (!existing) return null;

  if (input.is_default) await clearDefaultFlag(id);

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Rule name is required");
    const all = await loadAll();
    if (all.some((r) => r.id !== id && r.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("A pricing rule with this name already exists");
    }
  }

  const next: PricingRuleRecord = {
    ...existing,
    ...input,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    description:
      input.description !== undefined ? input.description?.trim() || null : existing.description,
    scope_value:
      input.scope_value !== undefined ? input.scope_value?.trim() || null : existing.scope_value,
    supplier_currency:
      input.supplier_currency !== undefined
        ? input.supplier_currency?.trim() || null
        : existing.supplier_currency,
    display_currency:
      input.display_currency !== undefined
        ? input.display_currency?.trim() || null
        : existing.display_currency,
    default_markup_value:
      input.default_markup_value !== undefined
        ? input.default_markup_value?.trim() || null
        : existing.default_markup_value,
    updated_by: audit?.user ?? existing.updated_by,
    updated_at: nowIso(),
  };

  await updateSettingBlob(SETTINGS_BLOB.pricingRule, id, next);
  return getPricingRuleById(id);
}

export async function deletePricingRule(id: number): Promise<boolean> {
  return deleteSettingBlob(SETTINGS_BLOB.pricingRule, id);
}
