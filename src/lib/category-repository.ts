import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { loadUserNameMap, userLabel } from "./user-names";
import { query, sqlLimit, sqlOffset } from "./db";
import { toIsoSgtOrNow } from "./format-date";
import { LEGACY_TABLES, SETTINGS_BLOB } from "./legacy-tables";
import {
  getSettingBlobById,
  insertSettingBlob,
  listSettingBlobs,
  updateSettingBlob,
} from "./legacy-settings-store";
import { slugify, uniqueSlug } from "./slug";
import {
  deleteCategoryExtras,
  getCategoryExtras,
  getCategoryExtrasMap,
  saveCategoryExtras,
  type CategoryExtras,
} from "./post-extras-store";
import type {
  CreateCategoryInput,
  ListCategoriesParams,
  ListCategoriesResult,
  PackageCategoryRecord,
  UpdateCategoryInput,
} from "./category-types";

const CATEGORIES_TABLE = LEGACY_TABLES.categories;
const PACKAGE_CAT_TYPE = "packages";

function statusToInt(status: string | undefined): number {
  return status === "inactive" ? 2 : 1;
}

function statusFromInt(value: unknown): "active" | "inactive" {
  return Number(value) === 1 ? "active" : "inactive";
}

function toIso(value: unknown): string {
  return toIsoSgtOrNow(
    value instanceof Date || typeof value === "string" ? value : value != null ? String(value) : null
  );
}

/** Number of non-deleted packages assigned to each category. */
async function packageCountsByCategory(): Promise<Map<number, number>> {
  const blobs = await listSettingBlobs<{ category_ids?: number[] }>(SETTINGS_BLOB.packageCategories);
  const counts = new Map<number, number>();
  if (!blobs.length) return counts;
  const live = await query<RowDataPacket[]>(
    `SELECT id FROM ${LEGACY_TABLES.packages}
     WHERE IFNULL(status, 0) != 0 AND id IN (${blobs.map(() => "?").join(",")})`,
    blobs.map((blob) => blob.id)
  );
  const liveIds = new Set(live.map((row) => Number(row.id)));
  for (const blob of blobs) {
    if (!liveIds.has(blob.id)) continue;
    for (const categoryId of new Set((blob.category_ids ?? []).map(Number))) {
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    }
  }
  return counts;
}

function parseCategoryRow(
  row: RowDataPacket,
  extras: CategoryExtras = {},
  counts?: Map<number, number>,
  userNames: Map<number, string> = new Map()
): PackageCategoryRecord {
  const createdBy = userLabel(row.user_id, userNames);
  return {
    id: Number(row.id),
    name: String(row.cat_title ?? ""),
    slug: String(row.cat_slug ?? ""),
    description: row.cat_content || null,
    icon_path: extras.icon_path ?? null,
    image_path: row.cat_img || null,
    display_order: Number.isInteger(extras.display_order) ? Number(extras.display_order) : 0,
    status: statusFromInt(row.status),
    is_featured: extras.is_featured === true,
    seo_meta_title: row.meta_title || null,
    seo_meta_description: row.meta_discription || null,
    created_by: createdBy,
    updated_by: extras.updated_by || createdBy,
    created_at: toIso(row.insert_date),
    updated_at: toIso(row.edit_date ?? row.insert_date),
    total_packages: counts ? counts.get(Number(row.id)) ?? 0 : undefined,
  };
}

async function listExistingSlugs(excludeId?: number): Promise<string[]> {
  const sql = excludeId
    ? `SELECT cat_slug AS slug FROM ${CATEGORIES_TABLE} WHERE id != ?`
    : `SELECT cat_slug AS slug FROM ${CATEGORIES_TABLE}`;
  const params = excludeId ? [excludeId] : [];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.map((r) => String(r.slug));
}

async function isNameTaken(name: string, excludeId?: number): Promise<boolean> {
  const sql = excludeId
    ? `SELECT id FROM ${CATEGORIES_TABLE} WHERE cat_type = ? AND LOWER(cat_title) = LOWER(?) AND id != ? LIMIT 1`
    : `SELECT id FROM ${CATEGORIES_TABLE} WHERE cat_type = ? AND LOWER(cat_title) = LOWER(?) LIMIT 1`;
  const params = excludeId ? [PACKAGE_CAT_TYPE, name, excludeId] : [PACKAGE_CAT_TYPE, name];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.length > 0;
}

export async function resolveCategorySlug(
  name: string,
  requestedSlug?: string,
  excludeId?: number
): Promise<string> {
  const base = requestedSlug?.trim() ? slugify(requestedSlug) : slugify(name);
  if (!base) throw new Error("Unable to generate a valid slug");
  if (!(await isSlugTaken(base, excludeId))) return base;
  return uniqueSlug(base, await listExistingSlugs(excludeId));
}

