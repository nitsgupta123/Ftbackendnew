import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query, sqlLimit, sqlOffset } from "./db";
import { toIsoSgtOrNow } from "./format-date";
import { LEGACY_TABLES, SETTINGS_BLOB } from "./legacy-tables";
import {
  getSettingBlobById,
  insertSettingBlob,
  updateSettingBlob,
} from "./legacy-settings-store";
import { slugify, uniqueSlug } from "./slug";
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

function parseCategoryRow(row: RowDataPacket): PackageCategoryRecord {
  return {
    id: Number(row.id),
    name: String(row.cat_title ?? ""),
    slug: String(row.cat_slug ?? ""),
    description: row.cat_content ?? null,
    icon_path: null,
    image_path: row.cat_img ?? null,
    display_order: Number(row.id),
    status: statusFromInt(row.status),
    is_featured: false,
    seo_meta_title: row.meta_title ?? null,
    seo_meta_description: row.meta_discription ?? null,
    created_by: null,
    updated_by: null,
    created_at: toIso(row.insert_date),
    updated_at: toIso(row.edit_date ?? row.insert_date),
    total_packages: row.total_packages !== undefined ? Number(row.total_packages) : undefined,
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
    ? `SELECT id FROM ${CATEGORIES_TABLE} WHERE LOWER(cat_title) = LOWER(?) AND id != ? LIMIT 1`
    : `SELECT id FROM ${CATEGORIES_TABLE} WHERE LOWER(cat_title) = LOWER(?) LIMIT 1`;
  const params = excludeId ? [name, excludeId] : [name];
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

  const conditions: string[] = [`(c.cat_type = ? OR c.cat_type = 'products')`];
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
  const sortColumn = sort === "created_at" ? "c.insert_date" : "c.id";
  const sortOrder = order === "desc" ? "DESC" : "ASC";

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

  return {
    categories: rows.map(parseCategoryRow),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getCategoryById(id: number): Promise<PackageCategoryRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${CATEGORIES_TABLE} WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return parseCategoryRow(rows[0]);
}

export async function createCategory(
  input: CreateCategoryInput,
  audit?: PackageAuditContext
): Promise<PackageCategoryRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required");
  if (await isNameTaken(name)) throw new Error("A category with this name already exists");

  const slug = await resolveCategorySlug(name, input.slug);
  const userId = 0;

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${CATEGORIES_TABLE} (
      cat_title, cat_slug, cat_content, cat_img, cat_parent,
      meta_title, meta_keyword, meta_discription, cat_type,
      insert_date, edit_date, status, user_id
    ) VALUES (?, ?, ?, ?, 0, ?, '', ?, ?, NOW(), NOW(), ?, ?)`,
    [
      name,
      slug,
      input.description?.trim() || null,
      input.image_path?.trim() || null,
      input.seo_meta_title?.trim() || null,
      input.seo_meta_description?.trim() || null,
      PACKAGE_CAT_TYPE,
      statusToInt(input.status),
      userId,
    ]
  );

  void audit;
  const created = await getCategoryById(result.insertId);
  if (!created) throw new Error("Failed to load category after create");
  return created;
}

export async function updateCategory(
  id: number,
  input: UpdateCategoryInput,
  _audit?: PackageAuditContext
): Promise<PackageCategoryRecord | null> {
  const existing = await getCategoryById(id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new Error("Category name is required");
  if (input.name !== undefined && (await isNameTaken(name, id))) {
    throw new Error("A category with this name already exists");
  }

  const slug = await resolveCategorySlug(name, input.slug ?? existing.slug, id);

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
     WHERE id = ?`,
    [
      name,
      slug,
      input.description !== undefined ? input.description?.trim() || null : existing.description,
      input.image_path !== undefined ? input.image_path?.trim() || null : existing.image_path,
      input.seo_meta_title !== undefined
        ? input.seo_meta_title?.trim() || null
        : existing.seo_meta_title,
      input.seo_meta_description !== undefined
        ? input.seo_meta_description?.trim() || null
        : existing.seo_meta_description,
      input.status !== undefined ? statusToInt(input.status) : statusToInt(existing.status),
      id,
    ]
  );

  return getCategoryById(id);
}

export async function deleteCategory(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `UPDATE ${CATEGORIES_TABLE} SET status = 2, edit_date = NOW() WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

export async function syncPackageCategories(
  packageId: number,
  categoryIds: number[]
): Promise<void> {
  const uniqueIds = [...new Set(categoryIds.filter((id) => Number.isInteger(id) && id > 0))];
  const payload = { id: packageId, category_ids: uniqueIds };
  const existing = await getSettingBlobById(SETTINGS_BLOB.packageCategories, packageId);
  if (existing) {
    await updateSettingBlob(SETTINGS_BLOB.packageCategories, packageId, payload);
  } else {
    await insertSettingBlob(SETTINGS_BLOB.packageCategories, `pkg_${packageId}`, payload);
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
     WHERE id IN (${placeholders})
     ORDER BY cat_title ASC`,
    ids
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
     WHERE status = 1 AND (cat_type = ? OR cat_type = 'products')
     ORDER BY cat_title ASC`,
    [PACKAGE_CAT_TYPE]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
  }));
}
