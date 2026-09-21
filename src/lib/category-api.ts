import type {
  CreateCategoryInput,
  ListCategoriesParams,
  ListCategoriesResult,
  PackageCategoryRecord,
  UpdateCategoryInput,
} from "./category-types";
import { AUDIT_USER_HEADER } from "./audit-context";
import { getStoredToken, getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function requestHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const user = getStoredUser();
  if (user?.fullName) {
    headers[AUDIT_USER_HEADER] = user.fullName;
  }
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function buildQuery(params: ListCategoriesParams): string {
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

export async function listCategories(
  params: ListCategoriesParams = {}
): Promise<ListCategoriesResult> {
  const response = await fetch(apiUrl(`/api/categories${buildQuery(params)}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListCategoriesResult>(response);
}

export async function getCategory(id: number) {
  const response = await fetch(apiUrl(`/api/categories/${id}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ category: PackageCategoryRecord }>(response);
}

export async function createCategory(input: CreateCategoryInput) {
  const response = await fetch(apiUrl("/api/categories"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ category: PackageCategoryRecord }>(response);
}

export async function updateCategory(id: number, input: UpdateCategoryInput) {
  const response = await fetch(apiUrl(`/api/categories/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ category: PackageCategoryRecord }>(response);
}

export async function deleteCategory(id: number) {
  const response = await fetch(apiUrl(`/api/categories/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}

export async function listActiveCategories() {
  return listCategories({ activeOnly: true, limit: 100, sort: "display_order", order: "asc" });
}
