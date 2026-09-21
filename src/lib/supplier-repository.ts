import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query, sqlLimit, sqlOffset } from "./db";
import { toDateOnlySgt, toIsoSgtOrNow } from "./format-date";
import { LEGACY_TABLES } from "./legacy-tables";
import type {
  CreateSupplierInput,
  ListSuppliersParams,
  ListSuppliersResult,
  SupplierRecord,
  SupplierRelationshipStatus,
  SupplierStatus,
  SuppliersStats,
  UpdateSupplierInput,
} from "./supplier-types";

const TABLE = LEGACY_TABLES.partners;

type PartnerExtras = {
  country?: string;
  city_tour_area?: string | null;
  relationship_status?: SupplierRelationshipStatus;
  services_offered?: string | null;
  contact_person?: string | null;
  email_address?: string | null;
  contact_number?: string | null;
  notes?: string | null;
  problems_with_services?: string | null;
  account_details?: string | null;
  tc_poc_fixed_departure?: string | null;
  relationship_owner?: string | null;
  date_added_updated?: string | null;
};

function toIso(value: unknown): string {
  return toIsoSgtOrNow(
    value instanceof Date || typeof value === "string" ? value : value != null ? String(value) : null
  );
}

function toDateString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date || typeof value === "string") {
    return toDateOnlySgt(value);
  }
  const str = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0, 10) : str;
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function statusFromInt(value: unknown): SupplierStatus {
  const n = Number(value);
  if (n === 1) return "active";
  if (n === 3) return "do_not_use";
  return "inactive";
}

function statusToInt(status: SupplierStatus | undefined): number {
  if (status === "active") return 1;
  if (status === "do_not_use") return 3;
  return 2;
}

function parseExtras(raw: unknown): PartnerExtras {
  if (!raw || typeof raw !== "string") return {};
  const text = raw.trim();
  if (!text.startsWith("{")) return { notes: text || null };
  try {
    return JSON.parse(text) as PartnerExtras;
  } catch {
    return { notes: text };
  }
}

function encodeExtras(extras: PartnerExtras): string {
  return JSON.stringify(extras);
}

function parseSupplierRow(row: RowDataPacket): SupplierRecord {
  const extras = parseExtras(row.image_heading);
  return {
    id: Number(row.id),
    company_name: String(row.title ?? ""),
    country: extras.country || "Unknown",
    city_tour_area: extras.city_tour_area ?? null,
    status: statusFromInt(row.status),
    relationship_status: extras.relationship_status ?? "new",
    services_offered: extras.services_offered ?? null,
    contact_person: extras.contact_person ?? null,
    email_address: extras.email_address ?? null,
    contact_number: extras.contact_number ?? null,
    website: row.website_url ?? null,
    notes: extras.notes ?? null,
    problems_with_services: extras.problems_with_services ?? null,
    account_details: extras.account_details ?? null,
    tc_poc_fixed_departure: extras.tc_poc_fixed_departure ?? null,
    relationship_owner: extras.relationship_owner ?? null,
    date_added_updated: extras.date_added_updated ?? toDateString(row.edit_date ?? row.insert_date),
    created_by: null,
    updated_by: null,
    created_at: toIso(row.insert_date),
    updated_at: toIso(row.edit_date ?? row.insert_date),
  };
}

function buildExtras(
  input: Partial<CreateSupplierInput & UpdateSupplierInput>,
  existing?: SupplierRecord
): PartnerExtras {
  return {
    country: input.country?.trim() || existing?.country || "Unknown",
    city_tour_area:
      input.city_tour_area !== undefined
        ? emptyToNull(input.city_tour_area)
        : existing?.city_tour_area ?? null,
    relationship_status:
      input.relationship_status ?? existing?.relationship_status ?? "new",
    services_offered:
      input.services_offered !== undefined
        ? emptyToNull(input.services_offered)
        : existing?.services_offered ?? null,
    contact_person:
      input.contact_person !== undefined
        ? emptyToNull(input.contact_person)
        : existing?.contact_person ?? null,
    email_address:
      input.email_address !== undefined
        ? emptyToNull(input.email_address)
        : existing?.email_address ?? null,
    contact_number:
      input.contact_number !== undefined
        ? emptyToNull(input.contact_number)
        : existing?.contact_number ?? null,
    notes: input.notes !== undefined ? emptyToNull(input.notes) : existing?.notes ?? null,
    problems_with_services:
      input.problems_with_services !== undefined
        ? emptyToNull(input.problems_with_services)
        : existing?.problems_with_services ?? null,
    account_details:
      input.account_details !== undefined
        ? emptyToNull(input.account_details)
        : existing?.account_details ?? null,
    tc_poc_fixed_departure:
      input.tc_poc_fixed_departure !== undefined
        ? emptyToNull(input.tc_poc_fixed_departure)
        : existing?.tc_poc_fixed_departure ?? null,
    relationship_owner:
      input.relationship_owner !== undefined
        ? emptyToNull(input.relationship_owner)
        : existing?.relationship_owner ?? null,
    date_added_updated:
      input.date_added_updated !== undefined
        ? emptyToNull(input.date_added_updated)
        : existing?.date_added_updated ?? null,
  };
}

