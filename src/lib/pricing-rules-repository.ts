import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query } from "./db";
import type {
  CreatePricingRuleInput,
  ListPricingRulesParams,
  ListPricingRulesResult,
  PricingRuleRecord,
  PricingRulesStats,
  TieredMarkupBand,
  UpdatePricingRuleInput,
} from "./pricing-rules-types";

const TABLE = "pricing_rules";

function parseTieredJson(value: unknown): TieredMarkupBand[] | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as TieredMarkupBand[];
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) return value as TieredMarkupBand[];
  return null;
}

function parseRuleRow(row: RowDataPacket): PricingRuleRecord {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description ?? null,
    scope_type: row.scope_type,
    scope_value: row.scope_value ?? null,
    supplier_currency: row.supplier_currency ?? null,
    display_currency: row.display_currency ?? null,
    exchange_rate_type: row.exchange_rate_type,
    default_exchange_rate:
      row.default_exchange_rate !== null && row.default_exchange_rate !== undefined
        ? Number(row.default_exchange_rate)
        : null,
    rate_lock_days:
      row.rate_lock_days !== null && row.rate_lock_days !== undefined
        ? Number(row.rate_lock_days)
        : null,
    markup_type: row.markup_type,
    default_markup_value: row.default_markup_value ?? null,
    tiered_markup_json: parseTieredJson(row.tiered_markup_json),
    minimum_margin_percent:
      row.minimum_margin_percent !== null && row.minimum_margin_percent !== undefined
        ? Number(row.minimum_margin_percent)
        : null,
    finance_approval_threshold:
      row.finance_approval_threshold !== null &&
      row.finance_approval_threshold !== undefined
        ? Number(row.finance_approval_threshold)
        : null,
    requires_finance_approval: Boolean(row.requires_finance_approval),
    status: row.status,
    is_default: Boolean(row.is_default),
    display_order: Number(row.display_order),
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

async function isNameTaken(name: string, excludeId?: number): Promise<boolean> {
  const sql = excludeId
    ? `SELECT id FROM ${TABLE} WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1`
    : `SELECT id FROM ${TABLE} WHERE LOWER(name) = LOWER(?) LIMIT 1`;
  const params = excludeId ? [name, excludeId] : [name];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.length > 0;
}

async function clearDefaultFlag(excludeId?: number): Promise<void> {
  const sql = excludeId
    ? `UPDATE ${TABLE} SET is_default = 0 WHERE is_default = 1 AND id != ?`
    : `UPDATE ${TABLE} SET is_default = 0 WHERE is_default = 1`;
  const params = excludeId ? [excludeId] : [];
  await query<ResultSetHeader>(sql, params);
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

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (activeOnly || status === "active") {
    conditions.push("status = 'active'");
  } else if (status === "inactive") {
    conditions.push("status = 'inactive'");
  }

  if (scope_type !== "all") {
    conditions.push("scope_type = ?");
    values.push(scope_type);
  }

  if (search?.trim()) {
    conditions.push("(name LIKE ? OR scope_value LIKE ? OR description LIKE ?)");
    const term = `%${search.trim()}%`;
    values.push(term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortColumn =
    sort === "created_at" ? "created_at" : sort === "name" ? "name" : "display_order";
  const sortOrder = order === "desc" ? "DESC" : "ASC";

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${TABLE} ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TABLE}
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, name ASC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
  );

  return {
    rules: rows.map(parseRuleRow),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getPricingRuleById(id: number): Promise<PricingRuleRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return parseRuleRow(rows[0]);
}

export async function getDefaultPricingRule(): Promise<PricingRuleRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TABLE} WHERE is_default = 1 AND status = 'active' LIMIT 1`
  );
  if (!rows.length) return null;
  return parseRuleRow(rows[0]);
}

export async function getPricingRulesStats(): Promise<PricingRulesStats> {
  const countRows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive
     FROM ${TABLE}`
  );
  const row = countRows[0];
  const default_rule = await getDefaultPricingRule();

  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    inactive: Number(row?.inactive ?? 0),
    default_rule,
  };
}

