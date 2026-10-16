import { getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";
import { AUDIT_USER_HEADER } from "./audit-context";
import type { AdminRole } from "./auth-types";
import type {
  ModulePermission,
  PermissionsPayload,
  RolePermissionMatrix,
  UpdateRolePermissionsInput,
} from "./permission-types";

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

export interface UserPermissionsPayload {
  userId: number;
  role: string;
  rolePermissions: ModulePermission[];
  overrides: ModulePermission[];
  effective: RolePermissionMatrix;
}

export async function getUserPermissions(
  userId: number
): Promise<UserPermissionsPayload> {
  const response = await fetch(apiUrl(`/api/permissions/users/${userId}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<UserPermissionsPayload>(response);
}

export async function updateUserPermissions(
  userId: number,
  permissions: ModulePermission[]
): Promise<UserPermissionsPayload> {
  const response = await fetch(apiUrl(`/api/permissions/users/${userId}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify({ permissions }),
  });
  return parseApiResponse<UserPermissionsPayload>(response);
}

export async function resetUserPermissions(
  userId: number
): Promise<UserPermissionsPayload> {
  const response = await fetch(apiUrl(`/api/permissions/users/${userId}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<UserPermissionsPayload>(response);
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

export async function renameRole(
  currentRole: AdminRole,
  nextRole: AdminRole
): Promise<{ matrix: RolePermissionMatrix }> {
  const response = await fetch(apiUrl(`/api/permissions/${currentRole}`), {
    method: "PATCH",
    headers: requestHeaders(true),
    body: JSON.stringify({ role: nextRole }),
  });
  return parseApiResponse<{ matrix: RolePermissionMatrix }>(response);
}

export async function deleteRole(
  role: AdminRole
): Promise<{ success: boolean; reassignedRole: AdminRole }> {
  const response = await fetch(apiUrl(`/api/permissions/${role}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ success: boolean; reassignedRole: AdminRole }>(response);
}

export type AccessRoleMeta = {
  key: string;
  description: string;
  department: string;
  designation: string;
  createdBy: string;
  createdByName?: string;
  createdDate: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
};

export type AccessEmployeeProfile = {
  designation: string;
  department: string;
  accessLevel: string;
};

export type AccessActivityItem = {
  id: string;
  actor: string;
  employee: string;
  permission: string;
  previousAccess: string;
  newAccess: string;
  createdAt: string;
};

export interface AccessMetaPayload {
  roleMeta: Record<string, AccessRoleMeta>;
  employeeProfiles: Record<string, AccessEmployeeProfile>;
  activity: AccessActivityItem[];
}

export async function getAccessMeta(): Promise<AccessMetaPayload> {
  const response = await fetch(apiUrl("/api/permissions/access-meta"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<AccessMetaPayload>(response);
}

export async function saveRoleMeta(
  role: string,
  input: { description: string; department: string; designation: string }
): Promise<{ meta: AccessRoleMeta }> {
  const response = await fetch(apiUrl(`/api/permissions/access-meta/roles/${role}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ meta: AccessRoleMeta }>(response);
}

export async function saveEmployeeProfile(
  userId: number,
  profile: AccessEmployeeProfile
): Promise<{ profile: AccessEmployeeProfile }> {
  const response = await fetch(apiUrl(`/api/permissions/access-meta/employees/${userId}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(profile),
  });
  return parseApiResponse<{ profile: AccessEmployeeProfile }>(response);
}

export async function recordAccessActivity(
  entries: Array<Omit<AccessActivityItem, "id" | "createdAt">>
): Promise<{ entries: AccessActivityItem[] }> {
  const response = await fetch(apiUrl("/api/permissions/access-meta/activity"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify({ entries }),
  });
  return parseApiResponse<{ entries: AccessActivityItem[] }>(response);
}

export type { ModulePermission, PermissionsPayload, RolePermissionMatrix };
