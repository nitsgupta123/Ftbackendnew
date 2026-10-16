import type {
  CreateBlogCategoryInput,
  ListBlogCategoriesParams,
  ListBlogCategoriesResult,
  BlogCategoryRecord,
  UpdateBlogCategoryInput,
} from "./blog-category-types";
import { AUDIT_USER_HEADER } from "./audit-context";
import { getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function requestHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  const user = getStoredUser();
  if (user?.fullName) {
    headers[AUDIT_USER_HEADER] = user.fullName;
  }
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function buildQuery(params: ListBlogCategoriesParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.activeOnly) search.set("activeOnly", "true");
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listBlogCategories(
  params: ListBlogCategoriesParams = {}
): Promise<ListBlogCategoriesResult> {
  const response = await fetch(apiUrl(`/api/blog-categories${buildQuery(params)}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListBlogCategoriesResult>(response);
}

export async function getBlogCategory(id: number) {
  const response = await fetch(apiUrl(`/api/blog-categories/${id}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ category: BlogCategoryRecord }>(response);
}

export async function createBlogCategory(input: CreateBlogCategoryInput) {
  const response = await fetch(apiUrl("/api/blog-categories"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ category: BlogCategoryRecord }>(response);
}

export async function updateBlogCategory(id: number, input: UpdateBlogCategoryInput) {
  const response = await fetch(apiUrl(`/api/blog-categories/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ category: BlogCategoryRecord }>(response);
}

export async function deleteBlogCategory(id: number) {
  const response = await fetch(apiUrl(`/api/blog-categories/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}

export async function listActiveBlogCategories() {
  return listBlogCategories({ activeOnly: true, limit: 100, sort: "display_order", order: "asc" });
}
