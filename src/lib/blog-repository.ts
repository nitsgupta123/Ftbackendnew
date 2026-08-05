import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query } from "./db";
import { nowMysqlDateTimeSgt } from "./format-date";
import { slugify, uniqueSlug } from "./slug";
import type {
  BlogPostRecord,
  BlogStats,
  CreateBlogPostInput,
  ListBlogPostsParams,
  ListBlogPostsResult,
  UpdateBlogPostInput,
} from "./blog-types";

const POSTS_TABLE = "blog_posts";
const CATEGORIES_TABLE = "blog_categories";

function parseTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parsePostRow(row: RowDataPacket): BlogPostRecord {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    content: row.content ?? null,
    featured_image_path: row.featured_image_path ?? null,
    category_id: row.category_id !== null && row.category_id !== undefined ? Number(row.category_id) : null,
    category_name: row.category_name ?? null,
    author_name: row.author_name ?? null,
    status: row.status,
    is_featured: Boolean(row.is_featured),
    published_at:
      row.published_at instanceof Date
        ? row.published_at.toISOString()
        : row.published_at
          ? String(row.published_at)
          : null,
    tags: parseTags(row.tags),
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
    ? `SELECT slug FROM ${POSTS_TABLE} WHERE id != ?`
    : `SELECT slug FROM ${POSTS_TABLE}`;
  const params = excludeId ? [excludeId] : [];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.map((r) => r.slug as string);
}

