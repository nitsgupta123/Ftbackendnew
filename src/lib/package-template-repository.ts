import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query } from "./db";
import type {
  ApplyPackageTemplateResult,
  CreatePackageTemplateInput,
  ListPackageTemplatesParams,
  ListPackageTemplatesResult,
  PackageTemplateRecord,
  PackageTemplatesStats,
  UpdatePackageTemplateInput,
} from "./package-template-types";
import type { UpdatePackageInput } from "./package-types";
import { TEMPLATE_STEP_OPTIONS } from "./package-template-types";
import { slugify, uniqueSlug } from "./slug";
import type { PackageSectionKey } from "./package-types";

const TABLE = "package_templates";

const JSON_COLUMNS = [
  "included_steps",
  "supplier_source",
  "package_basics",
  "media_frontend",
  "pricing",
  "itinerary",
  "hotels",
  "inclusions",
  "booking_policy",
  "consultant_view",
  "supplier_quote_tool",
  "frontend_faqs",
  "sales_ads_assets",
  "seo",
] as const;

const SECTION_COLUMNS = [
  "supplier_source",
  "package_basics",
  "media_frontend",
  "pricing",
  "itinerary",
  "hotels",
  "inclusions",
  "booking_policy",
  "consultant_view",
  "supplier_quote_tool",
  "frontend_faqs",
  "sales_ads_assets",
  "seo",
] as const satisfies readonly PackageSectionKey[];

function formatTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value ?? "");
}

function parseJsonColumn<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function parseTemplateRow(row: RowDataPacket): PackageTemplateRecord {
  const parsed: Record<string, unknown> = { ...row };

  for (const column of JSON_COLUMNS) {
    parsed[column] = parseJsonColumn(parsed[column]);
  }

  const includedSteps = parsed.included_steps;
  parsed.included_steps = Array.isArray(includedSteps)
    ? includedSteps.map((step) => Number(step)).filter((step) => step >= 1 && step <= 13)
    : [];

  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    template_type: row.template_type,
    included_steps: parsed.included_steps as number[],
    supplier_source: parsed.supplier_source as PackageTemplateRecord["supplier_source"],
    package_basics: parsed.package_basics as PackageTemplateRecord["package_basics"],
    media_frontend: parsed.media_frontend as PackageTemplateRecord["media_frontend"],
    pricing: parsed.pricing as PackageTemplateRecord["pricing"],
    itinerary: parsed.itinerary as PackageTemplateRecord["itinerary"],
    hotels: parsed.hotels as PackageTemplateRecord["hotels"],
    inclusions: parsed.inclusions as PackageTemplateRecord["inclusions"],
    booking_policy: parsed.booking_policy as PackageTemplateRecord["booking_policy"],
    consultant_view: parsed.consultant_view as PackageTemplateRecord["consultant_view"],
    supplier_quote_tool: parsed.supplier_quote_tool as PackageTemplateRecord["supplier_quote_tool"],
    frontend_faqs: parsed.frontend_faqs as PackageTemplateRecord["frontend_faqs"],
    sales_ads_assets: parsed.sales_ads_assets as PackageTemplateRecord["sales_ads_assets"],
    seo: parsed.seo as PackageTemplateRecord["seo"],
    status: row.status,
    is_default: Boolean(row.is_default),
    display_order: Number(row.display_order),
    usage_count: Number(row.usage_count ?? 0),
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at: formatTimestamp(row.created_at),
    updated_at: formatTimestamp(row.updated_at),
  };
}

function stringifyJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

async function listExistingSlugs(excludeId?: number): Promise<string[]> {
  const sql = excludeId
    ? `SELECT slug FROM ${TABLE} WHERE id != ?`
    : `SELECT slug FROM ${TABLE}`;
  const params = excludeId ? [excludeId] : [];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.map((r) => r.slug as string);
}

