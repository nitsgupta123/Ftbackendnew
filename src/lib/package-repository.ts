import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query, sqlLimit, type QueryParam } from "./db";
import { nowMysqlDateTimeSgt, toIsoSgt, toIsoSgtOrNow } from "./format-date";
import { LEGACY_TABLES, SETTINGS_BLOB } from "./legacy-tables";
import { syncPackageCategories } from "./category-repository";
import {
  loadSectionForAllPackages,
  loadWizardSections,
  saveWizardSections,
} from "./package-wizard-store";
import { listJsonSettingsBySuffix, setJsonSetting } from "./legacy-settings-store";
import { isRateExpiringSoon, latestRateDate } from "./package-rate-validity";
import { loadUserNameMap, userLabel } from "./user-names";
import type {
  CreatePackageInput,
  PackageRecord,
  PackageStats,
  PackageStatus,
  PricingData,
  UpdatePackageInput,
} from "./package-types";

const TBL_PACKAGES = LEGACY_TABLES.packages;
const TBL_CITIES = LEGACY_TABLES.cities;
const TBL_DESTINATIONS = LEGACY_TABLES.destinations;

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

function parseIdList(value: unknown): number[] {
  return String(value ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function loadDestinationNameMap(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const rows = await query<RowDataPacket[]>(
    `SELECT id, d_name FROM ${TBL_DESTINATIONS} WHERE id IN (${unique.map(() => "?").join(",")})`,
    unique
  );
  return new Map(rows.map((row) => [Number(row.id), String(row.d_name ?? "").trim()]));
}

function splitNames(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,;\n]/)
        .map((part) => part.trim())
        .filter(Boolean)
    ),
  ];
}

/** Map destination names (e.g. "Japan, Korea") to tbl_destinations ids; unknown names are skipped. */
async function resolveDestinationIds(text: string): Promise<number[]> {
  const names = splitNames(text);
  if (!names.length) return [];
  const rows = await query<RowDataPacket[]>(
    `SELECT id, d_name FROM ${TBL_DESTINATIONS}
     WHERE LOWER(TRIM(d_name)) IN (${names.map(() => "?").join(",")})`,
    names.map((name) => name.toLowerCase())
  );
  const byName = new Map(rows.map((row) => [String(row.d_name).trim().toLowerCase(), Number(row.id)]));
  return names.map((name) => byName.get(name.toLowerCase())).filter((id): id is number => Boolean(id));
}

/** Map city names to tbl_citys ids, preferring cities inside the given destinations. */
async function resolveCityIds(text: string, destinationIds: number[]): Promise<number[]> {
  const names = splitNames(text);
  if (!names.length) return [];
  const rows = await query<RowDataPacket[]>(
    `SELECT id, city_name, country_code FROM ${TBL_CITIES}
     WHERE LOWER(TRIM(city_name)) IN (${names.map(() => "?").join(",")})
     ORDER BY id ASC`,
    names.map((name) => name.toLowerCase())
  );
  const preferred = new Set(destinationIds);
  const byName = new Map<string, number>();
  const ranked = [...rows].sort(
    (a, b) => Number(preferred.has(Number(b.country_code))) - Number(preferred.has(Number(a.country_code)))
  );
  for (const row of ranked) {
    const key = String(row.city_name).trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, Number(row.id));
  }
  return names.map((name) => byName.get(name.toLowerCase())).filter((id): id is number => Boolean(id));
}

