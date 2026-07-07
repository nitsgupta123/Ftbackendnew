import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query } from "./db";
import { slugify, uniqueSlug } from "./slug";
import type {
  CreateCategoryInput,
  ListCategoriesParams,
  ListCategoriesResult,
  PackageCategoryRecord,
  UpdateCategoryInput,
} from "./category-types";

const CATEGORIES_TABLE = "package_categories";
const MAP_TABLE = "package_category_map";

function parseCategoryRow(row: RowDataPacket): PackageCategoryRecord {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    icon_path: row.icon_path ?? null,
    image_path: row.image_path ?? null,
    display_order: Number(row.display_order),
    status: row.status,
    is_featured: Boolean(row.is_featured),
    seo_meta_title: row.seo_meta_title ?? null,
    seo_meta_description: row.seo_meta_description ?? null,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    total_packages: row.total_packages !== undefined ? Number(row.total_packages) : undefined,
  };
}

async function listExistingSlugs(excludeId?: number): Promise<string[]> {
  const sql = excludeId
    ? `SELECT slug FROM ${CATEGORIES_TABLE} WHERE id != ?`
    : `SELECT slug FROM ${CATEGORIES_TABLE}`;
  const params = excludeId ? [excludeId] : [];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.map((r) => r.slug as string);
}

async function isNameTaken(name: string, excludeId?: number): Promise<boolean> {
  const sql = excludeId
    ? `SELECT id FROM ${CATEGORIES_TABLE} WHERE LOWER(name) = LOWER(?) AND id != ? LIMIT 1`
    : `SELECT id FROM ${CATEGORIES_TABLE} WHERE LOWER(name) = LOWER(?) LIMIT 1`;
  const params = excludeId ? [name, excludeId] : [name];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.length > 0;
}

async function isSlugTaken(slug: string, excludeId?: number): Promise<boolean> {
  const sql = excludeId
    ? `SELECT id FROM ${CATEGORIES_TABLE} WHERE slug = ? AND id != ? LIMIT 1`
    : `SELECT id FROM ${CATEGORIES_TABLE} WHERE slug = ? LIMIT 1`;
  const params = excludeId ? [slug, excludeId] : [slug];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.length > 0;
}