async function isSlugTaken(slug: string, excludeId?: number): Promise<boolean> {
  const sql = excludeId
    ? `SELECT id FROM ${CATEGORIES_TABLE} WHERE cat_slug = ? AND id != ? LIMIT 1`
    : `SELECT id FROM ${CATEGORIES_TABLE} WHERE cat_slug = ? LIMIT 1`;
  const params = excludeId ? [slug, excludeId] : [slug];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.length > 0;
}

export async function listCategories(
  params: ListCategoriesParams = {}
): Promise<ListCategoriesResult> {
  const {
    search,
    status = "all",
    sort = "display_order",
    order = "asc",
    page = 1,
    limit = 20,
    activeOnly = false,
  } = params;

  const conditions: string[] = [`c.cat_type = ?`];
  const values: (string | number)[] = [PACKAGE_CAT_TYPE];

  if (activeOnly || status === "active") {
    conditions.push("c.status = 1");
  } else if (status === "inactive") {
    conditions.push("c.status = 2");
  }

  if (search?.trim()) {
    conditions.push("c.cat_title LIKE ?");
    values.push(`%${search.trim()}%`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sortOrder = order === "desc" ? "DESC" : "ASC";

  if (sort !== "created_at") {
    // display_order lives in tbl_settings, so this sort is applied after loading.
    const allRows = await query<RowDataPacket[]>(
      `SELECT c.* FROM ${CATEGORIES_TABLE} c ${whereClause}`,
      values
    );
    const extrasMap = await getCategoryExtrasMap(allRows.map((row) => Number(row.id)));
    const counts = await packageCountsByCategory();
    const userNames = await loadUserNameMap(allRows.map((row) => row.user_id));
    const direction = sortOrder === "ASC" ? 1 : -1;
    const sorted = allRows
      .map((row) => parseCategoryRow(row, extrasMap.get(Number(row.id)), counts, userNames))
      .sort(
        (a, b) =>
          (a.display_order - b.display_order || a.name.localeCompare(b.name)) * direction
      );
    const safeLimit = sqlLimit(limit);
    const safePage = Math.max(page, 1);
    const offset = sqlOffset((safePage - 1) * safeLimit);
    return {
      categories: sorted.slice(offset, offset + safeLimit),
      total: sorted.length,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(sorted.length / safeLimit) || 1,
    };
  }

  const sortColumn = "c.insert_date";
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${CATEGORIES_TABLE} c ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);
  const safeLimit = sqlLimit(limit);
  const safePage = Math.max(page, 1);
  const offset = sqlOffset((safePage - 1) * safeLimit);

  const rows = await query<RowDataPacket[]>(
    `SELECT c.* FROM ${CATEGORIES_TABLE} c
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, c.cat_title ASC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    values
  );

  const extrasMap = await getCategoryExtrasMap(rows.map((row) => Number(row.id)));
  const counts = await packageCountsByCategory();
  const userNames = await loadUserNameMap(rows.map((row) => row.user_id));
  return {
    categories: rows.map((row) => parseCategoryRow(row, extrasMap.get(Number(row.id)), counts, userNames)),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getCategoryById(id: number): Promise<PackageCategoryRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${CATEGORIES_TABLE} WHERE id = ? AND cat_type = ? LIMIT 1`,
    [id, PACKAGE_CAT_TYPE]
  );
  if (!rows.length) return null;
  return parseCategoryRow(
    rows[0],
    await getCategoryExtras(id),
    await packageCountsByCategory(),
    await loadUserNameMap([rows[0].user_id])
  );
}

function extrasFromInput(input: UpdateCategoryInput): CategoryExtras {
  return {
    display_order: input.display_order,
    is_featured: input.is_featured,
    icon_path: input.icon_path !== undefined ? input.icon_path?.trim() || null : undefined,
  };
}

export async function createCategory(
  input: CreateCategoryInput,
  audit?: PackageAuditContext
): Promise<PackageCategoryRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required");
  if (await isNameTaken(name)) throw new Error("A category with this name already exists");

  const slug = await resolveCategorySlug(name, input.slug);
  const userId = audit?.userId ?? 0;

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${CATEGORIES_TABLE} (
      cat_title, cat_slug, cat_content, cat_img, cat_parent,
      meta_title, meta_keyword, meta_discription, cat_type,
      insert_date, edit_date, status, user_id
    ) VALUES (?, ?, ?, ?, 0, ?, '', ?, ?, NOW(), NOW(), ?, ?)`,
    [
      name,
      slug,
      input.description?.trim() || "",
      input.image_path?.trim() || "",
      input.seo_meta_title?.trim() || "",
      input.seo_meta_description?.trim() || "",
      PACKAGE_CAT_TYPE,
      statusToInt(input.status),
      userId,
    ]
  );

  await saveCategoryExtras(result.insertId, { ...extrasFromInput(input), updated_by: audit?.user });
  const created = await getCategoryById(result.insertId);
  if (!created) throw new Error("Failed to load category after create");
  return created;
}

export async function updateCategory(
  id: number,
  input: UpdateCategoryInput,
  audit?: PackageAuditContext
): Promise<PackageCategoryRecord | null> {
  const existing = await getCategoryById(id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new Error("Category name is required");
  if (input.name !== undefined && (await isNameTaken(name, id))) {
    throw new Error("A category with this name already exists");
  }

  const slug =
    input.slug === undefined || input.slug === existing.slug
      ? existing.slug
      : await resolveCategorySlug(name, input.slug, id);

  await query<ResultSetHeader>(
    `UPDATE ${CATEGORIES_TABLE} SET
      cat_title = ?,
      cat_slug = ?,
      cat_content = ?,
      cat_img = ?,
      meta_title = ?,
      meta_discription = ?,
      status = ?,
      edit_date = NOW()
     WHERE id = ? AND cat_type = ?`,
    [
      name,
      slug,
      (input.description !== undefined ? input.description?.trim() || null : existing.description) ?? "",
      (input.image_path !== undefined ? input.image_path?.trim() || null : existing.image_path) ?? "",
      (input.seo_meta_title !== undefined
        ? input.seo_meta_title?.trim() || null
        : existing.seo_meta_title) ?? "",
      (input.seo_meta_description !== undefined
        ? input.seo_meta_description?.trim() || null
        : existing.seo_meta_description) ?? "",
      input.status !== undefined ? statusToInt(input.status) : statusToInt(existing.status),
      id,
      PACKAGE_CAT_TYPE,
    ]
  );

  await saveCategoryExtras(id, { ...extrasFromInput(input), updated_by: audit?.user });
  return getCategoryById(id);
}

export async function deleteCategory(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `DELETE FROM ${CATEGORIES_TABLE} WHERE id = ? AND cat_type = ?`,
    [id, PACKAGE_CAT_TYPE]
  );
  if (result.affectedRows > 0) {
    await deleteCategoryExtras(id);
    await removeCategoryFromPackages(id);
  }
  return result.affectedRows > 0;
}

export async function syncPackageCategories(
  packageId: number,
  categoryIds: number[]
): Promise<void> {
  const requested = [
    ...new Set(categoryIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)),
  ];
  const valid = requested.length
    ? await query<RowDataPacket[]>(
        `SELECT id FROM ${CATEGORIES_TABLE}
         WHERE cat_type = ? AND id IN (${requested.map(() => "?").join(",")})`,
        [PACKAGE_CAT_TYPE, ...requested]
      )
    : [];
  const validIds = new Set(valid.map((row) => Number(row.id)));
  const uniqueIds = requested.filter((id) => validIds.has(id));
  const payload = { id: packageId, category_ids: uniqueIds };
  const existing = await getSettingBlobById(SETTINGS_BLOB.packageCategories, packageId);
  if (existing) {
    await updateSettingBlob(SETTINGS_BLOB.packageCategories, packageId, payload);
  } else {
    await insertSettingBlob(SETTINGS_BLOB.packageCategories, `pkg_${packageId}`, payload);
  }
}

async function removeCategoryFromPackages(categoryId: number): Promise<void> {
  const blobs = await listSettingBlobs<{ category_ids?: number[] }>(SETTINGS_BLOB.packageCategories);
  for (const blob of blobs) {
    const ids = (blob.category_ids ?? []).map(Number);
    if (!ids.includes(categoryId)) continue;
    await updateSettingBlob(SETTINGS_BLOB.packageCategories, blob.id, {
      id: blob.id,
      category_ids: ids.filter((id) => id !== categoryId),
    });
  }
}

export async function getPackageCategoryIds(packageId: number): Promise<number[]> {
  const blob = await getSettingBlobById<{ category_ids?: number[] }>(
    SETTINGS_BLOB.packageCategories,
    packageId
  );
  return (blob?.category_ids ?? []).map(Number).filter((id) => id > 0);
}

export async function getPackageCategoryNames(packageId: number): Promise<string[]> {
  const { names } = await getPackageCategorySummary(packageId);
  return names;
}

export async function getPackageCategorySummary(packageId: number): Promise<{
  ids: number[];
  names: string[];
}> {
  const ids = await getPackageCategoryIds(packageId);
  if (!ids.length) return { ids: [], names: [] };

  const placeholders = ids.map(() => "?").join(", ");
  const rows = await query<RowDataPacket[]>(
    `SELECT id, cat_title AS name FROM ${CATEGORIES_TABLE}
     WHERE id IN (${placeholders}) AND cat_type = ?
     ORDER BY cat_title ASC`,
    [...ids, PACKAGE_CAT_TYPE]
  );
  return {
    ids: rows.map((r) => Number(r.id)),
    names: rows.map((r) => String(r.name)),
  };
}

export async function listActiveCategoryOptions(): Promise<
  Pick<PackageCategoryRecord, "id" | "name" | "slug">[]
> {
  const rows = await query<RowDataPacket[]>(
    `SELECT id, cat_title AS name, cat_slug AS slug FROM ${CATEGORIES_TABLE}
     WHERE status = 1 AND cat_type = ?
     ORDER BY cat_title ASC`,
    [PACKAGE_CAT_TYPE]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
  }));
}
