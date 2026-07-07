import type {
  CreatePageInput,
  CmsPageRecord,
  ListPagesParams,
  ListPagesResult,
  PageStats,
  UpdatePageInput,
} from "./page-types";
import { AUDIT_USER_HEADER } from "./audit-context";
import { getStoredToken, getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

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

function buildQuery(params: ListPagesParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.page_type) search.set("page_type", params.page_type);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listPages(params: ListPagesParams = {}): Promise<ListPagesResult> {
  const response = await fetch(apiUrl(`/api/pages${buildQuery(params)}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListPagesResult>(response);
}

export async function getPageStats(): Promise<PageStats> {
  const response = await fetch(apiUrl("/api/pages/stats"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<PageStats>(response);
}

export async function getPage(id: number) {
  const response = await fetch(apiUrl(`/api/pages/${id}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ page: CmsPageRecord }>(response);
}

export async function createPage(input: CreatePageInput) {
  const response = await fetch(apiUrl("/api/pages"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ page: CmsPageRecord }>(response);
}

export async function updatePage(id: number, input: UpdatePageInput) {
  const response = await fetch(apiUrl(`/api/pages/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ page: CmsPageRecord }>(response);
}

export async function deletePage(id: number) {
  const response = await fetch(apiUrl(`/api/pages/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}