async function isNameTaken(name: string, excludeId?: number): Promise<boolean> {
  const sql = excludeId
    ? `SELECT id FROM ${TABLE} WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1`
    : `SELECT id FROM ${TABLE} WHERE LOWER(name) = LOWER(?) LIMIT 1`;
  const params = excludeId ? [name, excludeId] : [name];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.length > 0;
}

async function isSlugTaken(slug: string, excludeId?: number): Promise<boolean> {
  const sql = excludeId
    ? `SELECT id FROM ${TABLE} WHERE slug = ? AND id != ? LIMIT 1`
    : `SELECT id FROM ${TABLE} WHERE slug = ? LIMIT 1`;
  const params = excludeId ? [slug, excludeId] : [slug];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.length > 0;
}

export async function resolveTemplateSlug(
  name: string,
  requestedSlug?: string,
  excludeId?: number
): Promise<string> {
  const base = requestedSlug?.trim() ? slugify(requestedSlug) : slugify(name);
  if (!base) {
    throw new Error("Unable to generate a valid slug");
  }

  if (!(await isSlugTaken(base, excludeId))) {
    return base;
  }

  const existing = await listExistingSlugs(excludeId);
  return uniqueSlug(base, existing);
}

function normalizeIncludedSteps(steps?: number[]): number[] {
  if (!steps?.length) return [2];
  return [...new Set(steps.filter((step) => Number.isInteger(step) && step >= 1 && step <= 13))].sort(
    (a, b) => a - b
  );
}

function inferTemplateType(steps: number[]): "full" | "partial" {
  return steps.length >= 8 ? "full" : "partial";
}

async function clearOtherDefaults(excludeId?: number): Promise<void> {
  const sql = excludeId
    ? `UPDATE ${TABLE} SET is_default = 0 WHERE is_default = 1 AND id != ?`
    : `UPDATE ${TABLE} SET is_default = 0 WHERE is_default = 1`;
  const params = excludeId ? [excludeId] : [];
  await query<ResultSetHeader>(sql, params);
}

