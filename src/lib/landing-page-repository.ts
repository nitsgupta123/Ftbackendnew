import type { RowDataPacket } from "mysql2";
import { query } from "./db";

const LEGACY_DB = process.env.LEGACY_DB_NAME ?? "fz";

/** Public-site page templates that merchandise packages (Deals, sales, luxury). */
const LANDING_TEMPLATES = [
  "short-break",
  "hot-deals",
  "sales-template",
  "luxury",
  "national-day-special",
] as const;

export interface WebsiteLandingPage {
  id: number;
  title: string;
  slug: string;
}

/** Live landing pages from the master site (`tbl_post` pages), same source as fayyaz.travel. */
export async function listWebsiteLandingPages(): Promise<WebsiteLandingPage[]> {
  const placeholders = LANDING_TEMPLATES.map(() => "?").join(", ");
  const rows = await query<RowDataPacket[]>(
    `SELECT id, post_title, post_url
     FROM ${LEGACY_DB}.tbl_post
     WHERE post_type = 'pages'
       AND post_status = 1
       AND is_draft = 0
       AND post_template IN (${placeholders})
       AND post_url IS NOT NULL
       AND post_url <> ''
     ORDER BY post_title ASC, id ASC`,
    [...LANDING_TEMPLATES]
  );

  const seen = new Set<string>();
  const pages: WebsiteLandingPage[] = [];
  for (const row of rows) {
    const slug = String(row.post_url).trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    pages.push({
      id: Number(row.id),
      title: String(row.post_title ?? slug).trim() || slug,
      slug,
    });
  }
  return pages;
}
