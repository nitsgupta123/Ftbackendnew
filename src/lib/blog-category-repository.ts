import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { loadUserNameMap, userLabel } from "./user-names";
import { query, sqlLimit, sqlOffset } from "./db";
import { toIsoSgtOrNow } from "./format-date";
import { LEGACY_TABLES } from "./legacy-tables";
import { slugify, uniqueSlug } from "./slug";
import {
  deleteCategoryExtras,
  getCategoryExtras,
  getCategoryExtrasMap,
  saveCategoryExtras,
  type CategoryExtras,
} from "./post-extras-store";
import type {
  CreateBlogCategoryInput,
  ListBlogCategoriesParams,
  ListBlogCategoriesResult,
  BlogCategoryRecord,
  UpdateBlogCategoryInput,
} from "./blog-category-types";

const CATEGORIES_TABLE = LEGACY_TABLES.categories;
const POSTS_TABLE = LEGACY_TABLES.posts;
const ARTICLE_CAT_TYPE = "article";

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

function parseCategoryRow(
  row: RowDataPacket,
  extras: CategoryExtras = {},
  userNames: Map<number, string> = new Map()
): BlogCategoryRecord {
  const createdBy = userLabel(row.user_id, userNames);
  return {
    id: Number(row.id),
    name: String(row.cat_title ?? ""),
    slug: String(row.cat_slug ?? ""),
    description: row.cat_content || null,
    display_order: Number.isInteger(extras.display_order) ? Number(extras.display_order) : 0,
    status: statusFromInt(row.status),
    seo_meta_title: row.meta_title || null,
    seo_meta_description: row.meta_discription || null,
    created_by: createdBy,
    updated_by: extras.updated_by || createdBy,
    created_at: toIso(row.insert_date),
    updated_at: toIso(row.edit_date ?? row.insert_date),
    total_posts: row.total_posts !== undefined ? Number(row.total_posts) : undefined,
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
  const params = excludeId ? [ARTICLE_CAT_TYPE, name, excludeId] : [ARTICLE_CAT_TYPE, name];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.length > 0;
}

async function isSlugTaken(slug: string, excludeId?: number): Promise<boolean> {
  const sql = excludeId
    ? `SELECT id FROM ${CATEGORIES_TABLE} WHERE cat_slug = ? AND id != ? LIMIT 1`
    : `SELECT id FROM ${CATEGORIES_TABLE} WHERE cat_slug = ? LIMIT 1`;
  const params = excludeId ? [slug, excludeId] : [slug];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.length > 0;
}

export async function resolveBlogCategorySlug(
  name: string,
  requestedSlug?: string,
  excludeId?: number
): Promise<string> {
  const base = requestedSlug?.trim() ? slugify(requestedSlug) : slugify(name);
  if (!base) throw new Error("Unable to generate a valid slug");
  if (!(await isSlugTaken(base, excludeId))) return base;
  return uniqueSlug(base, await listExistingSlugs(excludeId));
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

  const conditions: string[] = ["c.cat_type = ?"];
  const values: (string | number)[] = [ARTICLE_CAT_TYPE];

  if (activeOnly || status === "active") conditions.push("c.status = 1");
  else if (status === "inactive") conditions.push("c.status = 2");

  if (search?.trim()) {
    conditions.push("c.cat_title LIKE ?");
    values.push(`%${search.trim()}%`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sortOrder = order === "desc" ? "DESC" : "ASC";
  const postCount = `(SELECT COUNT(*) FROM ${POSTS_TABLE} p
        WHERE p.post_cat = c.id AND p.post_type = 'article') AS total_posts`;

  if (sort !== "created_at") {
    // display_order lives in tbl_settings, so this sort is applied after loading.
    const allRows = await query<RowDataPacket[]>(
      `SELECT c.*, ${postCount} FROM ${CATEGORIES_TABLE} c ${whereClause}`,
      values
    );
    const extrasMap = await getCategoryExtrasMap(allRows.map((row) => Number(row.id)));
    const userNames = await loadUserNameMap(allRows.map((row) => row.user_id));
    const direction = sortOrder === "ASC" ? 1 : -1;
    const sorted = allRows
      .map((row) => parseCategoryRow(row, extrasMap.get(Number(row.id)), userNames))
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
    `SELECT c.*,
      (SELECT COUNT(*) FROM ${POSTS_TABLE} p
        WHERE p.post_cat = c.id AND p.post_type = 'article') AS total_posts
     FROM ${CATEGORIES_TABLE} c
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, c.cat_title ASC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    values
  );

  const extrasMap = await getCategoryExtrasMap(rows.map((row) => Number(row.id)));
  const userNames = await loadUserNameMap(rows.map((row) => row.user_id));
  return {
    categories: rows.map((row) => parseCategoryRow(row, extrasMap.get(Number(row.id)), userNames)),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getBlogCategoryById(id: number): Promise<BlogCategoryRecord | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT c.*,
      (SELECT COUNT(*) FROM ${POSTS_TABLE} p
        WHERE p.post_cat = c.id AND p.post_type = 'article') AS total_posts
     FROM ${CATEGORIES_TABLE} c
     WHERE c.id = ? AND c.cat_type = ? LIMIT 1`,
    [id, ARTICLE_CAT_TYPE]
  );
  if (!rows.length) return null;
  return parseCategoryRow(rows[0], await getCategoryExtras(id), await loadUserNameMap([rows[0].user_id]));
}

export async function createBlogCategory(
  input: CreateBlogCategoryInput,
  audit?: PackageAuditContext
): Promise<BlogCategoryRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required");
  if (await isNameTaken(name)) throw new Error("A category with this name already exists");
  const slug = await resolveBlogCategorySlug(name, input.slug);

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${CATEGORIES_TABLE} (
      cat_title, cat_slug, cat_content, cat_img, cat_parent,
      meta_title, meta_keyword, meta_discription, cat_type,
      insert_date, edit_date, status, user_id
    ) VALUES (?, ?, ?, '', 0, ?, '', ?, ?, NOW(), NOW(), ?, ?)`,
    [
      name,
      slug,
      input.description?.trim() || "",
      input.seo_meta_title?.trim() || "",
      input.seo_meta_description?.trim() || "",
      ARTICLE_CAT_TYPE,
      statusToInt(input.status),
      audit?.userId ?? 0,
    ]
  );

  await saveCategoryExtras(result.insertId, { display_order: input.display_order, updated_by: audit?.user });
  const created = await getBlogCategoryById(result.insertId);
  if (!created) throw new Error("Failed to load category after create");
  return created;
}

export async function updateBlogCategory(
  id: number,
  input: UpdateBlogCategoryInput,
  audit?: PackageAuditContext
): Promise<BlogCategoryRecord | null> {
  const existing = await getBlogCategoryById(id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new Error("Category name is required");
  if (input.name !== undefined && (await isNameTaken(name, id))) {
    throw new Error("A category with this name already exists");
  }
  const slug =
    input.slug === undefined || input.slug === existing.slug
      ? existing.slug
      : await resolveBlogCategorySlug(name, input.slug, id);

  await query<ResultSetHeader>(
    `UPDATE ${CATEGORIES_TABLE} SET
      cat_title = ?,
      cat_slug = ?,
      cat_content = ?,
      meta_title = ?,
      meta_discription = ?,
      status = ?,
      edit_date = NOW()
     WHERE id = ? AND cat_type = ?`,
    [
      name,
      slug,
      (input.description !== undefined ? input.description?.trim() || null : existing.description) ?? "",
      (input.seo_meta_title !== undefined
        ? input.seo_meta_title?.trim() || null
        : existing.seo_meta_title) ?? "",
      (input.seo_meta_description !== undefined
        ? input.seo_meta_description?.trim() || null
        : existing.seo_meta_description) ?? "",
      input.status !== undefined ? statusToInt(input.status) : statusToInt(existing.status),
      id,
      ARTICLE_CAT_TYPE,
    ]
  );

  await saveCategoryExtras(id, { display_order: input.display_order, updated_by: audit?.user });
  return getBlogCategoryById(id);
}

export async function deleteBlogCategory(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `DELETE FROM ${CATEGORIES_TABLE} WHERE id = ? AND cat_type = ?`,
    [id, ARTICLE_CAT_TYPE]
  );
  if (result.affectedRows > 0) {
    await query(
      `UPDATE ${POSTS_TABLE} SET post_cat = 0, edit_date = NOW()
       WHERE post_cat = ? AND post_type = 'article'`,
      [id]
    );
    await deleteCategoryExtras(id);
  }
  return result.affectedRows > 0;
}

export async function listActiveBlogCategoryOptions(): Promise<
  Pick<BlogCategoryRecord, "id" | "name" | "slug">[]
> {
  const rows = await query<RowDataPacket[]>(
    `SELECT id, cat_title AS name, cat_slug AS slug FROM ${CATEGORIES_TABLE}
     WHERE status = 1 AND cat_type = ?
     ORDER BY cat_title ASC`,
    [ARTICLE_CAT_TYPE]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
  }));
}
