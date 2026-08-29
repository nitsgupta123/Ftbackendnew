import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { getPackageCategorySummary, syncPackageCategories } from "./category-repository";
import { query, type QueryParam } from "./db";
import type {
  CreatePackageInput,
  PackageRecord,
  PackageStats,
  PackageStatus,
  UpdatePackageInput,
} from "./package-types";
import { normalizeSupplierFormValues, serializeSupplierFormValues } from "./validation";

function stringifySupplierSource(value: unknown): string {
  return JSON.stringify(
    serializeSupplierFormValues(
      normalizeSupplierFormValues(
        value as Parameters<typeof normalizeSupplierFormValues>[0]
      )
    )
  );
}

const LEGACY_DB = process.env.LEGACY_DB_NAME ?? "fz";
const TBL_PACKAGES = `${LEGACY_DB}.tbl_packages`;
const ADD_PACKAGE_TABLE = `${process.env.DB_NAME ?? "fz"}.add_package`;

const JSON_COLUMNS = [
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
  "review_publish",
] as const;

function formatTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value ?? "");
}

function legacyUserLabel(userId: unknown): string | null {
  const id = Number(userId);
  if (!id) return null;
  return `Legacy User #${id}`;
}

const ADD_PACKAGE_FROM = `
  FROM ${ADD_PACKAGE_TABLE} ap
  INNER JOIN ${TBL_PACKAGES} tp ON tp.id = ap.package_id
`;

const ADD_PACKAGE_SELECT = `
  SELECT
    ap.*,
    tp.p_name AS package_title,
    tp.p_slug AS slug
  ${ADD_PACKAGE_FROM}
`;

/** List views only need identity, status, and a few JSON blobs — not itinerary/hotels/etc. */
const ADD_PACKAGE_LIST_SELECT = `
  SELECT
    ap.id,
    ap.package_id,
    ap.status,
    ap.current_step,
    ap.supplier_source,
    ap.package_basics,
    ap.media_frontend,
    ap.review_publish,
    ap.created_by,
    ap.updated_by,
    ap.created_at,
    ap.updated_at,
    tp.p_name AS package_title,
    tp.p_slug AS slug
  ${ADD_PACKAGE_FROM}
`;

const TBL_PACKAGE_LIST_COLUMNS = `
  id, p_name, p_slug, country_id, day_night, feature_img, desti_image,
  desti_list, package_currency, insert_date, edit_date, user_id,
  is_publish, is_archive, status
`;

const VALIDITY_TO_EXPR = `STR_TO_DATE(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ap.supplier_source, '$.validityTo')), ''),
  '%Y-%m-%d'
)`;

const EXPIRING_RATES_WHERE = `
  ap.supplier_source IS NOT NULL
  AND ${VALIDITY_TO_EXPR} BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
`;

const NOT_PLACEHOLDER_PACKAGE_SQL = `
  TRIM(IFNULL(tp.p_name, '')) != ''
  AND TRIM(tp.p_name) != 'Draft Package'
  AND IFNULL(tp.p_slug, '') NOT REGEXP '^draft-[0-9]+$'
`;

function parsePackageRow(row: RowDataPacket): PackageRecord {
  const parsed = { ...row } as Record<string, unknown>;

  for (const column of JSON_COLUMNS) {
    const value = row[column];
    if (value === undefined) {
      parsed[column] = null;
      continue;
    }
    if (typeof value === "string") {
      try {
        parsed[column] = JSON.parse(value);
      } catch {
        parsed[column] = null;
      }
    }
  }

  const supplierSource = parsed.supplier_source as { supplierName?: string } | null;
  parsed.supplier_name = supplierSource?.supplierName ?? null;
  parsed.package_id = Number(row.package_id);
  parsed.source = "wizard";
  parsed.created_at = formatTimestamp(row.created_at);
  parsed.updated_at = formatTimestamp(row.updated_at);
  parsed.created_by = row.created_by ? String(row.created_by) : null;
  parsed.updated_by = row.updated_by ? String(row.updated_by) : null;

  return parsed as unknown as PackageRecord;
}

function mapTblPackageStatus(row: RowDataPacket): PackageStatus {
  if (Number(row.is_archive) === 1) return "archived";
  if (Number(row.is_publish) === 2) return "draft";
  if (Number(row.status) === 2) return "pending_review";
  return "published";
}

