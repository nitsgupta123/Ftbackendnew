import { getStoredToken, getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";
import { AUDIT_USER_HEADER } from "./audit-context";
import type { AdminRole } from "./auth-types";
import type {
  ModulePermission,
  PermissionsPayload,
  RolePermissionMatrix,
  UpdateRolePermissionsInput,
} from "./permission-types";

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

export async function getPermissions(): Promise<PermissionsPayload> {
  const response = await fetch(apiUrl("/api/permissions"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<PermissionsPayload>(response);
}

export async function getMyPermissions(): Promise<{ matrix: RolePermissionMatrix }> {
  const response = await fetch(apiUrl("/api/permissions/me"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ matrix: RolePermissionMatrix }>(response);
}

export async function updateRolePermissions(
  role: AdminRole,
  input: UpdateRolePermissionsInput
): Promise<{ matrix: RolePermissionMatrix }> {
  const response = await fetch(apiUrl(`/api/permissions/${role}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ matrix: RolePermissionMatrix }>(response);
}

export async function resetRolePermissions(
  role: AdminRole
): Promise<{ matrix: RolePermissionMatrix }> {
  const response = await fetch(apiUrl(`/api/permissions/${role}/reset`), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify({}),
  });
  return parseApiResponse<{ matrix: RolePermissionMatrix }>(response);
}

export type { ModulePermission, PermissionsPayload, RolePermissionMatrix };
