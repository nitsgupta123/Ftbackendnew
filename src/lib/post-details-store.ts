import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query } from "./db";
import { LEGACY_TABLES } from "./legacy-tables";

const POSTS_TABLE = LEGACY_TABLES.posts;
const DETAILS_TABLE = LEGACY_TABLES.postDetails;

/**
 * tbl_post_details rows are linked by post_id (older CMS) or by tbl_post.blog_id with
 * post_id = 0 (newer CMS). Prefer the blog_id link, then the most recently edited row.
 */
export const POST_DETAILS_JOIN = `
  LEFT JOIN ${DETAILS_TABLE} d ON d.id = (
    SELECT d2.id FROM ${DETAILS_TABLE} d2
    WHERE d2.post_id = p.id OR (p.blog_id <> '' AND d2.blog_id = p.blog_id)
    ORDER BY (p.blog_id <> '' AND d2.blog_id = p.blog_id) DESC, d2.edit_date DESC, d2.id DESC
    LIMIT 1
  )
`;

export function newBlogId(): string {
  return randomUUID();
}

async function getBlogId(postId: number): Promise<string> {
  const rows = await query<RowDataPacket[]>(
    `SELECT blog_id FROM ${POSTS_TABLE} WHERE id = ? LIMIT 1`,
    [postId]
  );
  return String(rows[0]?.blog_id ?? "").trim();
}

/** Write SEO meta to every details row linked to the post, creating one if none exist. */
export async function upsertPostDetails(
  postId: number,
  metaTitle: string | null,
  metaDescription: string | null
): Promise<void> {
  const blogId = await getBlogId(postId);
  const result = await query<ResultSetHeader>(
    `UPDATE ${DETAILS_TABLE}
     SET meta_title = ?, meta_discription = ?, edit_date = NOW()
     WHERE post_id = ? OR (? <> '' AND blog_id = ?)`,
    [metaTitle ?? "", metaDescription ?? "", postId, blogId, blogId]
  );
  if (result.affectedRows > 0) return;

  const rows = await query<RowDataPacket[]>(
    `SELECT id FROM ${DETAILS_TABLE} WHERE post_id = ? OR (? <> '' AND blog_id = ?) LIMIT 1`,
    [postId, blogId, blogId]
  );
  if (rows.length) return;

  await query(
    `INSERT INTO ${DETAILS_TABLE}
      (blog_id, post_id, meta_title, meta_discription, meta_keyword, banner_content, inset_date, edit_date)
     VALUES (?, ?, ?, ?, '', '', NOW(), NOW())`,
    [blogId, postId, metaTitle ?? "", metaDescription ?? ""]
  );
}

/** Remove details rows for a post; call before deleting the tbl_post row. */
export async function deletePostDetails(postId: number): Promise<void> {
  const blogId = await getBlogId(postId);
  await query(
    `DELETE FROM ${DETAILS_TABLE} WHERE post_id = ? OR (? <> '' AND blog_id = ?)`,
    [postId, blogId, blogId]
  );
}