function mapTblPackageRow(row: RowDataPacket): PackageRecord {
  const featureImage = row.feature_img || row.desti_image || null;

  return {
    id: Number(row.id),
    package_id: Number(row.id),
    status: mapTblPackageStatus(row),
    current_step: 14,
    package_title: row.p_name ?? null,
    slug: row.p_slug ?? null,
    supplier_name: null,
    supplier_source: null,
    package_basics: {
      packageTitle: row.p_name ?? "",
      slug: row.p_slug ?? "",
      packageMode: "legacy",
      tourType: "legacy",
      runs: "legacy",
      countriesCovered: row.desti_list || row.country_id || undefined,
      citiesOrRegions: row.day_night ?? undefined,
      domesticFlightsIncluded: false,
      trainIncluded: false,
      transfersIncluded: false,
      isSeasonalPackage: false,
    },
    media_frontend:
      row.feature_img || row.desti_image
        ? {
            packageCardImage: row.feature_img || row.desti_image,
            desktopHeroImage: row.feature_img ?? undefined,
            mobileHeroImage: row.desti_image ?? undefined,
          }
        : null,
    pricing: row.package_currency ? { displayCurrency: row.package_currency } : null,
    itinerary: null,
    hotels: null,
    inclusions: null,
    booking_policy: null,
    consultant_view: null,
    supplier_quote_tool: null,
    frontend_faqs: null,
    sales_ads_assets: null,
    seo: {
      metaTitle: row.meta_title ?? undefined,
      metaDescription: row.meta_description ?? undefined,
      focusKeyword: row.meta_keywords ?? undefined,
    },
    review_publish: null,
    image_url: featureImage,
    created_by: legacyUserLabel(row.user_id),
    updated_by: legacyUserLabel(row.user_id),
    created_at:
      row.insert_date instanceof Date
        ? row.insert_date.toISOString()
        : String(row.insert_date ?? ""),
    updated_at:
      row.edit_date instanceof Date ? row.edit_date.toISOString() : String(row.edit_date ?? ""),
    source: "legacy",
  };
}

async function createTblPackageStub(
  title = "Draft Package",
  slug = `draft-${Date.now()}`
): Promise<number> {
  const now = new Date();

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${TBL_PACKAGES} (
      p_name, p_slug, country_id, p_content, day_night, feature_img, desti_image,
      desti_list, inclusions, exclusions, booking_range, disable_date,
      itinerary_pdf, highlights_video, price_markup, which_website,
      insert_date, edit_date, user_id, meta_title, meta_keywords, meta_description,
      is_publish, status
    ) VALUES (?, ?, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ?, ?, 0, '', '', '', 2, 1)`,
    [title, slug, now, now]
  );

  return result.insertId;
}

async function syncTblPackage(
  packageId: number,
  input: UpdatePackageInput
): Promise<void> {
  const fields: string[] = [];
  const values: QueryParam[] = [];

  const title = input.package_title ?? input.package_basics?.packageTitle;
  const slug = input.slug ?? input.package_basics?.slug;
  const metaTitle = input.seo?.metaTitle;
  const metaDescription = input.seo?.metaDescription;
  const metaKeywords = input.seo?.focusKeyword ?? input.seo?.secondaryKeywords;

  if (title !== undefined) {
    fields.push("p_name = ?");
    values.push(title ?? "");
  }

  if (slug !== undefined) {
    fields.push("p_slug = ?");
    values.push(slug ?? "");
  }

  if (metaTitle !== undefined) {
    fields.push("meta_title = ?");
    values.push(metaTitle ?? "");
  }

  if (metaDescription !== undefined) {
    fields.push("meta_description = ?");
    values.push(metaDescription ?? "");
  }

  if (metaKeywords !== undefined) {
    fields.push("meta_keywords = ?");
    values.push(metaKeywords ?? "");
  }

  if (!fields.length) return;

  fields.push("edit_date = ?");
  values.push(new Date());
  values.push(packageId);

  await query<ResultSetHeader>(
    `UPDATE ${TBL_PACKAGES} SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
}

