import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query } from "./db";
import type {
  CreateSupplierInput,
  ListSuppliersParams,
  ListSuppliersResult,
  SupplierRecord,
  SuppliersStats,
  UpdateSupplierInput,
} from "./supplier-types";

const TABLE = "suppliers";

function toDateString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return str;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseSupplierRow(row: RowDataPacket): SupplierRecord {
  return {
    id: Number(row.id),
    company_name: row.company_name,
    country: row.country,
    city_tour_area: row.city_tour_area ?? null,
    status: row.status,
    relationship_status: row.relationship_status,
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
    updated_at: toIso(row.updated_at),
  };
}

export async function listSuppliers(
  params: ListSuppliersParams = {}
): Promise<ListSuppliersResult> {
  const {
    search,
    status = "all",
    relationship_status = "all",
    country = "all",
    sort = "company_name",
    order = "asc",
    page = 1,
    limit = 20,
  } = params;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (status === "active" || status === "inactive" || status === "do_not_use") {
    conditions.push("status = ?");
    values.push(status);
  }

  if (relationship_status !== "all") {
    conditions.push("relationship_status = ?");
    values.push(relationship_status);
  }

  if (country !== "all" && country.trim()) {
    conditions.push("country = ?");
    values.push(country.trim());
  }

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      `(company_name LIKE ? OR country LIKE ? OR city_tour_area LIKE ? OR contact_person LIKE ? OR email_address LIKE ? OR services_offered LIKE ? OR relationship_owner LIKE ? OR notes LIKE ?)`
    );
    values.push(term, term, term, term, term, term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const allowedSortColumns = new Set([
    "date_added_updated",
    "country",
    "status",
    "city_tour_area",
    "relationship_status",
    "company_name",
    "services_offered",
    "contact_person",
    "email_address",
    "contact_number",
    "website",
    "notes",
    "problems_with_services",
    "account_details",
    "tc_poc_fixed_departure",
    "relationship_owner",
    "updated_at",
  ]);
  const sortColumn = allowedSortColumns.has(sort) ? sort : "company_name";
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
     ORDER BY ${sortColumn} ${sortOrder}, company_name ASC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
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
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return parseSupplierRow(rows[0]);
}

export async function getSuppliersStats(): Promise<SuppliersStats> {
  const countRows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive,
      SUM(CASE WHEN relationship_status = 'with_issues' THEN 1 ELSE 0 END) AS with_issues,
      COUNT(DISTINCT country) AS countries
     FROM ${TABLE}`
  );
  const row = countRows[0];

  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    inactive: Number(row?.inactive ?? 0),
    with_issues: Number(row?.with_issues ?? 0),
    countries: Number(row?.countries ?? 0),
  };
}

export async function listSupplierCountries(): Promise<string[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT DISTINCT country FROM ${TABLE}
     WHERE country IS NOT NULL AND country != ''
     ORDER BY country ASC`
  );
  return rows.map((row) => String(row.country));
}

export async function createSupplier(
  input: CreateSupplierInput,
  audit?: PackageAuditContext
): Promise<SupplierRecord> {
  const companyName = input.company_name.trim();
  const country = input.country.trim();
  if (!companyName) throw new Error("Company name is required");
  if (!country) throw new Error("Country is required");

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${TABLE} (
      company_name, country, city_tour_area, status, relationship_status,
      services_offered, contact_person, email_address, contact_number, website,
      notes, problems_with_services, account_details, tc_poc_fixed_departure,
      relationship_owner, date_added_updated, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyName,
      country,
      emptyToNull(input.city_tour_area),
      input.status ?? "active",
      input.relationship_status ?? "new",
      emptyToNull(input.services_offered),
      emptyToNull(input.contact_person),
      emptyToNull(input.email_address),
      emptyToNull(input.contact_number),
      emptyToNull(input.website),
      emptyToNull(input.notes),
      emptyToNull(input.problems_with_services),
      emptyToNull(input.account_details),
      emptyToNull(input.tc_poc_fixed_departure),
      emptyToNull(input.relationship_owner),
      emptyToNull(input.date_added_updated),
      audit?.user ?? null,
      audit?.user ?? null,
    ]
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

  const companyName =
    input.company_name !== undefined ? input.company_name.trim() : existing.company_name;
  const country = input.country !== undefined ? input.country.trim() : existing.country;
  if (!companyName) throw new Error("Company name is required");
  if (!country) throw new Error("Country is required");

  await query<ResultSetHeader>(
    `UPDATE ${TABLE} SET
      company_name = ?,
      country = ?,
      city_tour_area = ?,
      status = ?,
      relationship_status = ?,
      services_offered = ?,
      contact_person = ?,
      email_address = ?,
      contact_number = ?,
      website = ?,
      notes = ?,
      problems_with_services = ?,
      account_details = ?,
      tc_poc_fixed_departure = ?,
      relationship_owner = ?,
      date_added_updated = ?,
      updated_by = ?
     WHERE id = ?`,
    [
      companyName,
      country,
      input.city_tour_area !== undefined
        ? emptyToNull(input.city_tour_area)
        : existing.city_tour_area,
      input.status ?? existing.status,
      input.relationship_status ?? existing.relationship_status,
      input.services_offered !== undefined
        ? emptyToNull(input.services_offered)
        : existing.services_offered,
      input.contact_person !== undefined
        ? emptyToNull(input.contact_person)
        : existing.contact_person,
      input.email_address !== undefined
        ? emptyToNull(input.email_address)
        : existing.email_address,
      input.contact_number !== undefined
        ? emptyToNull(input.contact_number)
        : existing.contact_number,
      input.website !== undefined ? emptyToNull(input.website) : existing.website,
      input.notes !== undefined ? emptyToNull(input.notes) : existing.notes,
      input.problems_with_services !== undefined
        ? emptyToNull(input.problems_with_services)
        : existing.problems_with_services,
      input.account_details !== undefined
        ? emptyToNull(input.account_details)
        : existing.account_details,
      input.tc_poc_fixed_departure !== undefined
        ? emptyToNull(input.tc_poc_fixed_departure)
        : existing.tc_poc_fixed_departure,
      input.relationship_owner !== undefined
        ? emptyToNull(input.relationship_owner)
        : existing.relationship_owner,
      input.date_added_updated !== undefined
        ? emptyToNull(input.date_added_updated)
        : existing.date_added_updated,
      audit?.user ?? existing.updated_by,
      id,
    ]
  );

  return getSupplierById(id);
}

export async function deleteSupplier(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}
