import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query, sqlLimit, sqlOffset } from "./db";
import { toDateOnlySgt, toIsoSgtOrNow } from "./format-date";
import { LEGACY_TABLES } from "./legacy-tables";
import {
  SUPPLIER_RELATIONSHIP_OPTIONS,
  SUPPLIER_STATUS_OPTIONS,
  type CreateSupplierInput,
  type ListSuppliersParams,
  type ListSuppliersResult,
  type SupplierRecord,
  type SupplierRelationshipStatus,
  type SupplierStatus,
  type SuppliersStats,
  type UpdateSupplierInput,
} from "./supplier-types";

/** Dedicated supplier table; columns match SupplierRecord one-to-one. */
const TABLE = LEGACY_TABLES.suppliers;

/** Optional text columns and their VARCHAR limits (null = TEXT). */
const TEXT_COLUMNS = {
  city_tour_area: 500,
  services_offered: null,
  contact_person: 500,
  email_address: null,
  contact_number: null,
  website: 500,
  notes: null,
  problems_with_services: null,
  account_details: null,
  tc_poc_fixed_departure: 255,
  relationship_owner: 255,
} as const satisfies Record<string, number | null>;

type TextColumn = keyof typeof TEXT_COLUMNS;

const STATUSES = new Set<string>(SUPPLIER_STATUS_OPTIONS.map((o) => o.value));
const RELATIONSHIPS = new Set<string>(SUPPLIER_RELATIONSHIP_OPTIONS.map((o) => o.value));

function toIso(value: unknown): string {
  return toIsoSgtOrNow(
    value instanceof Date || typeof value === "string" ? value : value != null ? String(value) : null
  );
}

function toDateString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date || typeof value === "string") return toDateOnlySgt(value);
  return null;
}

function cleanText(value: string | null | undefined, max: number | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (max !== null && trimmed.length > max) {
    throw new Error(`Value is too long (max ${max} characters)`);
  }
  return trimmed;
}

function cleanDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) throw new Error("Date must be YYYY-MM-DD");
  return trimmed.slice(0, 10);
}

function parseSupplierRow(row: RowDataPacket): SupplierRecord {
  return {
    id: Number(row.id),
    company_name: String(row.company_name ?? ""),
    country: String(row.country ?? ""),
    city_tour_area: row.city_tour_area ?? null,
    status: (STATUSES.has(row.status) ? row.status : "inactive") as SupplierStatus,
    relationship_status: (RELATIONSHIPS.has(row.relationship_status)
      ? row.relationship_status
      : "new") as SupplierRelationshipStatus,
    services_offered: row.services_offered ?? null,
    contact_person: row.contact_person ?? null,
    email_address: row.email_address ?? null,
    contact_number: row.contact_number ?? null,
    website: row.website ?? null,
    notes: row.notes ?? null,
    problems_with_services: row.problems_with_services ?? null,
    account_details: row.account_details ?? null,
    tc_poc_fixed_departure: row.tc_poc_fixed_departure ?? null,
    relationship_owner: row.relationship_owner ?? null,
    date_added_updated: toDateString(row.date_added_updated),
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at ?? row.created_at),
  };
}

const SORT_COLUMNS: Record<string, string> = {
  company_name: "company_name",
  country: "country",
  status: "status",
  city_tour_area: "city_tour_area",
  relationship_status: "relationship_status",
  services_offered: "services_offered",
  contact_person: "contact_person",
  email_address: "email_address",
  contact_number: "contact_number",
  website: "website",
  notes: "notes",
  problems_with_services: "problems_with_services",
  account_details: "account_details",
  tc_poc_fixed_departure: "tc_poc_fixed_departure",
  relationship_owner: "relationship_owner",
  updated_at: "updated_at",
  date_added_updated: "date_added_updated",
};

