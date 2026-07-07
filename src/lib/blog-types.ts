export type BlogPostStatus = "draft" | "published" | "archived";

export interface BlogPostRecord {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image_path: string | null;
  category_id: number | null;
  category_name?: string | null;
  author_name: string | null;
  status: BlogPostStatus;
  is_featured: boolean;
  published_at: string | null;
  tags: string[];
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  featured_image_path?: string | null;
  category_id?: number | null;
  author_name?: string | null;
  status?: BlogPostStatus;
  is_featured?: boolean;
  published_at?: string | null;
  tags?: string[];
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
}

export interface UpdateBlogPostInput {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  featured_image_path?: string | null;
  category_id?: number | null;
  author_name?: string | null;
  status?: BlogPostStatus;
  is_featured?: boolean;
  published_at?: string | null;
  tags?: string[];
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
}

export interface ListBlogPostsParams {
  search?: string;
  status?: BlogPostStatus | "all";
  category_id?: number;
  sort?: "published_at" | "created_at" | "title";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  featuredOnly?: boolean;
}

export interface ListBlogPostsResult {
  posts: BlogPostRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BlogStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
  featured: number;
}

export const BLOG_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export type BlogStatusFilter = (typeof BLOG_STATUS_FILTER_OPTIONS)[number]["value"];

export const BLOG_SORT_OPTIONS = [
  { value: "published_at", label: "Published date" },
  { value: "created_at", label: "Created date" },
  { value: "title", label: "Title" },
] as const;