export async function listTblPackages(): Promise<PackageRecord[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT ${TBL_PACKAGE_LIST_COLUMNS} FROM ${TBL_PACKAGES} ORDER BY edit_date DESC`
  );
  return rows.map(mapTblPackageRow);
}

export async function listPackages(status?: PackageStatus): Promise<PackageRecord[]> {
  const sql = status
    ? `${ADD_PACKAGE_LIST_SELECT} WHERE ap.status = ? ORDER BY ap.updated_at DESC`
    : `${ADD_PACKAGE_LIST_SELECT} WHERE ap.status != 'deleted' ORDER BY ap.updated_at DESC`;

  const rows = await query<RowDataPacket[]>(sql, status ? [status] : []);
  return rows.map(parsePackageRow);
}

export async function getPackageById(id: number): Promise<PackageRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `${ADD_PACKAGE_SELECT} WHERE ap.id = ? LIMIT 1`,
    [id]
  );

  if (!rows.length) return null;

  const record = parsePackageRow(rows[0]);
  const { ids: categoryIds, names: categoryNames } = await getPackageCategorySummary(id);
  if (record.package_basics) {
    record.package_basics = {
      ...record.package_basics,
      categoryIds,
      categories:
        categoryNames.length > 0
          ? categoryNames
          : record.package_basics.categories,
    };
  }

  return record;
}

async function getPackageUpdateTarget(
  id: number
): Promise<{ id: number; package_id: number; status: PackageStatus } | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT id, package_id, status FROM ${ADD_PACKAGE_TABLE} WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return {
    id: Number(rows[0].id),
    package_id: Number(rows[0].package_id),
    status: rows[0].status as PackageStatus,
  };
}

export async function createPackage(
  input: CreatePackageInput & UpdatePackageInput = {},
  audit?: PackageAuditContext
): Promise<PackageRecord> {
  const supplierSource = input.supplier_source
    ? stringifySupplierSource(input.supplier_source)
    : null;
  const currentStep = input.current_step ?? 1;
  const packageTitle = input.package_title ?? input.package_basics?.packageTitle ?? "Draft Package";
  const slug = input.slug ?? input.package_basics?.slug ?? `draft-${Date.now()}`;
  const packageBasics = input.package_basics
    ? JSON.stringify(input.package_basics)
    : null;

  let tblPackageId = input.package_id;
  if (!tblPackageId) {
    tblPackageId = await createTblPackageStub(packageTitle, slug);
  }

  const auditUser = audit?.user ?? null;

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${ADD_PACKAGE_TABLE} (
      package_id, supplier_source, package_basics, current_step, status, created_by, updated_by
    ) VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
    [tblPackageId, supplierSource, packageBasics, currentStep, auditUser, auditUser]
  );

  const created = await getPackageById(result.insertId);
  if (!created) {
    throw new Error("Failed to load package after create");
  }

  const remaining: CreatePackageInput & UpdatePackageInput = { ...input };
  delete remaining.package_id;
  delete remaining.supplier_source;
  delete remaining.package_basics;
  delete remaining.package_title;
  delete remaining.slug;
  delete remaining.current_step;

  if (Object.keys(remaining).length > 0) {
    return (await updatePackage(created.id, remaining, audit)) ?? created;
  }

  if (input.package_basics && "categoryIds" in input.package_basics) {
    const categoryIds = Array.isArray(input.package_basics.categoryIds)
      ? input.package_basics.categoryIds
      : [];
    await syncPackageCategories(created.id, categoryIds);
  }

  return created;
}

export async function updatePackage(
  id: number,
  input: UpdatePackageInput,
  audit?: PackageAuditContext
): Promise<PackageRecord | null> {
  const existing = await getPackageUpdateTarget(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: QueryParam[] = [];

  const scalarFields: (keyof UpdatePackageInput)[] = ["status", "current_step"];

  for (const field of scalarFields) {
    if (field in input) {
      fields.push(`${field} = ?`);
      const scalarValue = input[field];
      values.push(
        scalarValue === undefined || scalarValue === null
          ? null
          : (scalarValue as QueryParam)
      );
    }
  }

  for (const column of JSON_COLUMNS) {
    if (column in input) {
      fields.push(`${column} = ?`);
      const value = input[column];
      if (value === null || value === undefined) {
        values.push(null);
      } else if (column === "supplier_source") {
        values.push(stringifySupplierSource(value));
      } else {
        values.push(JSON.stringify(value));
      }
    }
  }

  if (fields.length) {
    if (audit?.user) {
      fields.push("updated_by = ?");
      values.push(audit.user);
    }

    values.push(id);
    await query<ResultSetHeader>(
      `UPDATE ${ADD_PACKAGE_TABLE} SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  } else if (audit?.user) {
    await query<ResultSetHeader>(
      `UPDATE ${ADD_PACKAGE_TABLE} SET updated_by = ? WHERE id = ?`,
      [audit.user, id]
    );
  }

  if (input.status === "archived" && existing.package_id) {
    await query<ResultSetHeader>(
      `UPDATE ${TBL_PACKAGES} SET is_archive = 1, edit_date = ? WHERE id = ?`,
      [new Date(), existing.package_id]
    );
  }

  await syncTblPackage(existing.package_id, input);

  if (input.package_basics && "categoryIds" in input.package_basics) {
    const categoryIds = Array.isArray(input.package_basics.categoryIds)
      ? input.package_basics.categoryIds
      : [];
    await syncPackageCategories(id, categoryIds);
  }

  return getPackageById(id);
}