export async function listSuppliers(
  params: ListSuppliersParams = {}
): Promise<ListSuppliersResult> {
  const { search, status = "all", sort = "company_name", order = "asc", page = 1, limit = 20 } =
    params;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (status !== "all" && STATUSES.has(status)) {
    conditions.push("status = ?");
    values.push(status);
  }
  if (params.relationship_status && params.relationship_status !== "all") {
    conditions.push("relationship_status = ?");
    values.push(params.relationship_status);
  }
  if (params.country && params.country !== "all") {
    conditions.push("LOWER(country) = LOWER(?)");
    values.push(params.country.trim());
  }
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      `(company_name LIKE ? OR country LIKE ? OR city_tour_area LIKE ? OR services_offered LIKE ?
        OR contact_person LIKE ? OR email_address LIKE ? OR notes LIKE ?)`
    );
    values.push(term, term, term, term, term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sortColumn = SORT_COLUMNS[sort] ?? "company_name";
  const sortOrder = order === "desc" ? "DESC" : "ASC";

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${TABLE} ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);
  const safeLimit = sqlLimit(limit);
  const safePage = Math.max(page, 1);
  const offset = sqlOffset((safePage - 1) * safeLimit);

  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TABLE}
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, company_name ASC, id ASC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    values
  );

  return {
    suppliers: rows.map(parseSupplierRow),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getSupplierById(id: number): Promise<SupplierRecord | null> {
  const rows = await query<RowDataPacket[]>(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
  return rows.length ? parseSupplierRow(rows[0]) : null;
}

export async function getSuppliersStats(): Promise<SuppliersStats> {
  const rows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(status = 'active') AS active,
      SUM(status = 'inactive') AS inactive,
      SUM(status = 'do_not_use') AS do_not_use,
      SUM(relationship_status = 'with_issues') AS with_issues,
      COUNT(DISTINCT NULLIF(TRIM(country), '')) AS countries
     FROM ${TABLE}`
  );
  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    active: Number(row.active ?? 0),
    inactive: Number(row.inactive ?? 0),
    do_not_use: Number(row.do_not_use ?? 0),
    with_issues: Number(row.with_issues ?? 0),
    countries: Number(row.countries ?? 0),
  };
}

export async function listSupplierCountries(): Promise<string[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT DISTINCT TRIM(country) AS country FROM ${TABLE}
     WHERE TRIM(country) <> '' ORDER BY country ASC`
  );
  return rows.map((row) => String(row.country));
}

function requireName(value: string, label: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required`);
  if (trimmed.length > max) throw new Error(`${label} is too long (max ${max} characters)`);
  return trimmed;
}

export async function createSupplier(
  input: CreateSupplierInput,
  audit?: PackageAuditContext
): Promise<SupplierRecord> {
  const columns: string[] = [
    "company_name",
    "country",
    "status",
    "relationship_status",
    "date_added_updated",
    "created_by",
    "updated_by",
  ];
  const values: (string | null)[] = [
    requireName(input.company_name, "Company name", 255),
    requireName(input.country, "Country", 120),
    input.status && STATUSES.has(input.status) ? input.status : "active",
    input.relationship_status && RELATIONSHIPS.has(input.relationship_status)
      ? input.relationship_status
      : "new",
    cleanDate(input.date_added_updated) ?? toDateOnlySgt(new Date()),
    audit?.user ?? null,
    audit?.user ?? null,
  ];
  for (const [column, max] of Object.entries(TEXT_COLUMNS) as [TextColumn, number | null][]) {
    columns.push(column);
    values.push(cleanText(input[column], max));
  }

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${TABLE} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    values
  );
  const created = await getSupplierById(Number(result.insertId));
  if (!created) throw new Error("Failed to load created supplier");
  return created;
}

export async function updateSupplier(
  id: number,
  input: UpdateSupplierInput,
  audit?: PackageAuditContext
): Promise<SupplierRecord | null> {
  const existing = await getSupplierById(id);
  if (!existing) return null;

  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const set = (column: string, value: string | null) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };

  if (input.company_name !== undefined) set("company_name", requireName(input.company_name, "Company name", 255));
  if (input.country !== undefined) set("country", requireName(input.country, "Country", 120));
  if (input.status !== undefined && STATUSES.has(input.status)) set("status", input.status);
  if (input.relationship_status !== undefined && RELATIONSHIPS.has(input.relationship_status)) {
    set("relationship_status", input.relationship_status);
  }
  if (input.date_added_updated !== undefined) set("date_added_updated", cleanDate(input.date_added_updated));
  for (const [column, max] of Object.entries(TEXT_COLUMNS) as [TextColumn, number | null][]) {
    if (input[column] !== undefined) set(column, cleanText(input[column], max));
  }
  if (audit?.user) set("updated_by", audit.user);

  if (sets.length) {
    values.push(id);
    await query(`UPDATE ${TABLE} SET ${sets.join(", ")} WHERE id = ?`, values);
  }
  return getSupplierById(id);
}

export async function deleteSupplier(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}