export async function resolveBlogPostSlug(
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

const POST_SELECT = `
  SELECT p.*, c.name AS category_name
  FROM ${POSTS_TABLE} p
  LEFT JOIN ${CATEGORIES_TABLE} c ON c.id = p.category_id
`;

export async function listBlogPosts(
  params: ListBlogPostsParams = {}
): Promise<ListBlogPostsResult> {
  const {
    search,
    status = "all",
    category_id,
    author_name,
    sort = "published_at",
    order = "desc",
    page = 1,
    limit = 20,
    featuredOnly = false,
  } = params;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (status !== "all") {
    conditions.push("p.status = ?");
    values.push(status);
  }

  if (category_id) {
    conditions.push("p.category_id = ?");
    values.push(category_id);
  }

  if (author_name?.trim()) {
    conditions.push("p.author_name = ?");
    values.push(author_name.trim());
  }

  if (featuredOnly) {
    conditions.push("p.is_featured = 1");
  }

  if (search?.trim()) {
    conditions.push("(p.title LIKE ? OR p.excerpt LIKE ? OR p.author_name LIKE ?)");
    const term = `%${search.trim()}%`;
    values.push(term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortColumn =
    sort === "title"
      ? "p.title"
      : sort === "created_at"
        ? "p.created_at"
        : sort === "author_name"
          ? "p.author_name"
          : "COALESCE(p.published_at, p.created_at)";
  const sortOrder = order === "asc" ? "ASC" : "DESC";

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${POSTS_TABLE} p ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const rows = await query<RowDataPacket[]>(
    `${POST_SELECT}
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, p.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
  );

  return {
    posts: rows.map(parsePostRow),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getBlogPostById(id: number): Promise<BlogPostRecord | null> {
  const rows = await query<RowDataPacket[]>(`${POST_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
  if (!rows.length) return null;
  return parsePostRow(rows[0]);
}

export async function listBlogAuthors(): Promise<string[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT DISTINCT TRIM(author_name) AS author_name
     FROM ${POSTS_TABLE}
     WHERE author_name IS NOT NULL AND TRIM(author_name) <> ''
     ORDER BY TRIM(author_name) ASC`
  );
  return rows.map((row) => String(row.author_name).trim()).filter(Boolean);
}

export async function getBlogStats(): Promise<BlogStats> {
  const rows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived,
      SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) AS featured
     FROM ${POSTS_TABLE}`
  );

  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    draft: Number(row.draft ?? 0),
    scheduled: Number(row.scheduled ?? 0),
    published: Number(row.published ?? 0),
    archived: Number(row.archived ?? 0),
    featured: Number(row.featured ?? 0),
  };
}

function assertScheduledHasPublishAt(
  status: string | undefined,
  publishedAt: string | null | undefined
) {
  if (status === "scheduled" && !publishedAt) {
    throw new Error("Schedule date/time (SGT) is required for scheduled posts");
  }
}

function resolvePublishedAt(
  status: string | undefined,
  publishedAt: string | null | undefined,
  existingPublishedAt: string | null
): string | null {
  if (status === "scheduled") {
    if (publishedAt) return publishedAt;
    if (existingPublishedAt) return existingPublishedAt;
    return null;
  }
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

export async function createBlogPost(
  input: CreateBlogPostInput,
  audit?: PackageAuditContext
): Promise<BlogPostRecord> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Blog title is required");
  }

  const slug = await resolveBlogPostSlug(title, input.slug);
  const status = input.status ?? "draft";
  const auditUser = audit?.user ?? null;
  const publishedAt = resolvePublishedAt(status, input.published_at, null);
  assertScheduledHasPublishAt(status, publishedAt);
  const tagsJson = JSON.stringify(input.tags ?? []);

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${POSTS_TABLE} (
      title, slug, excerpt, content, featured_image_path, category_id, author_name,
      status, is_featured, published_at, tags,
      seo_meta_title, seo_meta_description, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      slug,
      input.excerpt?.trim() || null,
      input.content ?? null,
      input.featured_image_path?.trim() || null,
      input.category_id ?? null,
      input.author_name?.trim() || null,
      status,
      input.is_featured ? 1 : 0,
      publishedAt,
      tagsJson,
      input.seo_meta_title?.trim() || null,
      input.seo_meta_description?.trim() || null,
      auditUser,
      auditUser,
    ]
  );

  const created = await getBlogPostById(result.insertId);
  if (!created) {
    throw new Error("Failed to load blog post after create");
  }
  return created;
}

export async function updateBlogPost(
  id: number,
  input: UpdateBlogPostInput,
  audit?: PackageAuditContext
): Promise<BlogPostRecord | null> {
  const existing = await getBlogPostById(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      throw new Error("Blog title is required");
    }
    fields.push("title = ?");
    values.push(title);
  }

  if (input.slug !== undefined || input.title !== undefined) {
    const titleForSlug = input.title?.trim() ?? existing.title;
    const slug = await resolveBlogPostSlug(titleForSlug, input.slug ?? existing.slug, id);
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
  if (input.category_id !== undefined) {
    fields.push("category_id = ?");
    values.push(input.category_id);
  }
  if (input.author_name !== undefined) {
    fields.push("author_name = ?");
    values.push(input.author_name?.trim() || null);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.is_featured !== undefined) {
    fields.push("is_featured = ?");
    values.push(input.is_featured ? 1 : 0);
  }
  if (input.tags !== undefined) {
    fields.push("tags = ?");
    values.push(JSON.stringify(input.tags ?? []));
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
    assertScheduledHasPublishAt(nextStatus, publishedAt);
    fields.push("published_at = ?");
    values.push(publishedAt);
  } else {
    assertScheduledHasPublishAt(nextStatus, existing.published_at);
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
    `UPDATE ${POSTS_TABLE} SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return getBlogPostById(id);
}

export async function publishDueScheduledBlogPosts(): Promise<{
  publishedCount: number;
  publishedIds: number[];
}> {
  const dueRows = await query<RowDataPacket[]>(
    `SELECT id FROM ${POSTS_TABLE}
     WHERE status = 'scheduled'
       AND published_at IS NOT NULL
       AND published_at <= NOW()
     ORDER BY published_at ASC`
  );

  const publishedIds = dueRows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
  if (!publishedIds.length) {
    return { publishedCount: 0, publishedIds: [] };
  }

  const placeholders = publishedIds.map(() => "?").join(", ");
  await query<ResultSetHeader>(
    `UPDATE ${POSTS_TABLE}
     SET status = 'published',
         updated_by = 'system-scheduler'
     WHERE id IN (${placeholders})
       AND status = 'scheduled'`,
    publishedIds
  );

  return { publishedCount: publishedIds.length, publishedIds };
}

export async function deleteBlogPost(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(`DELETE FROM ${POSTS_TABLE} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}
