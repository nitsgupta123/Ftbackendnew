import { useMemo, useState } from "react";
import {
  getUserPermissions,
  resetUserPermissions,
  saveEmployeeProfile,
  updateUserPermissions,
} from "@/lib/permission-api";
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
import { normalizeExtended, toBasePermissions } from "./useRolePermissions";

function extendedEqual(a: ExtendedPermission, b: ExtendedPermission): boolean {
  return (
    a.moduleKey === b.moduleKey &&
    a.canView === b.canView &&
    a.canCreate === b.canCreate &&
    a.canEdit === b.canEdit &&
    a.canDelete === b.canDelete &&
    a.canApprove === b.canApprove
  );
}

function overridesDifferFromRole(
  overrides: Record<string, ExtendedPermission>,
  roleDefaults: ExtendedPermission[]
): boolean {
  const roleMap = new Map(roleDefaults.map((row) => [row.moduleKey, row]));
  return Object.values(overrides).some((row) => {
    const roleDefault = roleMap.get(row.moduleKey);
    if (!roleDefault) return true;
    return !extendedEqual(row, roleDefault);
  });
}

type UseEmployeeOverridesArgs = {
  canManage: boolean;
  allUsers: ManageableUser[];
  rolePermissions: Record<string, ExtendedPermission[]>;
  fallbackPermissions: ExtendedPermission[];
  currentUserName?: string;
  currentUserId?: number;
  onPushActivity: (entry: Omit<ActivityItem, "id" | "createdAt">) => void;
  onError: (message: string | null) => void;
  onSuccess: (message: string) => void;
  onUsersUpdated: (next: ManageableUser[]) => void;
  refreshMyPermissions: () => Promise<void>;
};

export function useEmployeeOverrides({
  canManage,
  allUsers,
  rolePermissions,
  fallbackPermissions,
  currentUserName,
  currentUserId,
  onPushActivity,
  onError,
  onSuccess,
  onUsersUpdated,
  refreshMyPermissions,
}: UseEmployeeOverridesArgs) {
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<number, EmployeeProfile>>({});
  const [employeeOverrides, setEmployeeOverrides] = useState<EmployeeOverrides>({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [manageAccessUserId, setManageAccessUserId] = useState<number | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  const hydrateProfiles = (stored: Record<string, EmployeeProfile>) => {
    const next: Record<number, EmployeeProfile> = {};
    for (const [userId, profile] of Object.entries(stored)) {
      const id = Number(userId);
      if (Number.isInteger(id) && id > 0) next[id] = profile;
    }
    setEmployeeProfiles(next);
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

  const selectedRoleDefaults = useMemo(() => {
    if (!selectedEmployee) return fallbackPermissions;
    return rolePermissions[selectedEmployee.role] ?? fallbackPermissions;
  }, [fallbackPermissions, rolePermissions, selectedEmployee]);

  const selectedEmployeeHasOverrides = useMemo(
    () => overridesDifferFromRole(selectedEmployeeOverrides, selectedRoleDefaults),
    [selectedEmployeeOverrides, selectedRoleDefaults]
  );

  const openManageAccess = async (userId: number) => {
    setManageAccessUserId(userId);
    setLoadingAccess(true);
    onError(null);
    try {
      const payload = await getUserPermissions(userId);
      const mapped = Object.fromEntries(
        normalizeExtended(payload.overrides).map((row) => [row.moduleKey, row])
      );
      setEmployeeOverrides((prev) => ({ ...prev, [userId]: mapped }));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load employee access.");
      setManageAccessUserId(null);
    } finally {
      setLoadingAccess(false);
    }
  };

  const updateEmployeeProfile = async (userId: number, patch: Partial<EmployeeProfile>) => {
    if (!canManage) return;
    const previous = employeeProfiles[userId] as EmployeeProfile | undefined;
    const next: EmployeeProfile = {
      ...({ designation: "", department: "", accessLevel: "" } as EmployeeProfile),
      ...previous,
      ...patch,
    };
    setEmployeeProfiles((prev) => ({ ...prev, [userId]: next }));
    try {
      const { profile } = await saveEmployeeProfile(userId, next);
      setEmployeeProfiles((prev) => ({ ...prev, [userId]: profile }));
    } catch (err) {
      setEmployeeProfiles((prev) => {
        const reverted = { ...prev };
        if (previous) reverted[userId] = previous;
        else delete reverted[userId];
        return reverted;
      });
      onError(err instanceof Error ? err.message : "Failed to save employee profile.");
    }
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
      if (currentUserId === userId) {
        await refreshMyPermissions();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update user role.");
    }
  };

  const toggleEmployeePermission = (moduleKey: string, field: PermissionKey, value: boolean) => {
    if (!canManage || !selectedEmployee) return;
    const roleDefaults = selectedRoleDefaults.find((item) => item.moduleKey === moduleKey);
    if (!roleDefaults) return;

    const current =
      employeeOverrides[selectedEmployee.id]?.[moduleKey] ?? { ...roleDefaults };
    const next = { ...current, [field]: value };
    if (field === "canCreate" || field === "canEdit" || field === "canApprove") {
      next.canCreate = value;
      next.canEdit = value;
      next.canApprove = value;
    }
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

    setEmployeeOverrides((prev) => {
      const userMap = { ...(prev[selectedEmployee.id] ?? {}) };
      if (extendedEqual(next, roleDefaults)) {
        delete userMap[moduleKey];
      } else {
        userMap[moduleKey] = next;
      }
      return {
        ...prev,
        [selectedEmployee.id]: userMap,
      };
    });
  };

  const resetSelectedEmployeeOverrides = async () => {
    if (!selectedEmployee || !canManage) return;
    setSavingAccess(true);
    try {
      await resetUserPermissions(selectedEmployee.id);
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
      onSuccess("Employee access reset to role defaults.");
      if (currentUserId === selectedEmployee.id) {
        await refreshMyPermissions();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to reset employee access.");
    } finally {
      setSavingAccess(false);
    }
  };

  const saveEmployeeAccess = async () => {
    if (!selectedEmployee || !canManage) return;
    setSavingAccess(true);
    try {
      const overrides = Object.values(employeeOverrides[selectedEmployee.id] ?? {});
      const result = await updateUserPermissions(selectedEmployee.id, toBasePermissions(overrides));
      onPushActivity({
        actor: currentUserName ?? "Super Admin",
        employee: selectedEmployee.fullName,
        permission: "Employee permission overrides",
        previousAccess: "Previous overrides",
        newAccess: `${result.overrides.length} module override(s)`,
      });
      onSuccess("Employee permission changes saved.");
      if (currentUserId === selectedEmployee.id) {
        await refreshMyPermissions();
      }
      setManageAccessUserId(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save employee access.");
    } finally {
      setSavingAccess(false);
    }
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
    loadingAccess,
    savingAccess,
    setSearch,
    setRoleFilter,
    setDepartmentFilter,
    setStatusFilter,
    setManageAccessUserId,
    openManageAccess,
    updateEmployeeProfile,
    updateEmployeeRole,
    toggleEmployeePermission,
    resetSelectedEmployeeOverrides,
    saveEmployeeAccess,
    hydrateProfiles,
  };
}
