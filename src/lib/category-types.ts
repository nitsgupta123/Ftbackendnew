export type CategoryStatus = "active" | "inactive";

export interface PackageCategoryRecord {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon_path: string | null;
  image_path: string | null;
  display_order: number;
  status: CategoryStatus;
  is_featured: boolean;
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  total_packages?: number;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  icon_path?: string | null;
  image_path?: string | null;
  display_order?: number;
  status?: CategoryStatus;
  is_featured?: boolean;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  icon_path?: string | null;
  image_path?: string | null;
  display_order?: number;
  status?: CategoryStatus;
  is_featured?: boolean;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
}

export interface ListCategoriesParams {
  search?: string;
  status?: CategoryStatus | "all";
  sort?: "display_order" | "created_at";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}

export interface ListCategoriesResult {
  categories: PackageCategoryRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const CATEGORY_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export type CategoryStatusFilter = (typeof CATEGORY_STATUS_FILTER_OPTIONS)[number]["value"];

export const CATEGORY_SORT_OPTIONS = [
  { value: "display_order", label: "Display order" },
  { value: "created_at", label: "Created date" },
] as const;
