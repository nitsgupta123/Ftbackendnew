export type BlogCategoryStatus = "active" | "inactive";

export interface BlogCategoryRecord {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  status: BlogCategoryStatus;
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  total_posts?: number;
}

export interface CreateBlogCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  display_order?: number;
  status?: BlogCategoryStatus;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
}

export interface UpdateBlogCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  display_order?: number;
  status?: BlogCategoryStatus;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
}

export interface ListBlogCategoriesParams {
  search?: string;
  status?: BlogCategoryStatus | "all";
  sort?: "display_order" | "created_at";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}

export interface ListBlogCategoriesResult {
  categories: BlogCategoryRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const BLOG_CATEGORY_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export type BlogCategoryStatusFilter =
  (typeof BLOG_CATEGORY_STATUS_FILTER_OPTIONS)[number]["value"];

export const BLOG_CATEGORY_SORT_OPTIONS = [
  { value: "display_order", label: "Display order" },
  { value: "created_at", label: "Created date" },
] as const;
