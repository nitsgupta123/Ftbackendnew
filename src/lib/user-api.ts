import type { AdminUser } from "./auth-types";
import { getStoredToken } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";
import type {
  AdminUserStats,
  ListUsersParams,
  ListUsersResult,
} from "./user-types";
import type { CreateUserFormValues, UpdateUserFormValues } from "./auth-validation";

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

export async function createUser(
  input: CreateUserFormValues
): Promise<{
  status: "pending_verification";
  email: string;
  role: string;
  message: string;
  previewUrl?: string;
  mailMode?: string;
}> {
  const response = await fetch(apiUrl("/api/users"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{
    status: "pending_verification";
    email: string;
    role: string;
    message: string;
    previewUrl?: string;
    mailMode?: string;
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
