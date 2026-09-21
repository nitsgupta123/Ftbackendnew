import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query, sqlLimit, sqlOffset } from "./db";
import { toIsoSgtOrNow } from "./format-date";
import { LEGACY_TABLES } from "./legacy-tables";
import { slugify, uniqueSlug } from "./slug";
import type {
  CmsPageRecord,
  CreatePageInput,
  ListPagesParams,
  ListPagesResult,
  PageStats,
  PageStatus,
  UpdatePageInput,
} from "./page-types";

const POSTS_TABLE = LEGACY_TABLES.posts;
const DETAILS_TABLE = LEGACY_TABLES.postDetails;
const PAGE_TYPE = "pages";

function toIso(value: unknown): string {
  return toIsoSgtOrNow(
    value instanceof Date || typeof value === "string" ? value : value != null ? String(value) : null
  );
}

function mapStatus(row: RowDataPacket): PageStatus {
  if (Number(row.is_draft) === 1) return "draft";
  if (Number(row.post_status) === 2) return "archived";
  if (Number(row.post_status) === 1) return "published";
  return "draft";
}

function statusToColumns(status: PageStatus | undefined): {
  is_draft: number;
  post_status: number;
} {
  if (status === "published") return { is_draft: 0, post_status: 1 };
  if (status === "archived") return { is_draft: 0, post_status: 2 };
  return { is_draft: 1, post_status: 10 };
}

function parsePageRow(row: RowDataPacket): CmsPageRecord {
  const created = toIso(row.insert_date);
  const updated = toIso(row.edit_date ?? row.insert_date);
  const status = mapStatus(row);
  return {
    id: Number(row.id),
    title: String(row.post_title ?? ""),
    slug: String(row.post_url ?? ""),
    excerpt: null,
    content: row.post_content ?? null,
    featured_image_path: row.feature_img ?? null,
    page_type: row.post_template ? String(row.post_template) : null,
    status,
    show_in_nav: Number(row.breadcrumb) === 1,
    display_order: Number(row.id),
    published_at: status === "published" ? toIso(row.post_date ?? row.insert_date) : null,
    seo_meta_title: row.meta_title ?? null,
    seo_meta_description: row.meta_discription ?? null,
    created_by: null,
    updated_by: null,
    created_at: created,
    updated_at: updated,
  };
}

const PAGE_SELECT = `
  SELECT p.*, d.meta_title, d.meta_discription, d.meta_keyword
  FROM ${POSTS_TABLE} p
  LEFT JOIN ${DETAILS_TABLE} d ON d.post_id = p.id
`;

async function listExistingSlugs(excludeId?: number): Promise<string[]> {
  const sql = excludeId
    ? `SELECT post_url AS slug FROM ${POSTS_TABLE} WHERE post_type = ? AND id != ?`
    : `SELECT post_url AS slug FROM ${POSTS_TABLE} WHERE post_type = ?`;
  const params = excludeId ? [PAGE_TYPE, excludeId] : [PAGE_TYPE];
  const rows = await query<RowDataPacket[]>(sql, params);
  return rows.map((r) => String(r.slug));
}

