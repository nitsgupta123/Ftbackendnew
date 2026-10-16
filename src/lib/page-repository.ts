import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PackageAuditContext } from "./audit-context";
import { query, sqlLimit, sqlOffset } from "./db";
import { toIsoSgtOrNow } from "./format-date";
import { LEGACY_TABLES } from "./legacy-tables";
import { slugify, uniqueSlug } from "./slug";
import { loadUserNameMap, userLabel } from "./user-names";
import {
  deletePostExtras,
  getPostExtras,
  getPostExtrasMap,
  savePostExtras,
  type PostExtras,
} from "./post-extras-store";
import {
  deletePostDetails,
  newBlogId,
  POST_DETAILS_JOIN,
  upsertPostDetails as upsertPageDetails,
} from "./post-details-store";
import type {
  CmsPageRecord,
  CreatePageInput,
  ListPagesParams,
  ListPagesResult,
  PageStats,
  PageStatus,
  PageTypeOption,
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

/** Legacy rows hold `0000-00-00` post_date values, which mysql2 returns as Invalid Date or a zero string. */
function validDateValue(value: unknown): Date | string | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  if (!text || text.startsWith("0000-00-00")) return null;
  return text;
}

function parsePageRow(
  row: RowDataPacket,
  extras: PostExtras = {},
  userNames: Map<number, string> = new Map()
): CmsPageRecord {
  const created = toIso(row.insert_date);
  const updated = toIso(row.edit_date ?? row.insert_date);
  const status = mapStatus(row);
  const createdBy = userLabel(Number(row.user_id), userNames);
  const postDate = validDateValue(row.post_date) ?? validDateValue(row.insert_date);
  return {
    id: Number(row.id),
    title: String(row.post_title ?? ""),
    slug: String(row.post_url ?? ""),
    excerpt: extras.excerpt ?? null,
    content: row.post_content || null,
    featured_image_path: row.feature_img || null,
    page_type: row.post_template ? String(row.post_template) : null,
    status,
    show_in_nav: extras.show_in_nav === true,
    display_order: Number.isInteger(extras.display_order) ? Number(extras.display_order) : 0,
    published_at: status === "published" && postDate ? toIso(postDate) : null,
    seo_meta_title: row.meta_title || null,
    seo_meta_description: row.meta_discription || null,
    created_by: createdBy,
    updated_by: extras.updated_by ?? createdBy,
    created_at: created,
    updated_at: updated,
  };
}

const PAGE_SELECT = `
  SELECT p.*, d.meta_title, d.meta_discription, d.meta_keyword
  FROM ${POSTS_TABLE} p
  ${POST_DETAILS_JOIN}
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

/** Website templates registered in tbl_settings plus any template already used by a page. */
export async function listPageTypes(): Promise<PageTypeOption[]> {
  const templateRows = await query<RowDataPacket[]>(
    `SELECT setting_name, setting_value FROM ${LEGACY_TABLES.settings}
     WHERE setting_type = 'template' AND setting_value <> ''
     ORDER BY setting_name ASC`
  );
  const options = new Map<string, string>();
  for (const row of templateRows) {
    const value = String(row.setting_value).trim();
    if (value && !options.has(value)) options.set(value, String(row.setting_name || value).trim());
  }
  const usedRows = await query<RowDataPacket[]>(
    `SELECT DISTINCT post_template FROM ${POSTS_TABLE} WHERE post_type = ? AND post_template <> ''`,
    [PAGE_TYPE]
  );
  for (const row of usedRows) {
    const value = String(row.post_template).trim();
    if (value && !options.has(value)) options.set(value, value);
  }
  return [...options.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
  else if (status === "archived") conditions.push("p.is_draft = 0 AND p.post_status = 2");

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
  const sortOrder = order === "asc" ? "ASC" : "DESC";
  const safeLimit = sqlLimit(limit);
  const safePage = Math.max(page, 1);
  const offset = sqlOffset((safePage - 1) * safeLimit);

  if (sort === "display_order") {
    // display_order lives in tbl_settings, so this sort is applied after loading.
    const allRows = await query<RowDataPacket[]>(`${PAGE_SELECT} ${whereClause}`, values);
    const extrasMap = await getPostExtrasMap(allRows.map((row) => Number(row.id)));
    const userNames = await loadUserNameMap(allRows.map((row) => row.user_id));
    const direction = sortOrder === "ASC" ? 1 : -1;
    const sorted = allRows
      .map((row) => parsePageRow(row, extrasMap.get(Number(row.id)), userNames))
      .sort((a, b) => (a.display_order - b.display_order || a.id - b.id) * direction);
    return {
      pages: sorted.slice(offset, offset + safeLimit),
      total: sorted.length,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(sorted.length / safeLimit) || 1,
    };
  }

  const sortColumn =
    sort === "title"
      ? "p.post_title"
      : sort === "created_at"
        ? "p.insert_date"
        : sort === "published_at"
          ? "COALESCE(NULLIF(CAST(p.post_date AS CHAR), '0000-00-00'), DATE(p.insert_date))"
          : "p.id";

  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${POSTS_TABLE} p ${whereClause}`,
    values
  );
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await query<RowDataPacket[]>(
    `${PAGE_SELECT}
     ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}
     LIMIT ${safeLimit} OFFSET ${offset}`,
    values
  );

  const extrasMap = await getPostExtrasMap(rows.map((row) => Number(row.id)));
  const userNames = await loadUserNameMap(rows.map((row) => row.user_id));
  return {
    pages: rows.map((row) => parsePageRow(row, extrasMap.get(Number(row.id)), userNames)),
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
  return parsePageRow(rows[0], await getPostExtras(id), await loadUserNameMap([rows[0].user_id]));
}