export async function createPricingRule(
  input: CreatePricingRuleInput,
  audit?: PackageAuditContext
): Promise<PricingRuleRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Rule name is required");
  }

  if (await isNameTaken(name)) {
    throw new Error("A pricing rule with this name already exists");
  }

  if (input.is_default) {
    await clearDefaultFlag();
  }

  const auditUser = audit?.user ?? null;
  const tieredJson = input.tiered_markup_json?.length
    ? JSON.stringify(input.tiered_markup_json)
    : null;

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${TABLE} (
      name, description, scope_type, scope_value,
      supplier_currency, display_currency,
      exchange_rate_type, default_exchange_rate, rate_lock_days,
      markup_type, default_markup_value, tiered_markup_json,
      minimum_margin_percent, finance_approval_threshold, requires_finance_approval,
      status, is_default, display_order,
      created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      input.description?.trim() || null,
      input.scope_type ?? "global",
      input.scope_value?.trim() || null,
      input.supplier_currency?.trim() || null,
      input.display_currency?.trim() || null,
      input.exchange_rate_type ?? "manual",
      input.default_exchange_rate ?? null,
      input.rate_lock_days ?? null,
      input.markup_type ?? "percentage",
      input.default_markup_value?.trim() || null,
      tieredJson,
      input.minimum_margin_percent ?? null,
      input.finance_approval_threshold ?? null,
      input.requires_finance_approval !== false ? 1 : 0,
      input.status ?? "active",
      input.is_default ? 1 : 0,
      input.display_order ?? 0,
      auditUser,
      auditUser,
    ]
  );

  const created = await getPricingRuleById(result.insertId);
  if (!created) {
    throw new Error("Failed to load pricing rule after create");
  }
  return created;
}

export async function updatePricingRule(
  id: number,
  input: UpdatePricingRuleInput,
  audit?: PackageAuditContext
): Promise<PricingRuleRecord | null> {
  const existing = await getPricingRuleById(id);
  if (!existing) return null;

  if (input.is_default) {
    await clearDefaultFlag(id);
  }

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Rule name is required");
    }
    if (await isNameTaken(name, id)) {
      throw new Error("A pricing rule with this name already exists");
    }
    fields.push("name = ?");
    values.push(name);
  }

  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description?.trim() || null);
  }
  if (input.scope_type !== undefined) {
    fields.push("scope_type = ?");
    values.push(input.scope_type);
  }
  if (input.scope_value !== undefined) {
    fields.push("scope_value = ?");
    values.push(input.scope_value?.trim() || null);
  }
  if (input.supplier_currency !== undefined) {
    fields.push("supplier_currency = ?");
    values.push(input.supplier_currency?.trim() || null);
  }
  if (input.display_currency !== undefined) {
    fields.push("display_currency = ?");
    values.push(input.display_currency?.trim() || null);
  }
  if (input.exchange_rate_type !== undefined) {
    fields.push("exchange_rate_type = ?");
    values.push(input.exchange_rate_type);
  }
  if (input.default_exchange_rate !== undefined) {
    fields.push("default_exchange_rate = ?");
    values.push(input.default_exchange_rate);
  }
  if (input.rate_lock_days !== undefined) {
    fields.push("rate_lock_days = ?");
    values.push(input.rate_lock_days);
  }
  if (input.markup_type !== undefined) {
    fields.push("markup_type = ?");
    values.push(input.markup_type);
  }
  if (input.default_markup_value !== undefined) {
    fields.push("default_markup_value = ?");
    values.push(input.default_markup_value?.trim() || null);
  }
  if (input.tiered_markup_json !== undefined) {
    fields.push("tiered_markup_json = ?");
    values.push(
      input.tiered_markup_json?.length ? JSON.stringify(input.tiered_markup_json) : null
    );
  }
  if (input.minimum_margin_percent !== undefined) {
    fields.push("minimum_margin_percent = ?");
    values.push(input.minimum_margin_percent);
  }
  if (input.finance_approval_threshold !== undefined) {
    fields.push("finance_approval_threshold = ?");
    values.push(input.finance_approval_threshold);
  }
  if (input.requires_finance_approval !== undefined) {
    fields.push("requires_finance_approval = ?");
    values.push(input.requires_finance_approval ? 1 : 0);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.is_default !== undefined) {
    fields.push("is_default = ?");
    values.push(input.is_default ? 1 : 0);
  }
  if (input.display_order !== undefined) {
    fields.push("display_order = ?");
    values.push(input.display_order);
  }

  if (!fields.length) {
    return existing;
  }

  if (audit?.user) {
    fields.push("updated_by = ?");
    values.push(audit.user);
  }

  values.push(id);
  await query<ResultSetHeader>(
    `UPDATE ${TABLE} SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return getPricingRuleById(id);
}

export async function deletePricingRule(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}
