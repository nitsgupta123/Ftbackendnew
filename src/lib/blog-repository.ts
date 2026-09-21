import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query, sqlLimit, sqlOffset } from "./db";
import { nowIsoSgt, nowMysqlDateTimeSgt, toIsoSgt, toValidDate } from "./format-date";
import { LEGACY_TABLES } from "./legacy-tables";
import { slugify, uniqueSlug } from "./slug";
import type {
  BlogPostRecord,
  BlogPostStatus,
  BlogStats,
  CreateBlogPostInput,
  ListBlogPostsParams,
  ListBlogPostsResult,
  UpdateBlogPostInput,
} from "./blog-types";

const POSTS_TABLE = LEGACY_TABLES.posts;
const DETAILS_TABLE = LEGACY_TABLES.postDetails;
const CATEGORIES_TABLE = LEGACY_TABLES.categories;

function toIso(value: unknown): string | null {
  if (!value) return null;
  return toIsoSgt(value instanceof Date || typeof value === "string" ? value : String(value));
}

function mapStatus(row: RowDataPacket): BlogPostStatus {
  if (Number(row.is_auto_scheduled) === 1 && Number(row.is_auto_scheduled_posted) !== 1) {
    return "scheduled";
  }
  if (Number(row.is_draft) === 1) return "draft";
  if (Number(row.post_status) === 2) return "archived";
  if (Number(row.post_status) === 1) return "published";
  return "draft";
}

function statusToColumns(status: BlogPostStatus, publishedAt: string | null): {
  is_draft: number;
  post_status: number;
  is_auto_scheduled: number;
  auto_schedule_date: string | null;
} {
  if (status === "scheduled") {
    return {
      is_draft: 1,
      post_status: 10,
      is_auto_scheduled: 1,
      auto_schedule_date: publishedAt ? publishedAt.slice(0, 10) : null,
    };
  }
  if (status === "published") {
    return { is_draft: 0, post_status: 1, is_auto_scheduled: 0, auto_schedule_date: null };
  }
  if (status === "archived") {
    return { is_draft: 0, post_status: 2, is_auto_scheduled: 0, auto_schedule_date: null };
  }
  return { is_draft: 1, post_status: 10, is_auto_scheduled: 0, auto_schedule_date: null };
}