export async function getLegacyPackageById(id: number): Promise<PackageRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TBL_PACKAGES} WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return mapTblPackageRow(rows[0]);
}

export async function deletePackage(
  id: number,
  audit?: PackageAuditContext
): Promise<boolean> {
  const existing = await getPackageUpdateTarget(id);
  if (!existing) return false;

  const result = audit?.user
    ? await query<ResultSetHeader>(
        `UPDATE ${ADD_PACKAGE_TABLE} SET status = 'deleted', updated_by = ? WHERE id = ?`,
        [audit.user, id]
      )
    : await query<ResultSetHeader>(
        `UPDATE ${ADD_PACKAGE_TABLE} SET status = 'deleted' WHERE id = ?`,
        [id]
      );

  return result.affectedRows > 0;
}

export async function deleteLegacyPackage(tblPackageId: number): Promise<boolean> {
  await query<ResultSetHeader>(`DELETE FROM ${ADD_PACKAGE_TABLE} WHERE package_id = ?`, [
    tblPackageId,
  ]);

  const result = await query<ResultSetHeader>(`DELETE FROM ${TBL_PACKAGES} WHERE id = ?`, [
    tblPackageId,
  ]);

  return result.affectedRows > 0;
}

export async function archiveLegacyPackage(
  tblPackageId: number,
  audit?: PackageAuditContext
): Promise<PackageRecord | null> {
  const result = await query<ResultSetHeader>(
    `UPDATE ${TBL_PACKAGES} SET is_archive = 1, edit_date = ? WHERE id = ?`,
    [new Date(), tblPackageId]
  );

  if (!result.affectedRows) return null;

  const wizardRows = await query<RowDataPacket[]>(
    `SELECT id FROM ${ADD_PACKAGE_TABLE} WHERE package_id = ? LIMIT 1`,
    [tblPackageId]
  );
  if (wizardRows.length && audit?.user) {
    await query<ResultSetHeader>(
      `UPDATE ${ADD_PACKAGE_TABLE} SET status = 'archived', updated_by = ? WHERE package_id = ?`,
      [audit.user, tblPackageId]
    );
  }

  return getLegacyPackageById(tblPackageId);
}

