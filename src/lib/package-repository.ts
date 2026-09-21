import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query, sqlLimit, type QueryParam } from "./db";
import { nowMysqlDateTimeSgt, toIsoSgt, toIsoSgtOrNow } from "./format-date";
import { LEGACY_TABLES } from "./legacy-tables";
import type {
  CreatePackageInput,
  PackageRecord,
  PackageStats,
  PackageStatus,
  UpdatePackageInput,
} from "./package-types";

const TBL_PACKAGES = LEGACY_TABLES.packages;
const TBL_CITIES = LEGACY_TABLES.cities;

const TBL_PACKAGE_LIST_COLUMNS = `
  id, p_name, p_slug, country_id, day_night, feature_img, desti_image,
  desti_list, package_currency, insert_date, edit_date, user_id,
  is_publish, is_archive, status, inclusions, exclusions, p_content,
  meta_title, meta_keywords, meta_description
`;

function formatTimestamp(value: unknown): string {
  return toIsoSgt(value instanceof Date || typeof value === "string" ? value : String(value ?? "")) ?? toIsoSgtOrNow();
}

function legacyUserLabel(userId: unknown): string | null {
  const id = Number(userId);
  if (!id) return null;
  return `User #${id}`;
}

function parseCityIds(destiList: unknown): number[] {
  if (destiList == null || destiList === "") return [];
  return String(destiList)
    .split(",")
    .map((part) => {
      const match = part.trim().match(/^(?:city_)?(\d+)$/i);
      return match ? Number(match[1]) : NaN;
    })
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function loadCityNameMap(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const placeholders = unique.map(() => "?").join(",");
  const rows = await query<RowDataPacket[]>(
    `SELECT id, city_name FROM ${TBL_CITIES} WHERE id IN (${placeholders})`,
    unique
  );
  return new Map(rows.map((row) => [Number(row.id), String(row.city_name ?? "").trim()]));
}

function formatCityNames(
  destiList: unknown,
  cityNames: Map<number, string>
): string | undefined {
  const ids = parseCityIds(destiList);
  if (!ids.length) return undefined;
  const labels = ids
    .map((id) => cityNames.get(id) || `city_${id}`)
    .filter(Boolean);
  return labels.length ? labels.join(", ") : undefined;
}

function mapTblPackageStatus(row: RowDataPacket): PackageStatus {
  if (Number(row.is_archive) === 1) return "archived";
  if (Number(row.is_publish) === 2) return "draft";
  if (Number(row.status) === 2) return "pending_review";
  if (Number(row.status) === 0) return "deleted";
  return "published";
}

function statusToLegacyFlags(status: PackageStatus): {
  is_archive: number;
  is_publish: number;
  status: number;
} {
  if (status === "archived") return { is_archive: 1, is_publish: 1, status: 1 };
  if (status === "draft") return { is_archive: 0, is_publish: 2, status: 1 };
  if (status === "pending_review") return { is_archive: 0, is_publish: 1, status: 2 };
  if (status === "deleted") return { is_archive: 1, is_publish: 2, status: 0 };
  return { is_archive: 0, is_publish: 1, status: 1 };
}

function mapTblPackageRow(
  row: RowDataPacket,
  cityNames: Map<number, string> = new Map()
): PackageRecord {
  const featureImage = row.feature_img || row.desti_image || null;
  const inclusionsText = row.inclusions ? String(row.inclusions) : "";
  const exclusionsText = row.exclusions ? String(row.exclusions) : "";
  const cityLabel = formatCityNames(row.desti_list, cityNames);

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
      countriesCovered: row.country_id ? String(row.country_id) : undefined,
      citiesOrRegions: cityLabel ?? undefined,
      domesticFlightsIncluded: false,
      trainIncluded: false,
      transfersIncluded: false,
      isSeasonalPackage: false,
      frontendNotes: row.p_content ? String(row.p_content).slice(0, 500) : undefined,
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
    inclusions: inclusionsText
      ? {
          included: inclusionsText
            .split(/\r?\n|•|;/)
            .map((s) => s.trim())
            .filter(Boolean),
          excluded: exclusionsText
            .split(/\r?\n|•|;/)
            .map((s) => s.trim())
            .filter(Boolean),
        }
      : null,
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
    created_at: formatTimestamp(row.insert_date),
    updated_at: formatTimestamp(row.edit_date ?? row.insert_date),
    source: "legacy",
  };
}

async function mapTblPackageRows(rows: RowDataPacket[]): Promise<PackageRecord[]> {
  const cityNames = await loadCityNameMap(rows.flatMap((row) => parseCityIds(row.desti_list)));
  return rows.map((row) => mapTblPackageRow(row, cityNames));
}