function parseDayNight(value: unknown): { days?: string; nights?: string } {
  const match = String(value ?? "").match(/(\d+)\s*D\D+(\d+)\s*N/i);
  return match ? { days: match[1], nights: match[2] } : {};
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
  if (Number(row.status ?? 0) === 0) return "deleted";
  if (Number(row.is_archive) === 1) return "archived";
  if (Number(row.is_publish) === 2) return "draft";
  if (Number(row.status) === 2) return "pending_review";
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
  cityNames: Map<number, string> = new Map(),
  destinationNames: Map<number, string> = new Map()
): PackageRecord {
  const featureImage = row.feature_img || row.desti_image || null;
  const inclusionsText = row.inclusions ? String(row.inclusions) : "";
  const exclusionsText = row.exclusions ? String(row.exclusions) : "";
  const cityLabel = formatCityNames(row.desti_list, cityNames);
  const countryLabel = parseIdList(row.country_id)
    .map((id) => destinationNames.get(id))
    .filter(Boolean)
    .join(", ");
  const { days, nights } = parseDayNight(row.day_night);

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
      packageMode: "",
      tourType: "",
      runs: "",
      countriesCovered: countryLabel || undefined,
      citiesOrRegions: cityLabel ?? undefined,
      days,
      nights,
      domesticFlightsIncluded: false,
      trainIncluded: false,
      transfersIncluded: false,
      isSeasonalPackage: false,
      frontendNotes: row.p_content ? String(row.p_content) : undefined,
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

type PackageAuditMeta = { updated_by?: string | null };

async function mapTblPackageRows(rows: RowDataPacket[]): Promise<PackageRecord[]> {
  const [cityNames, destinationNames, userNames, steps, suppliers, pricing, audits] = await Promise.all([
    loadCityNameMap(rows.flatMap((row) => parseCityIds(row.desti_list))),
    loadDestinationNameMap(rows.flatMap((row) => parseIdList(row.country_id))),
    loadUserNameMap(rows.map((row) => row.user_id)),
    loadSectionForAllPackages("current_step"),
    loadSectionForAllPackages("supplier_source"),
    loadSectionForAllPackages("pricing"),
    loadPackageAuditMap(),
  ]);
  return rows.map((row) => {
    const pkg = mapTblPackageRow(row, cityNames, destinationNames);
    const createdBy = userLabel(row.user_id, userNames);
    const supplier = (suppliers.get(pkg.id) ?? null) as PackageRecord["supplier_source"];
    const step = Number(steps.get(pkg.id));
    const hasWizardData = steps.has(pkg.id) || suppliers.has(pkg.id) || pricing.has(pkg.id);
    return {
      ...pkg,
      current_step: Number.isInteger(step) && step > 0 ? step : pkg.current_step,
      supplier_source: supplier,
      supplier_name: supplier?.supplierName?.trim() || null,
      rate_valid_to: latestRateDate(pricing.get(pkg.id) as PricingData | undefined),
      created_by: createdBy,
      updated_by: audits.get(pkg.id)?.updated_by || createdBy,
      source: hasWizardData ? "wizard" : "legacy",
    };
  });
}

async function loadPackageAuditMap(): Promise<Map<number, PackageAuditMeta>> {
  const rows = await listJsonSettingsBySuffix(SETTINGS_BLOB.packageWizard, ":audit");
  const result = new Map<number, PackageAuditMeta>();
  for (const [name, value] of rows) {
    const id = Number(name.slice(0, -":audit".length));
    if (Number.isInteger(id) && id > 0 && value && typeof value === "object") {
      result.set(id, value as PackageAuditMeta);
    }
  }
  return result;
}

async function recordPackageEditor(packageId: number, audit?: PackageAuditContext): Promise<void> {
  if (!audit?.user) return;
  await setJsonSetting(SETTINGS_BLOB.packageWizard, `${packageId}:audit`, {
    updated_by: audit.user.slice(0, 255),
  } satisfies PackageAuditMeta);
}

function statusWhere(status?: PackageStatus): { sql: string; params: QueryParam[] } {
  if (!status) {
    return { sql: "IFNULL(status, 0) != 0", params: [] };
  }
  if (status === "archived") {
    return { sql: "IFNULL(status, 0) != 0 AND IFNULL(is_archive, 0) = 1", params: [] };
  }
  if (status === "draft") {
    return {
      sql: "IFNULL(status, 0) != 0 AND IFNULL(is_archive, 0) = 0 AND IFNULL(is_publish, 0) = 2",
      params: [],
    };
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
  if (!pkg) return null;
  return withStoredSections(pkg, await loadWizardSections(id));
}

function withStoredSections(
  pkg: PackageRecord,
  stored: Awaited<ReturnType<typeof loadWizardSections>>
): PackageRecord {
  const merged = { ...pkg, ...stored } as PackageRecord;
  merged.supplier_name = merged.supplier_source?.supplierName?.trim() || pkg.supplier_name;
  return merged;
}

async function persistWizardInput(
  packageId: number,
  input: CreatePackageInput | UpdatePackageInput
): Promise<void> {
  await saveWizardSections(packageId, input);
  const categoryIds = "package_basics" in input ? input.package_basics?.categoryIds : undefined;
  if (categoryIds !== undefined) {
    await syncPackageCategories(packageId, categoryIds ?? []);
  }
}

export async function getLegacyPackageById(id: number): Promise<PackageRecord | null> {
  return getPackageById(id);
}

export async function createPackage(
  input: CreatePackageInput & UpdatePackageInput = {},
  audit?: PackageAuditContext
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
    ) VALUES (?, ?, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ?, ?, ?, '', '', '', ?, ?, ?)`,
    [
      String(title).slice(0, 255),
      String(slug).slice(0, 255),
      now,
      now,
      audit?.userId ?? 0,
      flags.is_publish,
      flags.is_archive,
      flags.status,
    ]
  );

  const { status: _status, ...columnInput } = input;
  await writeLegacyColumns(result.insertId, columnInput);
  await persistWizardInput(result.insertId, input);
  await recordPackageEditor(result.insertId, audit);
  const created = await getPackageById(result.insertId);
  if (!created) throw new Error("Failed to create package");
  return created;
}

export async function updatePackage(
  id: number,
  input: UpdatePackageInput,
  audit?: PackageAuditContext
): Promise<PackageRecord | null> {
  const existing = await getPackageById(id);
  if (!existing) return null;

  await writeLegacyColumns(id, input);
  await persistWizardInput(id, input);
  await recordPackageEditor(id, audit);
  return getPackageById(id);
}

/** Mirror wizard fields into the tbl_packages columns the public site reads. */
async function writeLegacyColumns(id: number, input: UpdatePackageInput): Promise<void> {
  const sets: string[] = [];
  const values: QueryParam[] = [];

  const title = input.package_title ?? input.package_basics?.packageTitle;
  if (title !== undefined) {
    sets.push("p_name = ?");
    values.push(String(title ?? "").slice(0, 255));
  }

  const slug = input.slug ?? input.package_basics?.slug;
  if (slug !== undefined) {
    sets.push("p_slug = ?");
    values.push(String(slug ?? "").slice(0, 255));
  }

  const basics = input.package_basics;
  let destinationIds: number[] = [];
  if (basics?.countriesCovered !== undefined) {
    destinationIds = await resolveDestinationIds(String(basics.countriesCovered ?? ""));
    if (destinationIds.length || !String(basics.countriesCovered ?? "").trim()) {
      sets.push("country_id = ?");
      values.push(destinationIds.join(","));
    }
  }
  if (basics?.citiesOrRegions !== undefined) {
    const cityIds = await resolveCityIds(String(basics.citiesOrRegions ?? ""), destinationIds);
    const list = cityIds.map((cityId) => `city_${cityId}`).join(",");
    if ((cityIds.length || !String(basics.citiesOrRegions ?? "").trim()) && list.length <= 255) {
      sets.push("desti_list = ?");
      values.push(list);
    }
  }
  if (basics && (basics.days !== undefined || basics.nights !== undefined)) {
    const days = String(basics.days ?? "").trim();
    const nights = String(basics.nights ?? "").trim();
    sets.push("day_night = ?");
    values.push(days || nights ? `${days || 0}D | ${nights || 0}N` : "");
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
      values.push((input.seo.metaTitle || "").slice(0, 100));
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
  audit?: PackageAuditContext
): Promise<PackageRecord | null> {
  return updatePackage(tblPackageId, { status: "archived" }, audit);
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
    WHERE IFNULL(status, 0) != 0
  `);

  const row = rows[0] ?? {};
  const [expiringRates, supplierQuotes] = await Promise.all([
    expiringPackageIds().then(countVisiblePackages),
    quotedPackageIds().then(countVisiblePackages),
  ]);
  return {
    total: Number(row.total ?? 0),
    draft: Number(row.draft ?? 0),
    pending_review: Number(row.pending_review ?? 0),
    published: Number(row.published ?? 0),
    archived: Number(row.archived ?? 0),
    expiring_rates: expiringRates,
    supplier_quotes: supplierQuotes,
  };
}