function getPublishedAtTime(pkg: PackageRecord): number {
  const value = pkg.review_publish?.publishedAt || pkg.updated_at || pkg.created_at;
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isPlaceholderPublishedPackage(pkg: PackageRecord): boolean {
  const title = (pkg.package_title ?? "").trim();
  const slug = (pkg.slug ?? "").trim();
  if (!title || title === "Draft Package") return true;
  if (/^draft-\d+$/i.test(slug)) return true;
  return false;
}

export async function listRecentlyPublishedPackages(limit = 5): Promise<PackageRecord[]> {
  const fetchLimit = Math.max(limit * 6, 30);
  const [wizardRows, legacyRows] = await Promise.all([
    query<RowDataPacket[]>(
      `
      ${ADD_PACKAGE_LIST_SELECT}
      WHERE ap.status = 'published'
        AND ${NOT_PLACEHOLDER_PACKAGE_SQL}
      ORDER BY ap.updated_at DESC
      LIMIT ?
    `,
      [fetchLimit]
    ),
    query<RowDataPacket[]>(
      `
      SELECT ${TBL_PACKAGE_LIST_COLUMNS} FROM ${TBL_PACKAGES} tp
      WHERE IFNULL(tp.is_archive, 0) = 0
        AND IFNULL(tp.is_publish, 0) != 2
        AND IFNULL(tp.status, 0) != 2
        AND ${NOT_PLACEHOLDER_PACKAGE_SQL}
      ORDER BY edit_date DESC
      LIMIT ?
    `,
      [fetchLimit]
    ),
  ]);

  const wizardPublished = wizardRows
    .map(parsePackageRow)
    .filter((pkg) => !isPlaceholderPublishedPackage(pkg));
  const wizardPublishedIds = new Set(wizardPublished.map((pkg) => pkg.package_id));

  const legacyPublished = legacyRows
    .map(mapTblPackageRow)
    .filter(
      (pkg) =>
        pkg.status === "published" &&
        !wizardPublishedIds.has(pkg.package_id) &&
        !isPlaceholderPublishedPackage(pkg)
    );

  return [...wizardPublished, ...legacyPublished]
    .sort((a, b) => getPublishedAtTime(b) - getPublishedAtTime(a))
    .slice(0, limit);
}

export async function listAllPackages(): Promise<PackageRecord[]> {
  const [wizardPackages, legacyPackages] = await Promise.all([
    query<RowDataPacket[]>(`${ADD_PACKAGE_LIST_SELECT} ORDER BY ap.updated_at DESC`).then(
      (rows) => rows.map(parsePackageRow)
    ),
    listTblPackages(),
  ]);

  const linkedLegacyIds = new Set(wizardPackages.map((pkg) => pkg.package_id));
  const legacyOnly = legacyPackages.filter((pkg) => !linkedLegacyIds.has(pkg.package_id));

  return [...wizardPackages, ...legacyOnly].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function getPackageStats(): Promise<PackageStats> {
  const [wizardStatusRows, legacyStatusRows, expiringRows, quoteRows] = await Promise.all([
    query<RowDataPacket[]>(`
      SELECT status, COUNT(*) AS cnt
      FROM ${ADD_PACKAGE_TABLE}
      WHERE status != 'deleted'
      GROUP BY status
    `),
    query<RowDataPacket[]>(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN IFNULL(tp.is_archive, 0) = 1 THEN 1 ELSE 0 END) AS archived,
        SUM(CASE
          WHEN IFNULL(tp.is_archive, 0) = 0 AND IFNULL(tp.is_publish, 0) = 2 THEN 1
          ELSE 0 END) AS draft,
        SUM(CASE
          WHEN IFNULL(tp.is_archive, 0) = 0
           AND IFNULL(tp.is_publish, 0) != 2
           AND IFNULL(tp.status, 0) = 2 THEN 1
          ELSE 0 END) AS pending_review,
        SUM(CASE
          WHEN IFNULL(tp.is_archive, 0) = 0
           AND IFNULL(tp.is_publish, 0) != 2
           AND IFNULL(tp.status, 0) != 2 THEN 1
          ELSE 0 END) AS published
      FROM ${TBL_PACKAGES} tp
      LEFT JOIN ${ADD_PACKAGE_TABLE} ap ON ap.package_id = tp.id
      WHERE ap.id IS NULL
    `),
    query<RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt
      FROM ${ADD_PACKAGE_TABLE} ap
      WHERE ${EXPIRING_RATES_WHERE}
    `),
    query<RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt
      FROM ${ADD_PACKAGE_TABLE}
      WHERE supplier_quote_tool IS NOT NULL
        AND JSON_LENGTH(supplier_quote_tool) > 0
    `),
  ]);

  const wizard: Record<PackageStatus, number> = {
    draft: 0,
    pending_review: 0,
    published: 0,
    archived: 0,
    deleted: 0,
  };
  for (const row of wizardStatusRows) {
    const status = row.status as PackageStatus;
    if (status in wizard) {
      wizard[status] = Number(row.cnt ?? 0);
    }
  }

  const legacy = legacyStatusRows[0];
  const legacyDraft = Number(legacy?.draft ?? 0);
  const legacyPending = Number(legacy?.pending_review ?? 0);
  const legacyPublished = Number(legacy?.published ?? 0);
  const legacyArchived = Number(legacy?.archived ?? 0);
  const wizardTotal =
    wizard.draft + wizard.pending_review + wizard.published + wizard.archived;
  const legacyTotal = Number(legacy?.total ?? 0);

  return {
    total: wizardTotal + legacyTotal,
    draft: wizard.draft + legacyDraft,
    pending_review: wizard.pending_review + legacyPending,
    published: wizard.published + legacyPublished,
    archived: wizard.archived + legacyArchived,
    expiring_rates: Number(expiringRows[0]?.cnt ?? 0),
    supplier_quotes: Number(quoteRows[0]?.cnt ?? 0),
    legacy_total: legacyTotal,
    wizard_total: wizardTotal,
  };
}

export async function listExpiringPackages(): Promise<PackageRecord[]> {
  const rows = await query<RowDataPacket[]>(`
    ${ADD_PACKAGE_LIST_SELECT}
    WHERE ${EXPIRING_RATES_WHERE}
    ORDER BY ap.updated_at DESC
  `);

  return rows.map(parsePackageRow);
}

export async function listSupplierQuoteRequests(): Promise<PackageRecord[]> {
  const rows = await query<RowDataPacket[]>(`
    ${ADD_PACKAGE_LIST_SELECT}
    WHERE ap.supplier_quote_tool IS NOT NULL
      AND JSON_LENGTH(ap.supplier_quote_tool) > 0
    ORDER BY ap.updated_at DESC
  `);

  return rows.map(parsePackageRow);
}