export async function listPackageTemplates(
  params: ListPackageTemplatesParams = {}
): Promise<ListPackageTemplatesResult> {
  const {
    search,
    status = "all",
    template_type = "all",
    sort = "display_order",
    order = "asc",
    page = 1,
    limit = 20,
    activeOnly = false,
  } = params;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (activeOnly || status === "active") {
    conditions.push("t.status = 'active'");
  } else if (status === "inactive") {
    conditions.push("t.status = 'inactive'");
  }

  if (template_type === "full" || template_type === "partial") {
    conditions.push("t.template_type = ?");
    values.push(template_type);
  }

  if (search?.trim()) {
    conditions.push("(t.name LIKE ? OR t.description LIKE ?)");
    const term = `%${search.trim()}%`;
    values.push(term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortColumn =
    sort === "created_at"
      ? "t.created_at"
      : sort === "usage_count"
        ? "t.usage_count"
        : "t.display_order";
  const sortOrder = order === "desc" ? "DESC" : "ASC";

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${TABLE} t ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const rows = await query<RowDataPacket[]>(
    `SELECT t.* FROM ${TABLE} t
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, t.name ASC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
  );

  return {
    templates: rows.map(parseTemplateRow),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getPackageTemplateStats(): Promise<PackageTemplatesStats> {
  const rows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive,
      SUM(CASE WHEN template_type = 'full' THEN 1 ELSE 0 END) AS full_count,
      SUM(CASE WHEN template_type = 'partial' THEN 1 ELSE 0 END) AS partial_count
     FROM ${TABLE}`
  );

  const defaultRows = await query<RowDataPacket[]>(
    `SELECT id, name, slug FROM ${TABLE} WHERE is_default = 1 ORDER BY display_order ASC LIMIT 1`
  );

  const row = rows[0] ?? {};
  const defaultRow = defaultRows[0];

  return {
    total: Number(row.total ?? 0),
    active: Number(row.active ?? 0),
    inactive: Number(row.inactive ?? 0),
    full: Number(row.full_count ?? 0),
    partial: Number(row.partial_count ?? 0),
    default_template: defaultRow
      ? {
          id: Number(defaultRow.id),
          name: defaultRow.name as string,
          slug: defaultRow.slug as string,
        }
      : null,
  };
}

export async function getPackageTemplateById(id: number): Promise<PackageTemplateRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return parseTemplateRow(rows[0]);
}

function buildInsertValues(input: CreatePackageTemplateInput) {
  const includedSteps = normalizeIncludedSteps(input.included_steps);
  const templateType = input.template_type ?? inferTemplateType(includedSteps);

  return {
    includedSteps,
    templateType,
    values: [
      input.name.trim(),
      null as string | null,
      input.description?.trim() || null,
      templateType,
      stringifyJson(includedSteps),
      stringifyJson(input.supplier_source),
      stringifyJson(input.package_basics),
      stringifyJson(input.media_frontend),
      stringifyJson(input.pricing),
      stringifyJson(input.itinerary),
      stringifyJson(input.hotels),
      stringifyJson(input.inclusions),
      stringifyJson(input.booking_policy),
      stringifyJson(input.consultant_view),
      stringifyJson(input.supplier_quote_tool),
      stringifyJson(input.frontend_faqs),
      stringifyJson(input.sales_ads_assets),
      stringifyJson(input.seo),
      input.status ?? "active",
      input.is_default ? 1 : 0,
      input.display_order ?? 0,
    ],
  };
}

export async function createPackageTemplate(
  input: CreatePackageTemplateInput,
  audit?: PackageAuditContext
): Promise<PackageTemplateRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Template name is required");
  }

  if (await isNameTaken(name)) {
    throw new Error("A template with this name already exists");
  }

  const slug = await resolveTemplateSlug(name, input.slug);
  const auditUser = audit?.user ?? null;
  const { values } = buildInsertValues(input);
  values[1] = slug;

  if (input.is_default) {
    await clearOtherDefaults();
  }

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${TABLE} (
      name, slug, description, template_type, included_steps,
      supplier_source, package_basics, media_frontend, pricing,
      itinerary, hotels, inclusions, booking_policy, consultant_view,
      supplier_quote_tool, frontend_faqs, sales_ads_assets, seo,
      status, is_default, display_order, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...values, auditUser, auditUser]
  );

  const created = await getPackageTemplateById(result.insertId);
  if (!created) {
    throw new Error("Failed to load template after create");
  }
  return created;
}

export async function updatePackageTemplate(
  id: number,
  input: UpdatePackageTemplateInput,
  audit?: PackageAuditContext
): Promise<PackageTemplateRecord | null> {
  const existing = await getPackageTemplateById(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Template name is required");
    }
    if (await isNameTaken(name, id)) {
      throw new Error("A template with this name already exists");
    }
    fields.push("name = ?");
    values.push(name);
  }

  if (input.slug !== undefined || input.name !== undefined) {
    const nameForSlug = input.name?.trim() ?? existing.name;
    const slug = await resolveTemplateSlug(nameForSlug, input.slug ?? existing.slug, id);
    fields.push("slug = ?");
    values.push(slug);
  }

  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description?.trim() || null);
  }

  if (input.included_steps !== undefined) {
    const includedSteps = normalizeIncludedSteps(input.included_steps);
    fields.push("included_steps = ?");
    values.push(stringifyJson(includedSteps));
    if (input.template_type === undefined) {
      fields.push("template_type = ?");
      values.push(inferTemplateType(includedSteps));
    }
  }

  if (input.template_type !== undefined) {
    fields.push("template_type = ?");
    values.push(input.template_type);
  }

  for (const column of SECTION_COLUMNS) {
    if (column in input) {
      fields.push(`${column} = ?`);
      values.push(stringifyJson(input[column]));
    }
  }

  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }

  if (input.is_default !== undefined) {
    if (input.is_default) {
      await clearOtherDefaults(id);
    }
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

  return getPackageTemplateById(id);
}