export async function listSuppliers(
  params: ListSuppliersParams = {}
): Promise<ListSuppliersResult> {
  const {
    search,
    status = "all",
    sort = "company_name",
    order = "asc",
    page = 1,
    limit = 20,
  } = params;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (status === "active") conditions.push("status = 1");
  else if (status === "inactive") conditions.push("status = 2");
  else if (status === "do_not_use") conditions.push("status = 3");

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(`(title LIKE ? OR website_url LIKE ? OR image_heading LIKE ?)`);
    values.push(term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sortColumn = sort === "updated_at" || sort === "date_added_updated" ? "edit_date" : "title";
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
     ORDER BY ${sortColumn} ${sortOrder}, title ASC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    values
  );

  let suppliers = rows.map(parseSupplierRow);
  if (params.relationship_status && params.relationship_status !== "all") {
    suppliers = suppliers.filter((s) => s.relationship_status === params.relationship_status);
  }
  if (params.country && params.country !== "all") {
    suppliers = suppliers.filter(
      (s) => s.country.toLowerCase() === params.country!.trim().toLowerCase()
    );
  }

  return {
    suppliers,
    total: params.country && params.country !== "all" ? suppliers.length : total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getSupplierById(id: number): Promise<SupplierRecord | null> {
  const rows = await query<RowDataPacket[]>(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) return null;
  return parseSupplierRow(rows[0]);
}

export async function getSuppliersStats(): Promise<SuppliersStats> {
  const countRows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS inactive
     FROM ${TABLE}`
  );
  const row = countRows[0];
  const all = await query<RowDataPacket[]>(`SELECT image_heading FROM ${TABLE}`);
  const countries = new Set<string>();
  let withIssues = 0;
  for (const item of all) {
    const extras = parseExtras(item.image_heading);
    if (extras.country) countries.add(extras.country);
    if (extras.relationship_status === "with_issues") withIssues += 1;
  }

  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    inactive: Number(row?.inactive ?? 0),
    with_issues: withIssues,
    countries: countries.size,
  };
}

export async function listSupplierCountries(): Promise<string[]> {
  const rows = await query<RowDataPacket[]>(`SELECT image_heading FROM ${TABLE}`);
  const countries = new Set<string>();
  for (const row of rows) {
    const extras = parseExtras(row.image_heading);
    if (extras.country?.trim()) countries.add(extras.country.trim());
  }
  return [...countries].sort((a, b) => a.localeCompare(b));
}

export async function createSupplier(
  input: CreateSupplierInput,
  _audit?: PackageAuditContext
): Promise<SupplierRecord> {
  const companyName = input.company_name.trim();
  const country = input.country.trim();
  if (!companyName) throw new Error("Company name is required");
  if (!country) throw new Error("Country is required");

  const extras = buildExtras(input);
  const result = await query<ResultSetHeader>(
    `INSERT INTO ${TABLE}
      (title, image_heading, img, website_url, insert_date, edit_date, status, user_id)
     VALUES (?, ?, '', ?, NOW(), NOW(), ?, 0)`,
    [
      companyName,
      encodeExtras(extras),
      emptyToNull(input.website),
      statusToInt(input.status ?? "active"),
    ]
  );

  const created = await getSupplierById(Number(result.insertId));
  if (!created) throw new Error("Failed to load created supplier");
  return created;
}

export async function updateSupplier(
  id: number,
  input: UpdateSupplierInput,
  _audit?: PackageAuditContext
): Promise<SupplierRecord | null> {
  const existing = await getSupplierById(id);
  if (!existing) return null;

  const companyName =
    input.company_name !== undefined ? input.company_name.trim() : existing.company_name;
  const country = input.country !== undefined ? input.country.trim() : existing.country;
  if (!companyName) throw new Error("Company name is required");
  if (!country) throw new Error("Country is required");

  const extras = buildExtras({ ...input, country }, existing);
  await query<ResultSetHeader>(
    `UPDATE ${TABLE} SET
      title = ?,
      image_heading = ?,
      website_url = ?,
      status = ?,
      edit_date = NOW()
     WHERE id = ?`,
    [
      companyName,
      encodeExtras(extras),
      input.website !== undefined ? emptyToNull(input.website) : existing.website,
      statusToInt(input.status ?? existing.status),
      id,
    ]
  );

  return getSupplierById(id);
}

export async function deleteSupplier(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `UPDATE ${TABLE} SET status = 2, edit_date = NOW() WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}
