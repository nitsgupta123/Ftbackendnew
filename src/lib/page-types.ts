export type PageStatus = "draft" | "published" | "archived";

export interface CmsPageRecord {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image_path: string | null;
  page_type: string | null;
  status: PageStatus;
  show_in_nav: boolean;
  display_order: number;
  published_at: string | null;
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePageInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  featured_image_path?: string | null;
  page_type?: string | null;
  status?: PageStatus;
  show_in_nav?: boolean;
  display_order?: number;
  published_at?: string | null;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  featured_image_path?: string | null;
  page_type?: string | null;
  status?: PageStatus;
  show_in_nav?: boolean;
  display_order?: number;
  published_at?: string | null;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
}

export interface ListPagesParams {
  search?: string;
  status?: PageStatus | "all";
  page_type?: string;
  sort?: "published_at" | "created_at" | "title" | "display_order";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ListPagesResult {
  pages: CmsPageRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PageStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
  in_nav: number;
}

export const PAGE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export type PageStatusFilter = (typeof PAGE_STATUS_FILTER_OPTIONS)[number]["value"];

export const PAGE_SORT_OPTIONS = [
  { value: "display_order", label: "Display order" },
  { value: "published_at", label: "Published date" },
  { value: "created_at", label: "Created date" },
  { value: "title", label: "Title" },
] as const;

/** A website page template (tbl_post.post_template), sourced from tbl_settings 'template' rows. */
export interface PageTypeOption {
  value: string;
  label: string;
}