export async function resolveCategorySlug(
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

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (activeOnly || status === "active") {
    conditions.push("c.status = 'active'");
  } else if (status === "inactive") {
    conditions.push("c.status = 'inactive'");
  }

  if (search?.trim()) {
    conditions.push("c.name LIKE ?");
    values.push(`%${search.trim()}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortColumn = sort === "created_at" ? "c.created_at" : "c.display_order";
  const sortOrder = order === "desc" ? "DESC" : "ASC";

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${CATEGORIES_TABLE} c ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const rows = await query<RowDataPacket[]>(
    `SELECT c.*,
      (SELECT COUNT(*) FROM ${MAP_TABLE} m WHERE m.category_id = c.id) AS total_packages
     FROM ${CATEGORIES_TABLE} c
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, c.name ASC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
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
    `SELECT c.*,
      (SELECT COUNT(*) FROM ${MAP_TABLE} m WHERE m.category_id = c.id) AS total_packages
     FROM ${CATEGORIES_TABLE} c
     WHERE c.id = ?
     LIMIT 1`,
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
  if (!name) {
    throw new Error("Category name is required");
  }

  if (await isNameTaken(name)) {
    throw new Error("A category with this name already exists");
  }

  const slug = await resolveCategorySlug(name, input.slug);
  const auditUser = audit?.user ?? null;

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${CATEGORIES_TABLE} (
      name, slug, description, icon_path, image_path,
      display_order, status, is_featured,
      seo_meta_title, seo_meta_description,
      created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      slug,
      input.description?.trim() || null,
      input.icon_path?.trim() || null,
      input.image_path?.trim() || null,
      input.display_order ?? 0,
      input.status ?? "active",
      input.is_featured ? 1 : 0,
      input.seo_meta_title?.trim() || null,
      input.seo_meta_description?.trim() || null,
      auditUser,
      auditUser,
    ]
  );

  const created = await getCategoryById(result.insertId);
  if (!created) {
    throw new Error("Failed to load category after create");
  }
  return created;
}

export async function updateCategory(
  id: number,
  input: UpdateCategoryInput,
  audit?: PackageAuditContext
): Promise<PackageCategoryRecord | null> {
  const existing = await getCategoryById(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Category name is required");
    }
    if (await isNameTaken(name, id)) {
      throw new Error("A category with this name already exists");
    }
    fields.push("name = ?");
    values.push(name);
  }

  if (input.slug !== undefined || input.name !== undefined) {
    const nameForSlug = input.name?.trim() ?? existing.name;
    const slug = await resolveCategorySlug(
      nameForSlug,
      input.slug ?? existing.slug,
      id
    );
    fields.push("slug = ?");
    values.push(slug);
  }

  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description?.trim() || null);
  }
  if (input.icon_path !== undefined) {
    fields.push("icon_path = ?");
    values.push(input.icon_path?.trim() || null);
  }
  if (input.image_path !== undefined) {
    fields.push("image_path = ?");
    values.push(input.image_path?.trim() || null);
  }
  if (input.display_order !== undefined) {
    fields.push("display_order = ?");
    values.push(input.display_order);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.is_featured !== undefined) {
    fields.push("is_featured = ?");
    values.push(input.is_featured ? 1 : 0);
  }
  if (input.seo_meta_title !== undefined) {
    fields.push("seo_meta_title = ?");
    values.push(input.seo_meta_title?.trim() || null);
  }
  if (input.seo_meta_description !== undefined) {
    fields.push("seo_meta_description = ?");
    values.push(input.seo_meta_description?.trim() || null);
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
    `UPDATE ${CATEGORIES_TABLE} SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return getCategoryById(id);
}

export async function deleteCategory(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `DELETE FROM ${CATEGORIES_TABLE} WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

export async function syncPackageCategories(
  packageId: number,
  categoryIds: number[]
): Promise<void> {
  const uniqueIds = [...new Set(categoryIds.filter((id) => Number.isInteger(id) && id > 0))];

  await query<ResultSetHeader>(
    `DELETE FROM ${MAP_TABLE} WHERE package_id = ?`,
    [packageId]
  );

  if (!uniqueIds.length) return;

  const placeholders = uniqueIds.map(() => "(?, ?)").join(", ");
  const params: number[] = [];
  for (const categoryId of uniqueIds) {
    params.push(packageId, categoryId);
  }

  await query<ResultSetHeader>(
    `INSERT INTO ${MAP_TABLE} (package_id, category_id) VALUES ${placeholders}`,
    params
  );
}

export async function getPackageCategoryIds(packageId: number): Promise<number[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT category_id FROM ${MAP_TABLE} WHERE package_id = ? ORDER BY category_id`,
    [packageId]
  );
  return rows.map((r) => Number(r.category_id));
}

export async function getPackageCategoryNames(packageId: number): Promise<string[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT c.name
     FROM ${MAP_TABLE} m
     INNER JOIN ${CATEGORIES_TABLE} c ON c.id = m.category_id
     WHERE m.package_id = ?
     ORDER BY c.display_order ASC, c.name ASC`,
    [packageId]
  );
  return rows.map((r) => r.name as string);
}

export async function listActiveCategoryOptions(): Promise<
  Pick<PackageCategoryRecord, "id" | "name" | "slug">[]
> {
  const rows = await query<RowDataPacket[]>(
    `SELECT id, name, slug FROM ${CATEGORIES_TABLE}
     WHERE status = 'active'
     ORDER BY display_order ASC, name ASC`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name as string,
    slug: r.slug as string,
  }));
}
