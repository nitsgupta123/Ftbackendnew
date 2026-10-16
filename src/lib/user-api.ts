import type { AdminUser } from "./auth-types";
import { parseApiResponse } from "./parse-api-response";
import type {
  AdminUserStats,
  ListUsersParams,
  ListUsersResult,
} from "./user-types";
import type { CreateUserFormValues, UpdateUserFormValues } from "./auth-validation";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function requestHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function buildQuery(params: ListUsersParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.role) search.set("role", params.role);
  if (params.status) search.set("status", params.status);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getUserStats(): Promise<{ stats: AdminUserStats }> {
  const response = await fetch(apiUrl("/api/users/stats"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ stats: AdminUserStats }>(response);
}

export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const response = await fetch(apiUrl(`/api/users${buildQuery(params)}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListUsersResult>(response);
}

/** The API caps page size at 100, so screens that need every user page through. */
export async function listAllUsers(
  params: Omit<ListUsersParams, "page" | "limit"> = {}
): Promise<ListUsersResult> {
  const limit = 100;
  const first = await listUsers({ ...params, page: 1, limit });
  const users = [...first.users];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await listUsers({ ...params, page, limit });
    users.push(...next.users);
  }
  return { ...first, users, page: 1, limit: users.length, totalPages: 1 };
}

export async function createUser(
  input: CreateUserFormValues
): Promise<{
  status: "pending_verification" | "created";
  email: string;
  role: string;
  message: string;
  previewUrl?: string;
  mailMode?: string;
  user?: AdminUser;
}> {
  const response = await fetch(apiUrl("/api/users"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{
    status: "pending_verification" | "created";
    email: string;
    role: string;
    message: string;
    previewUrl?: string;
    mailMode?: string;
    user?: AdminUser;
  }>(response);
}

export async function updateUser(
  id: number,
  input: UpdateUserFormValues
): Promise<{ user: AdminUser }> {
  const response = await fetch(apiUrl(`/api/users/${id}`), {
    method: "PATCH",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ user: AdminUser }>(response);
}

export async function deleteUser(id: number): Promise<{ success: boolean }> {
  const response = await fetch(apiUrl(`/api/users/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ success: boolean }>(response);
}
