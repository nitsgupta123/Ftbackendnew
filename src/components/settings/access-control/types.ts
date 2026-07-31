"use client";

import type { AccessModuleDefinition, AccessModuleGroup } from "@/lib/permission-types";

export type PermissionKey =
  | "canView"
  | "canCreate"
  | "canEdit"
  | "canDelete"
  | "canApprove";

export type ExtendedPermission = {
  moduleKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
};

export type RoleMeta = {
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

export type ActivityItem = {
  id: string;
  actor: string;
  employee: string;
  permission: string;
  previousAccess: string;
  newAccess: string;
  createdAt: string;
};

export type EmployeeProfile = {
  designation: string;
  department: string;
  accessLevel: string;
};

export type EmployeeOverrides = Record<number, Record<string, ExtendedPermission>>;

export type ManageableUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
};

export type ModuleGroupSection = {
  group: AccessModuleGroup;
  title: string;
  description: string;
  modules: AccessModuleDefinition[];
};
