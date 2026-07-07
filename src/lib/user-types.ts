import type { AdminRole, AdminUser } from "./auth-types";

export type UserStatusFilter = "all" | "active" | "inactive";
export type UserRoleFilter = "all" | AdminRole;
export type UserSortField = "created_at" | "full_name" | "last_login_at";

export interface ListUsersParams {
  search?: string;
  role?: UserRoleFilter;
  status?: UserStatusFilter;
  sort?: UserSortField;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ListUsersResult {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserStats {
  total: number;
  active: number;
  inactive: number;
  superAdmins: number;
  recentlyActive: number;
}

export const USER_STATUS_FILTER_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const USER_ROLE_FILTER_OPTIONS: { value: UserRoleFilter; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export const USER_SORT_OPTIONS: { value: UserSortField; label: string }[] = [
  { value: "created_at", label: "Date created" },
  { value: "full_name", label: "Name" },
  { value: "last_login_at", label: "Last login" },
];

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
};