function pageExtrasFromInput(input: UpdatePageInput): PostExtras {
  return {
    excerpt: input.excerpt !== undefined ? input.excerpt?.trim() || null : undefined,
    display_order: input.display_order,
    show_in_nav: input.show_in_nav,
  };
}

export async function getPageStats(): Promise<PageStats> {
  const rows = await query<RowDataPacket[]>(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN is_draft = 1 THEN 1 ELSE 0 END) AS draft,
      SUM(CASE WHEN is_draft = 0 AND post_status = 1 THEN 1 ELSE 0 END) AS published,
      SUM(CASE WHEN is_draft = 0 AND post_status = 2 THEN 1 ELSE 0 END) AS archived
     FROM ${POSTS_TABLE}
     WHERE post_type = ?`,
    [PAGE_TYPE]
  );
  const ids = await query<RowDataPacket[]>(
    `SELECT id FROM ${POSTS_TABLE} WHERE post_type = ?`,
    [PAGE_TYPE]
  );
  const extrasMap = await getPostExtrasMap(ids.map((r) => Number(r.id)));
  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    draft: Number(row.draft ?? 0),
    published: Number(row.published ?? 0),
    archived: Number(row.archived ?? 0),
    in_nav: [...extrasMap.values()].filter((extras) => extras.show_in_nav === true).length,
  };
}

export async function createPage(
  input: CreatePageInput,
  audit?: PackageAuditContext
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
      ?, ?, ?, ?, ?, 0, ?,
      0, 0, ?, 0, 0, 0, CURDATE(),
      NOW(), NOW(), 1, NULL, ?, ?,
      ?, 0, NULL, 0
    )`,
    [
      newBlogId(),
      PAGE_TYPE,
      title,
      slug,
      input.content ?? "",
      input.page_type?.trim() || "",
      input.featured_image_path?.trim() || "",
      cols.post_status,
      audit?.userId ?? 0,
      cols.is_draft,
    ]
  );

  await upsertPageDetails(
    result.insertId,
    input.seo_meta_title?.trim() || null,
    input.seo_meta_description?.trim() || null
  );
  await savePostExtras(result.insertId, {
    ...pageExtrasFromInput(input),
    updated_by: audit?.user ?? undefined,
  });

  const created = await getPageById(result.insertId);
  if (!created) throw new Error("Failed to load page after create");
  return created;
}

export async function updatePage(
  id: number,
  input: UpdatePageInput,
  audit?: PackageAuditContext
): Promise<CmsPageRecord | null> {
  const existing = await getPageById(id);
  if (!existing) return null;

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  if (!title) throw new Error("Page title is required");
  const slug =
    input.slug === undefined || input.slug === existing.slug
      ? existing.slug
      : await resolvePageSlug(title, input.slug, id);
  const status = input.status ?? existing.status;
  const cols = statusToColumns(status);
  const isNewlyPublished = status === "published" && existing.status !== "published";

  await query<ResultSetHeader>(
    `UPDATE ${POSTS_TABLE} SET
      post_title = ?,
      post_url = ?,
      post_content = ?,
      feature_img = ?,
      post_template = ?,
      post_status = ?,
      is_draft = ?,
      post_date = CASE WHEN ? = 1 THEN CURDATE() ELSE post_date END,
      edit_date = NOW()
     WHERE id = ? AND post_type = ?`,
    [
      title,
      slug,
      (input.content !== undefined ? input.content : existing.content) ?? "",
      (input.featured_image_path !== undefined
        ? input.featured_image_path?.trim() || null
        : existing.featured_image_path) ?? "",
      input.page_type !== undefined
        ? input.page_type?.trim() || ""
        : existing.page_type ?? "",
      cols.post_status,
      cols.is_draft,
      isNewlyPublished ? 1 : 0,
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

  await savePostExtras(id, {
    ...pageExtrasFromInput(input),
    updated_by: audit?.user ?? undefined,
  });
  return getPageById(id);
}

export async function deletePage(id: number): Promise<boolean> {
  if (!(await getPageById(id))) return false;
  await deletePostDetails(id);
  const result = await query<ResultSetHeader>(
    `DELETE FROM ${POSTS_TABLE} WHERE id = ? AND post_type = ?`,
    [id, PAGE_TYPE]
  );
  if (result.affectedRows > 0) await deletePostExtras(id);
  return result.affectedRows > 0;
}
