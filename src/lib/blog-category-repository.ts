import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query } from "./db";
import { slugify, uniqueSlug } from "./slug";
import type {
  CreateBlogCategoryInput,
  ListBlogCategoriesParams,
  ListBlogCategoriesResult,
  BlogCategoryRecord,
  UpdateBlogCategoryInput,
} from "./blog-category-types";

const CATEGORIES_TABLE = "blog_categories";
const POSTS_TABLE = "blog_posts";

function parseCategoryRow(row: RowDataPacket): BlogCategoryRecord {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    display_order: Number(row.display_order),
    status: row.status,
    seo_meta_title: row.seo_meta_title ?? null,
    seo_meta_description: row.seo_meta_description ?? null,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    total_posts: row.total_posts !== undefined ? Number(row.total_posts) : undefined,
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

export async function resolveBlogCategorySlug(
  name: string,
  requestedSlug?: string,
  excludeId?: number
): Promise<string> {
  const base = requestedSlug?.trim() ? slugify(requestedSlug) : slugify(name);
  if (!base) {
    throw new Error("Unable to generate a valid slug");
  }

  const existing = await listExistingSlugs(excludeId);
  if (!existing.includes(base)) {
    return base;
  }
  return uniqueSlug(base, existing);
}

export async function listBlogCategories(
  params: ListBlogCategoriesParams = {}
): Promise<ListBlogCategoriesResult> {
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
      (SELECT COUNT(*) FROM ${POSTS_TABLE} p WHERE p.category_id = c.id) AS total_posts
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

export async function getBlogCategoryById(id: number): Promise<BlogCategoryRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT c.*,
      (SELECT COUNT(*) FROM ${POSTS_TABLE} p WHERE p.category_id = c.id) AS total_posts
     FROM ${CATEGORIES_TABLE} c
     WHERE c.id = ?
     LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return parseCategoryRow(rows[0]);
}

export async function createBlogCategory(
  input: CreateBlogCategoryInput,
  audit?: PackageAuditContext
): Promise<BlogCategoryRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required");
  }

  if (await isNameTaken(name)) {
    throw new Error("A category with this name already exists");
  }

  const slug = await resolveBlogCategorySlug(name, input.slug);
  const auditUser = audit?.user ?? null;

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${CATEGORIES_TABLE} (
      name, slug, description, display_order, status,
      seo_meta_title, seo_meta_description, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      slug,
      input.description?.trim() || null,
      input.display_order ?? 0,
      input.status ?? "active",
      input.seo_meta_title?.trim() || null,
      input.seo_meta_description?.trim() || null,
      auditUser,
      auditUser,
    ]
  );

  const created = await getBlogCategoryById(result.insertId);
  if (!created) {
    throw new Error("Failed to load category after create");
  }
  return created;
}

export async function updateBlogCategory(
  id: number,
  input: UpdateBlogCategoryInput,
  audit?: PackageAuditContext
): Promise<BlogCategoryRecord | null> {
  const existing = await getBlogCategoryById(id);
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
    const slug = await resolveBlogCategorySlug(nameForSlug, input.slug ?? existing.slug, id);
    fields.push("slug = ?");
    values.push(slug);
  }

  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description?.trim() || null);
  }
  if (input.display_order !== undefined) {
    fields.push("display_order = ?");
    values.push(input.display_order);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
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

  return getBlogCategoryById(id);
}

export async function deleteBlogCategory(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `DELETE FROM ${CATEGORIES_TABLE} WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

export async function listActiveBlogCategoryOptions(): Promise<
  Pick<BlogCategoryRecord, "id" | "name" | "slug">[]
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