export async function deletePackageTemplate(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `DELETE FROM ${TABLE} WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

function sanitizeAppliedBasics(
  basics: PackageTemplateRecord["package_basics"]
): PackageTemplateRecord["package_basics"] {
  if (!basics) return null;
  return {
    ...basics,
    packageTitle: "",
    slug: "",
  };
}

function sanitizeAppliedSupplier(
  supplier: PackageTemplateRecord["supplier_source"]
): PackageTemplateRecord["supplier_source"] {
  if (!supplier) return null;
  const emails = Array.isArray(supplier.supplierEmails)
    ? supplier.supplierEmails.filter((email): email is string => typeof email === "string" && email.trim().length > 0)
    : [];
  return {
    supplierName: supplier.supplierName ?? "",
    supplierPackageName: supplier.supplierPackageName ?? "",
    supplierCountry: supplier.supplierCountry ?? "",
    contactPerson: supplier.contactPerson ?? "",
    supplierEmails: emails,
    supplierWhatsapp: supplier.supplierWhatsapp ?? "",
    internalSupplierNotes: supplier.internalSupplierNotes ?? "",
  };
}

function sanitizeAppliedSeo(seo: PackageTemplateRecord["seo"]): PackageTemplateRecord["seo"] {
  if (!seo) return null;
  return {
    ...seo,
    metaTitle: "",
    metaDescription: "",
  };
}

function computeFirstStep(template: PackageTemplateRecord): number {
  if (template.included_steps.length) {
    return template.included_steps[0];
  }
  return 1;
}

export function buildApplyTemplatePayload(template: PackageTemplateRecord): ApplyPackageTemplateResult {
  const includedSet = new Set(template.included_steps);
  const payload: UpdatePackageInput = {};

  for (const option of TEMPLATE_STEP_OPTIONS) {
    if (!includedSet.has(option.step)) continue;

    const key = option.key;
    const value = template[key];
    if (value === null || value === undefined) continue;

    if (key === "package_basics") {
      payload.package_basics = sanitizeAppliedBasics(value as PackageTemplateRecord["package_basics"]);
    } else if (key === "supplier_source") {
      payload.supplier_source = sanitizeAppliedSupplier(
        value as PackageTemplateRecord["supplier_source"]
      );
    } else if (key === "seo") {
      payload.seo = sanitizeAppliedSeo(value as PackageTemplateRecord["seo"]);
    } else {
      (payload as Record<string, unknown>)[key] = value;
    }
  }

  return {
    payload,
    current_step: computeFirstStep(template),
    template,
  };
}

export async function applyPackageTemplate(
  id: number,
  audit?: PackageAuditContext
): Promise<ApplyPackageTemplateResult | null> {
  const template = await getPackageTemplateById(id);
  if (!template) return null;
  if (template.status !== "active") {
    throw new Error("Only active templates can be applied");
  }

  const auditUser = audit?.user ?? null;
  await query<ResultSetHeader>(
    `UPDATE ${TABLE} SET usage_count = usage_count + 1${auditUser ? ", updated_by = ?" : ""} WHERE id = ?`,
    auditUser ? [auditUser, id] : [id]
  );

  const refreshed = await getPackageTemplateById(id);
  return buildApplyTemplatePayload(refreshed ?? template);
}

export async function listActiveTemplateOptions(): Promise<
  Pick<PackageTemplateRecord, "id" | "name" | "slug" | "template_type" | "included_steps" | "description">[]
> {
  const rows = await query<RowDataPacket[]>(
    `SELECT id, name, slug, template_type, included_steps, description
     FROM ${TABLE}
     WHERE status = 'active'
     ORDER BY display_order ASC, name ASC`
  );

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name as string,
    slug: row.slug as string,
    template_type: row.template_type,
    included_steps: parseJsonColumn<number[]>(row.included_steps) ?? [],
    description: row.description ?? null,
  }));
}