function statusWhere(status?: PackageStatus): { sql: string; params: QueryParam[] } {
  if (!status) {
    return { sql: "IFNULL(status, 0) != 0", params: [] };
  }
  if (status === "archived") {
    return { sql: "IFNULL(is_archive, 0) = 1", params: [] };
  }
  if (status === "draft") {
    return { sql: "IFNULL(is_archive, 0) = 0 AND IFNULL(is_publish, 0) = 2", params: [] };
  }
  if (status === "pending_review") {
    return {
      sql: "IFNULL(is_archive, 0) = 0 AND IFNULL(is_publish, 0) != 2 AND IFNULL(status, 0) = 2",
      params: [],
    };
  }
  if (status === "deleted") {
    return { sql: "IFNULL(status, 0) = 0", params: [] };
  }
  return {
    sql: "IFNULL(is_archive, 0) = 0 AND IFNULL(is_publish, 0) != 2 AND IFNULL(status, 0) = 1",
    params: [],
  };
}

export async function listTblPackages(): Promise<PackageRecord[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT ${TBL_PACKAGE_LIST_COLUMNS} FROM ${TBL_PACKAGES} ORDER BY edit_date DESC`
  );
  return mapTblPackageRows(rows);
}

export async function listPackages(status?: PackageStatus): Promise<PackageRecord[]> {
  const filter = statusWhere(status);
  const rows = await query<RowDataPacket[]>(
    `SELECT ${TBL_PACKAGE_LIST_COLUMNS}
     FROM ${TBL_PACKAGES}
     WHERE ${filter.sql}
     ORDER BY edit_date DESC`,
    filter.params
  );
  return mapTblPackageRows(rows);
}

export async function getPackageById(id: number): Promise<PackageRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TBL_PACKAGES} WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  const [pkg] = await mapTblPackageRows(rows);
  return pkg ?? null;
}

export async function getLegacyPackageById(id: number): Promise<PackageRecord | null> {
  return getPackageById(id);
}

export async function createPackage(
  input: CreatePackageInput & UpdatePackageInput = {},
  _audit?: PackageAuditContext
): Promise<PackageRecord> {
  const title =
    input.package_title ?? input.package_basics?.packageTitle ?? "Draft Package";
  const slug =
    input.slug ?? input.package_basics?.slug ?? `draft-${Date.now()}`;
  const now = nowMysqlDateTimeSgt();
  const flags = statusToLegacyFlags(input.status ?? "draft");

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${TBL_PACKAGES} (
      p_name, p_slug, country_id, p_content, day_night, feature_img, desti_image,
      desti_list, inclusions, exclusions, booking_range, disable_date,
      itinerary_pdf, highlights_video, price_markup, which_website, package_currency,
      insert_date, edit_date, user_id, meta_title, meta_keywords, meta_description,
      is_publish, is_archive, status
    ) VALUES (?, ?, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ?, ?, 0, '', '', '', ?, ?, ?)`,
    [title, slug, now, now, flags.is_publish, flags.is_archive, flags.status]
  );

  const created = await getPackageById(result.insertId);
  if (!created) throw new Error("Failed to create package");
  return created;
}