function hasQuoteRequest(quote: unknown): boolean {
  const data = quote as { lastSentAt?: string; toEmails?: unknown[] } | null;
  return Boolean(data?.lastSentAt) || (Array.isArray(data?.toEmails) && data.toEmails.some(Boolean));
}

async function expiringPackageIds(): Promise<number[]> {
  const pricing = await loadSectionForAllPackages("pricing");
  return [...pricing]
    .filter(([, value]) => isRateExpiringSoon(latestRateDate(value as PricingData)))
    .map(([id]) => id);
}

async function quotedPackageIds(): Promise<number[]> {
  const quotes = await loadSectionForAllPackages("supplier_quote_tool");
  return [...quotes].filter(([, quote]) => hasQuoteRequest(quote)).map(([id]) => id);
}

async function countVisiblePackages(ids: number[]): Promise<number> {
  if (!ids.length) return 0;
  const rows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${TBL_PACKAGES}
     WHERE id IN (${ids.map(() => "?").join(",")})
       AND IFNULL(status, 0) != 0`,
    ids
  );
  return Number(rows[0]?.total ?? 0);
}

async function loadVisiblePackages(ids: number[]): Promise<PackageRecord[]> {
  if (!ids.length) return [];
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${TBL_PACKAGES}
     WHERE id IN (${ids.map(() => "?").join(",")})
       AND IFNULL(status, 0) != 0
     ORDER BY edit_date DESC, id DESC`,
    ids
  );
  const packages = await mapTblPackageRows(rows);
  return Promise.all(packages.map(async (pkg) => withStoredSections(pkg, await loadWizardSections(pkg.id))));
}

export async function listExpiringPackages(): Promise<PackageRecord[]> {
  return loadVisiblePackages(await expiringPackageIds());
}

export async function listSupplierQuoteRequests(): Promise<PackageRecord[]> {
  return loadVisiblePackages(await quotedPackageIds());
}
