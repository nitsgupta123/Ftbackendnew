import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query } from "./db";
import { nowMysqlDateTimeSgt } from "./format-date";
import { slugify, uniqueSlug } from "./slug";
import type {
  CmsPageRecord,
  CreatePageInput,
  ListPagesParams,
  ListPagesResult,
  PageStats,
  UpdatePageInput,
} from "./page-types";

const PAGES_TABLE = "cms_pages";

function parsePageRow(row: RowDataPacket): CmsPageRecord {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    content: row.content ?? null,
    featured_image_path: row.featured_image_path ?? null,
    page_type: row.page_type ?? null,
    status: row.status,
    show_in_nav: Boolean(row.show_in_nav),
    display_order: Number(row.display_order ?? 0),
    published_at:
      row.published_at instanceof Date
        ? row.published_at.toISOString()
        : row.published_at
          ? String(row.published_at)
          : null,
    seo_meta_title: row.seo_meta_title ?? null,
    seo_meta_description: row.seo_meta_description ?? null,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

async function listExistingSlugs(excludeId?: number): Promise<string[]> {
  const sql = excludeId
    ? `SELECT slug FROM ${PAGES_TABLE} WHERE id != ?`
    : `SELECT slug FROM ${PAGES_TABLE}`;
  const params = excludeId ? [excludeId] : [];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.map((r) => r.slug as string);
}

export async function resolvePageSlug(
  title: string,
  requestedSlug?: string,
  excludeId?: number
): Promise<string> {
  const base = requestedSlug?.trim() ? slugify(requestedSlug) : slugify(title);
  if (!base) {
    throw new Error("Unable to generate a valid slug");
  }

  const existing = await listExistingSlugs(excludeId);
  if (!existing.includes(base)) {
    return base;
  }
  return uniqueSlug(base, existing);
}

export async function listPages(params: ListPagesParams = {}): Promise<ListPagesResult> {
  const {
    search,
    status = "all",
    page_type,
    sort = "display_order",
    order = "asc",
    page = 1,
    limit = 20,
  } = params;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (status !== "all") {
    conditions.push("status = ?");
    values.push(status);
  }

  if (page_type?.trim()) {
    conditions.push("page_type = ?");
    values.push(page_type.trim());
  }

  if (search?.trim()) {
    conditions.push("(title LIKE ? OR excerpt LIKE ? OR slug LIKE ?)");
    const term = `%${search.trim()}%`;
    values.push(term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortColumn =
    sort === "title"
      ? "title"
      : sort === "created_at"
        ? "created_at"
        : sort === "published_at"
          ? "published_at"
          : "display_order";
  const sortOrder = order === "asc" ? "ASC" : "DESC";

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${PAGES_TABLE} ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const rows = await query<RowDataPacket[]>(
    `SELECT * FROM ${PAGES_TABLE}
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, updated_at DESC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
  );

  return {
    pages: rows.map(parsePageRow),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getPageById(id: number): Promise<CmsPageRecord | null> {
  const rows = await query<RowDataPacket[]>(`SELECT * FROM ${PAGES_TABLE} WHERE id = ? LIMIT 1`, [
    id,
  ]);
  if (!rows.length) return null;
  return parsePageRow(rows[0]);
}

export async function getPageStats(): Promise<PageStats> {
  const rows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived,
      SUM(CASE WHEN show_in_nav = 1 THEN 1 ELSE 0 END) AS in_nav
     FROM ${PAGES_TABLE}`
  );

  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    draft: Number(row.draft ?? 0),
    published: Number(row.published ?? 0),
    archived: Number(row.archived ?? 0),
    in_nav: Number(row.in_nav ?? 0),
  };
}

function resolvePublishedAt(
  status: string | undefined,
  publishedAt: string | null | undefined,
  existingPublishedAt: string | null
): string | null {
  if (status === "published") {
    if (publishedAt) return publishedAt;
    if (existingPublishedAt) return existingPublishedAt;
    return nowMysqlDateTimeSgt();
  }
  if (publishedAt !== undefined) {
    return publishedAt;
  }
  return existingPublishedAt;
}

export async function createPage(
  input: CreatePageInput,
  audit?: PackageAuditContext
): Promise<CmsPageRecord> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Page title is required");
  }

  const slug = await resolvePageSlug(title, input.slug);
  const status = input.status ?? "draft";
  const auditUser = audit?.user ?? null;
  const publishedAt = resolvePublishedAt(status, input.published_at, null);

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${PAGES_TABLE} (
      title, slug, excerpt, content, featured_image_path, page_type,
      status, show_in_nav, display_order, published_at,
      seo_meta_title, seo_meta_description, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      slug,
      input.excerpt?.trim() || null,
      input.content ?? null,
      input.featured_image_path?.trim() || null,
      input.page_type?.trim() || null,
      status,
      input.show_in_nav ? 1 : 0,
      input.display_order ?? 0,
      publishedAt,
      input.seo_meta_title?.trim() || null,
      input.seo_meta_description?.trim() || null,
      auditUser,
      auditUser,
    ]
  );

  const created = await getPageById(result.insertId);
  if (!created) {
    throw new Error("Failed to load page after create");
  }
  return created;
}

export async function updatePage(
  id: number,
  input: UpdatePageInput,
  audit?: PackageAuditContext
): Promise<CmsPageRecord | null> {
  const existing = await getPageById(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      throw new Error("Page title is required");
    }
    fields.push("title = ?");
    values.push(title);
  }

  if (input.slug !== undefined || input.title !== undefined) {
    const titleForSlug = input.title?.trim() ?? existing.title;
    const slug = await resolvePageSlug(titleForSlug, input.slug ?? existing.slug, id);
    fields.push("slug = ?");
    values.push(slug);
  }

  if (input.excerpt !== undefined) {
    fields.push("excerpt = ?");
    values.push(input.excerpt?.trim() || null);
  }
  if (input.content !== undefined) {
    fields.push("content = ?");
    values.push(input.content ?? null);
  }
  if (input.featured_image_path !== undefined) {
    fields.push("featured_image_path = ?");
    values.push(input.featured_image_path?.trim() || null);
  }
  if (input.page_type !== undefined) {
    fields.push("page_type = ?");
    values.push(input.page_type?.trim() || null);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.show_in_nav !== undefined) {
    fields.push("show_in_nav = ?");
    values.push(input.show_in_nav ? 1 : 0);
  }
  if (input.display_order !== undefined) {
    fields.push("display_order = ?");
    values.push(input.display_order);
  }
  if (input.seo_meta_title !== undefined) {
    fields.push("seo_meta_title = ?");
    values.push(input.seo_meta_title?.trim() || null);
  }
  if (input.seo_meta_description !== undefined) {
    fields.push("seo_meta_description = ?");
    values.push(input.seo_meta_description?.trim() || null);
  }

  const nextStatus = input.status ?? existing.status;
  if (input.status !== undefined || input.published_at !== undefined) {
    const publishedAt = resolvePublishedAt(nextStatus, input.published_at, existing.published_at);
    fields.push("published_at = ?");
    values.push(publishedAt);
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
    `UPDATE ${PAGES_TABLE} SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return getPageById(id);
}

export async function deletePage(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(`DELETE FROM ${PAGES_TABLE} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}