export async function updatePackage(
  id: number,
  input: UpdatePackageInput,
  _audit?: PackageAuditContext
): Promise<PackageRecord | null> {
  const existing = await getPackageById(id);
  if (!existing) return null;

  const sets: string[] = [];
  const values: QueryParam[] = [];

  const title = input.package_title ?? input.package_basics?.packageTitle;
  if (title !== undefined) {
    sets.push("p_name = ?");
    values.push(title);
  }

  const slug = input.slug ?? input.package_basics?.slug;
  if (slug !== undefined) {
    sets.push("p_slug = ?");
    values.push(slug);
  }

  if (input.package_basics?.countriesCovered !== undefined) {
    sets.push("desti_list = ?");
    values.push(String(input.package_basics.countriesCovered ?? ""));
  }
  if (input.package_basics?.citiesOrRegions !== undefined) {
    sets.push("day_night = ?");
    values.push(String(input.package_basics.citiesOrRegions ?? ""));
  }

  if (input.media_frontend) {
    const media = input.media_frontend;
    if (media.desktopHeroImage !== undefined || media.packageCardImage !== undefined) {
      sets.push("feature_img = ?");
      values.push(media.desktopHeroImage || media.packageCardImage || "");
    }
    if (media.mobileHeroImage !== undefined) {
      sets.push("desti_image = ?");
      values.push(media.mobileHeroImage || "");
    }
  }

  if (input.inclusions) {
    const included = (input.inclusions.included ?? [])
      .map((item) => String(item).trim())
      .filter(Boolean);
    const excluded = (input.inclusions.excluded ?? [])
      .map((item) => String(item).trim())
      .filter(Boolean);
    sets.push("inclusions = ?", "exclusions = ?");
    values.push(included.join("\n"), excluded.join("\n"));
  }

  if (input.seo) {
    if (input.seo.metaTitle !== undefined) {
      sets.push("meta_title = ?");
      values.push(input.seo.metaTitle || "");
    }
    if (input.seo.metaDescription !== undefined) {
      sets.push("meta_description = ?");
      values.push(input.seo.metaDescription || "");
    }
    if (input.seo.focusKeyword !== undefined) {
      sets.push("meta_keywords = ?");
      values.push(input.seo.focusKeyword || "");
    }
  }

  if (input.pricing?.displayCurrency) {
    sets.push("package_currency = ?");
    values.push(input.pricing.displayCurrency);
  }

  if (input.status) {
    const flags = statusToLegacyFlags(input.status);
    sets.push("is_publish = ?", "is_archive = ?", "status = ?");
    values.push(flags.is_publish, flags.is_archive, flags.status);
  }

  sets.push("edit_date = ?");
  values.push(nowMysqlDateTimeSgt());
  values.push(id);

  if (sets.length > 1) {
    await query(
      `UPDATE ${TBL_PACKAGES} SET ${sets.join(", ")} WHERE id = ?`,
      values
    );
  }

  return getPackageById(id);
}

export async function deletePackage(
  id: number,
  _audit?: PackageAuditContext
): Promise<boolean> {
  const flags = statusToLegacyFlags("deleted");
  const result = await query<ResultSetHeader>(
    `UPDATE ${TBL_PACKAGES}
     SET is_archive = ?, is_publish = ?, status = ?, edit_date = ?
     WHERE id = ?`,
    [flags.is_archive, flags.is_publish, flags.status, nowMysqlDateTimeSgt(), id]
  );
  return result.affectedRows > 0;
}

export async function deleteLegacyPackage(tblPackageId: number): Promise<boolean> {
  return deletePackage(tblPackageId);
}

export async function archiveLegacyPackage(
  tblPackageId: number,
  _audit?: PackageAuditContext
): Promise<PackageRecord | null> {
  return updatePackage(tblPackageId, { status: "archived" });
}

export async function listRecentlyPublishedPackages(limit = 5): Promise<PackageRecord[]> {
  const safe = sqlLimit(limit, 50);
  const rows = await query<RowDataPacket[]>(
    `SELECT ${TBL_PACKAGE_LIST_COLUMNS}
     FROM ${TBL_PACKAGES}
     WHERE IFNULL(is_archive, 0) = 0
       AND IFNULL(is_publish, 0) != 2
       AND IFNULL(status, 0) = 1
     ORDER BY edit_date DESC
     LIMIT ${safe}`
  );
  return mapTblPackageRows(rows);
}

export async function listAllPackages(): Promise<PackageRecord[]> {
  return listTblPackages();
}

export async function getPackageStats(): Promise<PackageStats> {
  const rows = await query<RowDataPacket[]>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN IFNULL(is_archive, 0) = 1 THEN 1 ELSE 0 END) AS archived,
      SUM(CASE
        WHEN IFNULL(is_archive, 0) = 0 AND IFNULL(is_publish, 0) = 2 THEN 1
        ELSE 0 END) AS draft,
      SUM(CASE
        WHEN IFNULL(is_archive, 0) = 0
         AND IFNULL(is_publish, 0) != 2
         AND IFNULL(status, 0) = 2 THEN 1
        ELSE 0 END) AS pending_review,
      SUM(CASE
        WHEN IFNULL(is_archive, 0) = 0
         AND IFNULL(is_publish, 0) != 2
         AND IFNULL(status, 0) = 1 THEN 1
        ELSE 0 END) AS published
    FROM ${TBL_PACKAGES}
    WHERE IFNULL(status, 0) != 0 OR IFNULL(is_archive, 0) = 1
  `);

  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    draft: Number(row.draft ?? 0),
    pending_review: Number(row.pending_review ?? 0),
    published: Number(row.published ?? 0),
    archived: Number(row.archived ?? 0),
    expiring_rates: 0,
    supplier_quotes: 0,
  };
}

export async function listExpiringPackages(): Promise<PackageRecord[]> {
  return [];
}

export async function listSupplierQuoteRequests(): Promise<PackageRecord[]> {
  return [];
}
