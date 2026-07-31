"use client";

import { useEffect, useMemo, useState } from "react";
import { updateUser } from "@/lib/user-api";
import { formatRoleLabel } from "@/lib/user-types";
import type {
  ActivityItem,
  EmployeeOverrides,
  EmployeeProfile,
  ExtendedPermission,
  ManageableUser,
  PermissionKey,
} from "./types";

const LOCAL_STORAGE_EMPLOYEE_PROFILES = "ftadmin-employee-profiles-v1";
const LOCAL_STORAGE_EMPLOYEE_OVERRIDES = "ftadmin-employee-overrides-v1";

function readLocalStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type UseEmployeeOverridesArgs = {
  canManage: boolean;
  allUsers: ManageableUser[];
  rolePermissions: Record<string, ExtendedPermission[]>;
  fallbackPermissions: ExtendedPermission[];
  defaultProfiles: Record<string, EmployeeProfile>;
  currentUserName?: string;
  onPushActivity: (entry: Omit<ActivityItem, "id" | "createdAt">) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onUsersUpdated: (next: ManageableUser[]) => void;
};

export function useEmployeeOverrides({
  canManage,
  allUsers,
  rolePermissions,
  fallbackPermissions,
  defaultProfiles,
  currentUserName,
  onPushActivity,
  onError,
  onSuccess,
  onUsersUpdated,
}: UseEmployeeOverridesArgs) {
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<number, EmployeeProfile>>(() =>
    readLocalStorageJson<Record<number, EmployeeProfile>>(LOCAL_STORAGE_EMPLOYEE_PROFILES, {})
  );
  const [employeeOverrides, setEmployeeOverrides] = useState<EmployeeOverrides>(() =>
    readLocalStorageJson<EmployeeOverrides>(LOCAL_STORAGE_EMPLOYEE_OVERRIDES, {})
  );
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [manageAccessUserId, setManageAccessUserId] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_EMPLOYEE_PROFILES, JSON.stringify(employeeProfiles));
  }, [employeeProfiles]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_EMPLOYEE_OVERRIDES, JSON.stringify(employeeOverrides));
  }, [employeeOverrides]);

  const hydrateDefaultProfilesForUsers = (users: ManageableUser[]) => {
    setEmployeeProfiles((prev) => {
      const next = { ...prev };
      for (const userRow of users) {
        if (next[userRow.id]) continue;
        const key = userRow.fullName.trim().toLowerCase();
        next[userRow.id] = defaultProfiles[key] ?? {
          designation: "Executive",
          department: "Operations",
          accessLevel: "Standard",
        };
      }
      return next;
    });
  };

  const departmentOptions = useMemo(() => {
    const deps = new Set<string>(["all"]);
    for (const profile of Object.values(employeeProfiles)) {
      deps.add(profile.department);
    }
    return Array.from(deps);
  }, [employeeProfiles]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter((userRow) => {
      const profile = employeeProfiles[userRow.id];
      if (roleFilter !== "all" && userRow.role !== roleFilter) return false;
      if (departmentFilter !== "all" && profile?.department !== departmentFilter) return false;
      if (statusFilter === "active" && !userRow.isActive) return false;
      if (statusFilter === "inactive" && userRow.isActive) return false;
      if (!q) return true;
      return (
        userRow.fullName.toLowerCase().includes(q) ||
        userRow.email.toLowerCase().includes(q) ||
        (profile?.designation ?? "").toLowerCase().includes(q) ||
        (profile?.department ?? "").toLowerCase().includes(q)
      );
    });
  }, [allUsers, departmentFilter, employeeProfiles, roleFilter, search, statusFilter]);

  const selectedEmployee = useMemo(
    () => allUsers.find((userRow) => userRow.id === manageAccessUserId) ?? null,
    [allUsers, manageAccessUserId]
  );

  const selectedEmployeeOverrides = useMemo(
    () => (selectedEmployee ? employeeOverrides[selectedEmployee.id] ?? {} : {}),
    [employeeOverrides, selectedEmployee]
  );

  const selectedEmployeeHasOverrides = useMemo(
    () => Object.keys(selectedEmployeeOverrides).length > 0,
    [selectedEmployeeOverrides]
  );

  const updateEmployeeProfile = (userId: number, patch: Partial<EmployeeProfile>) => {
    if (!canManage) return;
    setEmployeeProfiles((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? defaultProfiles.neetu), ...patch },
    }));
  };

  const updateEmployeeRole = async (userId: number, nextRole: string) => {
    if (!canManage) return;
    const target = allUsers.find((userRow) => userRow.id === userId);
    if (!target) return;
    try {
      await updateUser(target.id, {
        fullName: target.fullName,
        role: nextRole,
        isActive: target.isActive,
      });
      onUsersUpdated(allUsers.map((row) => (row.id === userId ? { ...row, role: nextRole } : row)));
      onPushActivity({
        actor: currentUserName ?? "Super Admin",
        employee: target.fullName,
        permission: "Assigned Role",
        previousAccess: formatRoleLabel(target.role),
        newAccess: formatRoleLabel(nextRole),
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update user role.");
    }
  };

  const toggleEmployeePermission = (moduleKey: string, field: PermissionKey, value: boolean) => {
    if (!canManage || !selectedEmployee) return;
    const roleKey = selectedEmployee.role;
    const roleMap = new Map(
      (rolePermissions[roleKey] ?? fallbackPermissions).map((item) => [item.moduleKey, item])
    );
    const roleDefaults = roleMap.get(moduleKey);
    if (!roleDefaults) return;
    const current = employeeOverrides[selectedEmployee.id]?.[moduleKey] ?? { ...roleDefaults };
    const next = { ...current, [field]: value };
    if (
      (field === "canCreate" || field === "canEdit" || field === "canDelete" || field === "canApprove") &&
      value
    ) {
      next.canView = true;
    }
    if (field === "canView" && !value) {
      next.canCreate = false;
      next.canEdit = false;
      next.canDelete = false;
      next.canApprove = false;
    }
    setEmployeeOverrides((prev) => ({
      ...prev,
      [selectedEmployee.id]: {
        ...(prev[selectedEmployee.id] ?? {}),
        [moduleKey]: next,
      },
    }));
    onPushActivity({
      actor: currentUserName ?? "Super Admin",
      employee: selectedEmployee.fullName,
      permission: `${moduleKey} ${field.replace("can", "")}`,
      previousAccess: current[field] ? "ON" : "OFF",
      newAccess: next[field] ? "ON" : "OFF",
    });
  };

  const resetSelectedEmployeeOverrides = () => {
    if (!selectedEmployee) return;
    setEmployeeOverrides((prev) => {
      const next = { ...prev };
      delete next[selectedEmployee.id];
      return next;
    });
    onPushActivity({
      actor: currentUserName ?? "Super Admin",
      employee: selectedEmployee.fullName,
      permission: "Reset to Role Defaults",
      previousAccess: "Custom overrides",
      newAccess: "Inherited role permissions",
    });
  };

  const saveEmployeeAccess = () => {
    onSuccess("Employee permission changes saved.");
    setManageAccessUserId(null);
  };

  return {
    employeeProfiles,
    search,
    roleFilter,
    departmentFilter,
    statusFilter,
    manageAccessUserId,
    departmentOptions,
    filteredUsers,
    selectedEmployee,
    selectedEmployeeOverrides,
    selectedEmployeeHasOverrides,
    setSearch,
    setRoleFilter,
    setDepartmentFilter,
    setStatusFilter,
    setManageAccessUserId,
    updateEmployeeProfile,
    updateEmployeeRole,
    toggleEmployeePermission,
    resetSelectedEmployeeOverrides,
    saveEmployeeAccess,
    hydrateDefaultProfilesForUsers,
  };
}