export async function resolvePageSlug(
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

  const conditions: string[] = ["p.post_type = ?"];
  const values: (string | number)[] = [PAGE_TYPE];

  if (status === "draft") conditions.push("p.is_draft = 1");
  else if (status === "published") conditions.push("p.is_draft = 0 AND p.post_status = 1");
  else if (status === "archived") conditions.push("p.post_status = 2");

  if (page_type?.trim()) {
    conditions.push("p.post_template = ?");
    values.push(page_type.trim());
  }

  if (search?.trim()) {
    conditions.push("(p.post_title LIKE ? OR p.post_url LIKE ? OR p.post_content LIKE ?)");
    const term = `%${search.trim()}%`;
    values.push(term, term, term);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const sortColumn =
    sort === "title"
      ? "p.post_title"
      : sort === "created_at" || sort === "published_at"
        ? "p.insert_date"
        : "p.id";
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
    `${PAGE_SELECT}
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}
     LIMIT ${safeLimit} OFFSET ${offset}`,
    values
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
  const rows = await query<RowDataPacket[]>(
    `${PAGE_SELECT} WHERE p.id = ? AND p.post_type = ? LIMIT 1`,
    [id, PAGE_TYPE]
  );
  if (!rows.length) return null;
  return parsePageRow(rows[0]);
}

export async function getPageStats(): Promise<PageStats> {
  const rows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN is_draft = 1 THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN is_draft = 0 AND post_status = 1 THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN post_status = 2 THEN 1 ELSE 0 END) AS archived,
      SUM(CASE WHEN breadcrumb = 1 THEN 1 ELSE 0 END) AS in_nav
     FROM ${POSTS_TABLE}
     WHERE post_type = ?`,
    [PAGE_TYPE]
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

async function upsertPageDetails(
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

export async function createPage(
  input: CreatePageInput,
  _audit?: PackageAuditContext
): Promise<CmsPageRecord> {
  const title = input.title.trim();
  if (!title) throw new Error("Page title is required");
  const slug = await resolvePageSlug(title, input.slug);
  const status = input.status ?? "draft";
  const cols = statusToColumns(status);

  const result = await query<ResultSetHeader>(
    `INSERT INTO ${POSTS_TABLE} (
      blog_id, post_type, post_title, post_url, post_content, post_parent, post_template,
      slider_option, dark_shade, feature_img, post_slider, sale_page, post_cat, post_date,
      insert_date, edit_date, content_display, breadcrumb, post_status, user_id,
      is_draft, is_auto_scheduled, auto_schedule_date, is_auto_scheduled_posted
    ) VALUES (
      '', ?, ?, ?, ?, 0, ?,
      0, 0, ?, 0, 0, 0, CURDATE(),
      NOW(), NOW(), 1, ?, ?, 0,
      ?, 0, NULL, 0
    )`,
    [
      PAGE_TYPE,
      title,
      slug,
      input.content ?? null,
      input.page_type?.trim() || "",
      input.featured_image_path?.trim() || null,
      input.show_in_nav === false ? 0 : 1,
      cols.post_status,
      cols.is_draft,
    ]
  );

  await upsertPageDetails(
    result.insertId,
    input.seo_meta_title?.trim() || null,
    input.seo_meta_description?.trim() || null
  );

  const created = await getPageById(result.insertId);
  if (!created) throw new Error("Failed to load page after create");
  return created;
}

export async function updatePage(
  id: number,
  input: UpdatePageInput,
  _audit?: PackageAuditContext
): Promise<CmsPageRecord | null> {
  const existing = await getPageById(id);
  if (!existing) return null;

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  if (!title) throw new Error("Page title is required");
  const slug = await resolvePageSlug(title, input.slug ?? existing.slug, id);
  const status = input.status ?? existing.status;
  const cols = statusToColumns(status);

  await query<ResultSetHeader>(
    `UPDATE ${POSTS_TABLE} SET
      post_title = ?,
      post_url = ?,
      post_content = ?,
      feature_img = ?,
      post_template = ?,
      breadcrumb = ?,
      post_status = ?,
      is_draft = ?,
      edit_date = NOW()
     WHERE id = ? AND post_type = ?`,
    [
      title,
      slug,
      input.content !== undefined ? input.content : existing.content,
      input.featured_image_path !== undefined
        ? input.featured_image_path?.trim() || null
        : existing.featured_image_path,
      input.page_type !== undefined
        ? input.page_type?.trim() || ""
        : existing.page_type ?? "",
      input.show_in_nav !== undefined
        ? input.show_in_nav
          ? 1
          : 0
        : existing.show_in_nav
          ? 1
          : 0,
      cols.post_status,
      cols.is_draft,
      id,
      PAGE_TYPE,
    ]
  );

  if (input.seo_meta_title !== undefined || input.seo_meta_description !== undefined) {
    await upsertPageDetails(
      id,
      input.seo_meta_title !== undefined
        ? input.seo_meta_title?.trim() || null
        : existing.seo_meta_title,
      input.seo_meta_description !== undefined
        ? input.seo_meta_description?.trim() || null
        : existing.seo_meta_description
    );
  }

  return getPageById(id);
}

export async function deletePage(id: number): Promise<boolean> {
  const result = await query<ResultSetHeader>(
    `UPDATE ${POSTS_TABLE}
     SET post_status = 2, is_draft = 0, edit_date = NOW()
     WHERE id = ? AND post_type = ?`,
    [id, PAGE_TYPE]
  );
  return result.affectedRows > 0;
}