function parseRelatedPackageIds(value: unknown): number[] {
  if (!value) return [];
  let raw: unknown[] = [];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      raw = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [
    ...new Set(
      raw
        .map((item) => (typeof item === "number" ? item : Number(item)))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
}

function parsePostRow(row: RowDataPacket): BlogPostRecord {
  const created = toIso(row.insert_date) ?? nowIsoSgt();
  const updated = toIso(row.edit_date) ?? created;
  const published = toIso(row.post_date) ?? toIso(row.auto_schedule_date);
  return {
    id: Number(row.id),
    title: String(row.post_title ?? ""),
    slug: String(row.post_url ?? ""),
    excerpt: null,
    content: row.post_content ?? null,
    featured_image_path: row.feature_img ?? null,
    category_id: row.post_cat ? Number(row.post_cat) : null,
    category_name: row.category_name ?? null,
    author_name: null,
    status: mapStatus(row),
    is_featured: Number(row.sale_page) === 1,
    published_at: published,
    tags: [],
    related_package_ids: [],
    seo_meta_title: row.meta_title ?? null,
    seo_meta_description: row.meta_discription ?? null,
    created_by: null,
    updated_by: null,
    created_at: created,
    updated_at: updated,
  };
}

const POST_SELECT = `
  SELECT p.*,
         c.cat_title AS category_name,
         d.meta_title, d.meta_discription, d.meta_keyword
  FROM ${POSTS_TABLE} p
  LEFT JOIN ${CATEGORIES_TABLE} c ON c.id = p.post_cat
  LEFT JOIN ${DETAILS_TABLE} d ON d.post_id = p.id
`;

async function listExistingSlugs(excludeId?: number): Promise<string[]> {
  const sql = excludeId
    ? `SELECT post_url AS slug FROM ${POSTS_TABLE} WHERE id != ? AND post_type = 'article'`
    : `SELECT post_url AS slug FROM ${POSTS_TABLE} WHERE post_type = 'article'`;
  const params = excludeId ? [excludeId] : [];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.map((r) => String(r.slug));
}

export async function resolveBlogPostSlug(
  title: string,
  requestedSlug?: string,
  excludeId?: number
): Promise<string> {
  const base = requestedSlug?.trim() ? slugify(requestedSlug) : slugify(title);
  if (!base) throw new Error("Unable to generate a valid slug");
  const existing = await listExistingSlugs(excludeId);
  if (!existing.includes(base)) return base;
  return uniqueSlug(base, existing);
}

function statusWhere(status: string): { sql: string; values: number[] } | null {
  if (status === "all") return null;
  if (status === "draft") return { sql: "p.is_draft = 1 AND IFNULL(p.is_auto_scheduled,0) = 0", values: [] };
  if (status === "published") return { sql: "p.is_draft = 0 AND p.post_status = 1", values: [] };
  if (status === "archived") return { sql: "p.post_status = 2", values: [] };
  if (status === "scheduled") {
    return { sql: "p.is_auto_scheduled = 1 AND IFNULL(p.is_auto_scheduled_posted,0) = 0", values: [] };
  }
  if (status === "pending_review") return { sql: "p.is_draft = 1 AND p.post_status = 10", values: [] };
  return null;
}

export async function listBlogPosts(
  params: ListBlogPostsParams = {}
): Promise<ListBlogPostsResult> {
  const {
    search,
    status = "all",
    category_id,
    sort = "published_at",
    order = "desc",
    page = 1,
    limit = 20,
    featuredOnly = false,
  } = params;

  const conditions: string[] = ["p.post_type = 'article'"];
  const values: (string | number)[] = [];

  const statusFilter = statusWhere(status);
  if (statusFilter) conditions.push(statusFilter.sql);

  if (category_id) {
    conditions.push("p.post_cat = ?");
    values.push(category_id);
  }
  if (featuredOnly) conditions.push("p.sale_page = 1");
  if (search?.trim()) {
    conditions.push("(p.post_title LIKE ? OR p.post_content LIKE ? OR p.post_url LIKE ?)");
    const term = `%${search.trim()}%`;
    values.push(term, term, term);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sortColumn =
    sort === "title"
      ? "p.post_title"
      : sort === "created_at"
        ? "p.insert_date"
        : "COALESCE(p.post_date, p.insert_date)";
  const sortOrder = order === "asc" ? "ASC" : "DESC";

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${POSTS_TABLE} p ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);
  const safeLimit = sqlLimit(limit);
  const safePage = Math.max(page, 1);
  const offset = sqlOffset((safePage - 1) * safeLimit);

  const rows = await query<RowDataPacket[]>(
    `${POST_SELECT}
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}, p.edit_date DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    values
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
  const rows = await query<RowDataPacket[]>(
    `${POST_SELECT} WHERE p.id = ? AND p.post_type = 'article' LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return parsePostRow(rows[0]);
}

export async function listBlogAuthors(): Promise<string[]> {
  return [];
}

export async function getBlogStats(): Promise<BlogStats> {
  const rows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN is_draft = 1 AND IFNULL(is_auto_scheduled,0) = 0 THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN is_draft = 1 AND post_status = 10 THEN 1 ELSE 0 END) AS pending_review,
      SUM(CASE WHEN is_auto_scheduled = 1 AND IFNULL(is_auto_scheduled_posted,0) = 0 THEN 1 ELSE 0 END) AS scheduled,
      SUM(CASE WHEN is_draft = 0 AND post_status = 1 THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN post_status = 2 THEN 1 ELSE 0 END) AS archived,
      SUM(CASE WHEN sale_page = 1 THEN 1 ELSE 0 END) AS featured
     FROM ${POSTS_TABLE}
     WHERE post_type = 'article'`
  );
  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    draft: Number(row.draft ?? 0),
    pending_review: Number(row.pending_review ?? 0),
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

function isFuturePublishAt(publishedAt: string | null | undefined): boolean {
  const date = toValidDate(publishedAt);
  if (!date) return false;
  return date.getTime() > Date.now();
}

function resolveBlogPostStatus(
  status: string | undefined,
  publishedAt: string | null | undefined
): BlogPostStatus {
  const resolved = (status ?? "draft") as BlogPostStatus;
  if (resolved === "published" && isFuturePublishAt(publishedAt)) return "scheduled";
  return resolved;
}

function resolvePublishedAt(
  status: string | undefined,
  publishedAt: string | null | undefined,
  existingPublishedAt: string | null
): string | null {
  if (status === "scheduled") {
    return publishedAt || existingPublishedAt || null;
  }
  if (status === "published") {
    return publishedAt || existingPublishedAt || nowMysqlDateTimeSgt();
  }
  if (publishedAt !== undefined) return publishedAt ?? null;
  return existingPublishedAt;
}

async function upsertPostDetails(
  postId: number,
  metaTitle: string | null,
  metaDescription: string | null
): Promise<void> {
  const existing = await query<RowDataPacket[]>(
    `SELECT id FROM ${DETAILS_TABLE} WHERE post_id = ? LIMIT 1`,
    [postId]
  );
  if (existing[0]?.id) {
    await query(
      `UPDATE ${DETAILS_TABLE}
       SET meta_title = ?, meta_discription = ?, edit_date = NOW()
       WHERE post_id = ?`,
      [metaTitle, metaDescription, postId]
    );
    return;
  }
  await query(
    `INSERT INTO ${DETAILS_TABLE}
      (blog_id, post_id, meta_title, meta_discription, meta_keyword, banner_content, inset_date, edit_date)
     VALUES ('', ?, ?, ?, '', '', NOW(), NOW())`,
    [postId, metaTitle, metaDescription]
  );
}

export async function createBlogPost(
  input: CreateBlogPostInput,
  _audit?: PackageAuditContext
): Promise<BlogPostRecord> {
  const title = input.title.trim();
  if (!title) throw new Error("Blog title is required");

  const slug = await resolveBlogPostSlug(title, input.slug);
  const preliminaryStatus = input.status ?? "draft";
  const publishedAt = resolvePublishedAt(preliminaryStatus, input.published_at, null);
  const status = resolveBlogPostStatus(preliminaryStatus, publishedAt);
  assertScheduledHasPublishAt(status, publishedAt);
  const cols = statusToColumns(status, publishedAt);

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${POSTS_TABLE} (
      blog_id, post_type, post_title, post_url, post_content, post_parent, post_template,
      slider_option, dark_shade, feature_img, post_slider, sale_page, post_cat, post_date,
      insert_date, edit_date, content_display, breadcrumb, post_status, user_id,
      is_draft, is_auto_scheduled, auto_schedule_date, is_auto_scheduled_posted
    ) VALUES (
      '', 'article', ?, ?, ?, 0, '',
      0, 0, ?, 0, ?, ?, ?,
      NOW(), NOW(), 1, 1, ?, 0,
      ?, ?, ?, 0
    )`,
    [
      title,
      slug,
      input.content ?? null,
      input.featured_image_path?.trim() || null,
      input.is_featured ? 1 : 0,
      input.category_id ?? 0,
      publishedAt ? publishedAt.slice(0, 10) : null,
      cols.post_status,
      cols.is_draft,
      cols.is_auto_scheduled,
      cols.auto_schedule_date,
    ]
  );

  await upsertPostDetails(
    result.insertId,
    input.seo_meta_title?.trim() || null,
    input.seo_meta_description?.trim() || null
  );

  const created = await getBlogPostById(result.insertId);
  if (!created) throw new Error("Failed to load blog post after create");
  return created;
}

export async function updateBlogPost(
  id: number,
  input: UpdateBlogPostInput,
  _audit?: PackageAuditContext
): Promise<BlogPostRecord | null> {
  const existing = await getBlogPostById(id);
  if (!existing) return null;

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  if (!title) throw new Error("Blog title is required");
  const slug = await resolveBlogPostSlug(title, input.slug ?? existing.slug, id);

  const preliminaryStatus = input.status ?? existing.status;
  const publishedAt = resolvePublishedAt(
    preliminaryStatus,
    input.published_at !== undefined ? input.published_at : existing.published_at,
    existing.published_at
  );
  const status = resolveBlogPostStatus(preliminaryStatus, publishedAt);
  assertScheduledHasPublishAt(status, publishedAt);
  const cols = statusToColumns(status, publishedAt);

  await query<ResultSetHeader>(
    `UPDATE ${POSTS_TABLE} SET
      post_title = ?,
      post_url = ?,
      post_content = ?,
      feature_img = ?,
      sale_page = ?,
      post_cat = ?,
      post_date = ?,
      post_status = ?,
      is_draft = ?,
      is_auto_scheduled = ?,
      auto_schedule_date = ?,
      edit_date = NOW()
     WHERE id = ? AND post_type = 'article'`,
    [
      title,
      slug,
      input.content !== undefined ? input.content : existing.content,
      input.featured_image_path !== undefined
        ? input.featured_image_path?.trim() || null
        : existing.featured_image_path,
      input.is_featured !== undefined ? (input.is_featured ? 1 : 0) : existing.is_featured ? 1 : 0,
      input.category_id !== undefined ? input.category_id ?? 0 : existing.category_id ?? 0,
      publishedAt ? publishedAt.slice(0, 10) : null,
      cols.post_status,
      cols.is_draft,
      cols.is_auto_scheduled,
      cols.auto_schedule_date,
      id,
    ]
  );

  if (input.seo_meta_title !== undefined || input.seo_meta_description !== undefined) {
    await upsertPostDetails(
      id,
      input.seo_meta_title !== undefined
        ? input.seo_meta_title?.trim() || null
        : existing.seo_meta_title,
      input.seo_meta_description !== undefined
        ? input.seo_meta_description?.trim() || null
        : existing.seo_meta_description
    );
  }

  void parseRelatedPackageIds;
  return getBlogPostById(id);
}

export async function publishDueScheduledBlogPosts(): Promise<{
  publishedCount: number;
  publishedIds: number[];
}> {
  const dueRows = await query<RowDataPacket[]>(
    `SELECT id FROM ${POSTS_TABLE}
     WHERE post_type = 'article'
       AND is_auto_scheduled = 1
       AND IFNULL(is_auto_scheduled_posted, 0) = 0
       AND auto_schedule_date IS NOT NULL
       AND auto_schedule_date <= CURDATE()
     ORDER BY auto_schedule_date ASC`
  );

  const publishedIds = dueRows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
  if (!publishedIds.length) return { publishedCount: 0, publishedIds: [] };

  const placeholders = publishedIds.map(() => "?").join(", ");
  await query<ResultSetHeader>(
    `UPDATE ${POSTS_TABLE}
     SET is_draft = 0,
         post_status = 1,
         is_auto_scheduled_posted = 1,
         edit_date = NOW()
     WHERE id IN (${placeholders})`,
    publishedIds
  );

  return { publishedCount: publishedIds.length, publishedIds };
}

export async function deleteBlogPost(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `UPDATE ${POSTS_TABLE} SET post_status = 2, is_draft = 0, edit_date = NOW()
     WHERE id = ? AND post_type = 'article'`,
    [id]
  );
  return result.affectedRows > 0;
}
