import type {
  CreateBlogPostInput,
  ListBlogPostsParams,
  ListBlogPostsResult,
  BlogPostRecord,
  BlogStats,
  UpdateBlogPostInput,
} from "./blog-types";
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

function buildQuery(params: ListBlogPostsParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.category_id) search.set("category_id", String(params.category_id));
  if (params.author_name) search.set("author_name", params.author_name);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.featuredOnly) search.set("featuredOnly", "true");
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listBlogPosts(
  params: ListBlogPostsParams = {}
): Promise<ListBlogPostsResult> {
  const response = await fetch(apiUrl(`/api/blogs${buildQuery(params)}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListBlogPostsResult>(response);
}

export async function getBlogStats(): Promise<BlogStats> {
  const response = await fetch(apiUrl("/api/blogs/stats"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<BlogStats>(response);
}

export async function listBlogAuthors(): Promise<string[]> {
  const response = await fetch(apiUrl("/api/blogs/authors"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  const result = await parseApiResponse<{ authors: string[] }>(response);
  return result.authors;
}

export async function getBlogPost(id: number) {
  const response = await fetch(apiUrl(`/api/blogs/${id}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ post: BlogPostRecord }>(response);
}

export async function createBlogPost(input: CreateBlogPostInput) {
  const response = await fetch(apiUrl("/api/blogs"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ post: BlogPostRecord }>(response);
}

export async function updateBlogPost(id: number, input: UpdateBlogPostInput) {
  const response = await fetch(apiUrl(`/api/blogs/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ post: BlogPostRecord }>(response);
}

export async function deleteBlogPost(id: number) {
  const response = await fetch(apiUrl(`/api/blogs/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}
