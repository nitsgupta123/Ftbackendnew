"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePermissions } from "@/components/auth/PermissionsProvider";
import { getUserStats, listUsers } from "@/lib/user-api";
import { getPermissions } from "@/lib/permission-api";
import { formatRoleLabel, type AdminUserStats } from "@/lib/user-types";
import type {
  AccessModuleDefinition,
  AccessModuleGroup,
} from "@/lib/permission-types";
import ActivityLogTable from "@/components/settings/access-control/ActivityLogTable";
import EmployeeAccessDrawer from "@/components/settings/access-control/EmployeeAccessDrawer";
import UserDesignationManagementSection from "@/components/settings/access-control/UserDesignationManagementSection";
import RoleFormModal from "@/components/settings/access-control/RoleFormModal";
import type {
  ActivityItem,
  EmployeeProfile,
  ExtendedPermission,
  ManageableUser,
} from "@/components/settings/access-control/types";
import { normalizeExtended, useRolePermissions } from "@/components/settings/access-control/useRolePermissions";
import { useEmployeeOverrides } from "@/components/settings/access-control/useEmployeeOverrides";

const GOLD = "#A68231";
const PROTECTED_ROLES = new Set(["owner", "super_admin"]);
const LOCAL_STORAGE_ACTIVITY = "ftadmin-access-activity-v1";

const GROUP_META: Record<
  AccessModuleGroup,
  { title: string; description: string }
> = {
  panel: {
    title: "Admin Panel Modules",
    description: "Backend areas: content, catalog, settings, and users.",
  },
  package_builder: {
    title: "Package Builder Modules",
    description:
      "Add-package steps including Supplier Source, Hotels, Pricing, and related sections.",
  },
};

const DEFAULT_EMPLOYEE_PROFILES: Record<string, EmployeeProfile> = {
  neetu: {
    designation: "Package Manager",
    department: "Package Department",
    accessLevel: "Advanced",
  },
  amit: {
    designation: "Travel Consultant",
    department: "Sales Department",
    accessLevel: "Standard",
  },
  sehar: {
    designation: "Content Manager",
    department: "Content Department",
    accessLevel: "Standard",
  },
};

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

function nowIso(): string {
  return new Date().toISOString();
}

export default function RolesPanel() {
  const { user } = useAuth();
  const { refresh: refreshMyPermissions } = usePermissions();
  const canManage = user?.role === "super_admin" || user?.role === "owner";

  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [allUsers, setAllUsers] = useState<ManageableUser[]>([]);
  const [modules, setModules] = useState<AccessModuleDefinition[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(() =>
    readLocalStorageJson<ActivityItem[]>(LOCAL_STORAGE_ACTIVITY, [])
  );
  const [loading, setLoading] = useState(true);

  const pushActivity = useCallback((entry: Omit<ActivityItem, "id" | "createdAt">) => {
    setActivityLog((prev) => [
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: nowIso(),
      },
      ...prev,
    ]);
  }, []);

  const roleState = useRolePermissions({
    canManage,
    allUsers,
    currentUserName: user?.fullName,
    formatRoleLabel,
    refreshMyPermissions,
    onPushActivity: pushActivity,
  });

  const employeeState = useEmployeeOverrides({
    canManage,
    allUsers,
    rolePermissions: roleState.rolePermissions,
    fallbackPermissions: roleState.draft,
    defaultProfiles: DEFAULT_EMPLOYEE_PROFILES,
    currentUserName: user?.fullName,
    onPushActivity: pushActivity,
    onError: roleState.setError,
    onSuccess: roleState.setSuccess,
    onUsersUpdated: setAllUsers,
  });

  const reloadData = async () => {
    setLoading(true);
    roleState.setError(null);
    try {
      const [statsResult, permissionsResult, usersResult] = await Promise.all([
        getUserStats().catch(() => null),
        getPermissions(),
        listUsers({
          role: "all",
          status: "all",
          sort: "created_at",
          order: "desc",
          page: 1,
          limit: 200,
        }),
      ]);
      if (statsResult) setStats(statsResult.stats);
      setAllUsers(usersResult.users);
      employeeState.hydrateDefaultProfilesForUsers(usersResult.users);
      setModules(permissionsResult.modules);
      const mappedPermissions: Record<string, ExtendedPermission[]> = {};
      for (const matrix of permissionsResult.matrices) {
        mappedPermissions[matrix.role] = normalizeExtended(matrix.permissions);
      }
      roleState.bootstrapFromPermissions(mappedPermissions);
    } catch (err) {
      roleState.setError(err instanceof Error ? err.message : "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void reloadData();
    });
    // Intentionally load once on page open to avoid render-loop flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ACTIVITY, JSON.stringify(activityLog.slice(0, 60)));
  }, [activityLog]);

  const modulesByGroup = useMemo(() => {
    const groups: AccessModuleGroup[] = ["panel", "package_builder"];
    return groups.map((group) => ({
      group,
      ...GROUP_META[group],
      modules: modules
        .filter((m) => m.group === group)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  }, [modules]);

  const usersByRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const userRow of allUsers) {
      map.set(userRow.role, (map.get(userRow.role) ?? 0) + 1);
    }
    return map;
  }, [allUsers]);
  const superAdminCount = stats?.superAdmins ?? 0;
  const customRolesCount = Math.max(
    roleState.availableRoles.filter((role) => !PROTECTED_ROLES.has(role) && role !== "admin").length,
    0
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E8ECF0] bg-gradient-to-br from-[#FFFDF8] via-white to-[#FAFBFC] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A68231]/10 text-[#A68231] ring-1 ring-[#A68231]/20">
                <Icon name="Shield" size={18} />
              </div>
              <h2 className="text-lg font-semibold text-[#1F2A44]">Access Control Center</h2>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Centralized role-based access controls with employee-level overrides and audit trail.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF6E5] px-3 py-1.5 text-xs font-medium text-[#8A6A1E] ring-1 ring-[#F1DEB3]">
            <Icon name="Info" size={14} />
            Enterprise RBAC Mode
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          {
            label: "Total Users",
            value: stats?.total ?? 0,
            icon: "Users",
            accent: GOLD,
          },
          {
            label: "Total Roles",
            value: roleState.availableRoles.length,
            icon: "User",
            accent: "#3B82F6",
          },
          {
            label: "Active Users",
            value: stats?.active ?? 0,
            icon: "CheckCircle",
            accent: "#16A34A",
          },
          {
            label: "Super Admins",
            value: superAdminCount,
            icon: "Shield",
            accent: GOLD,
          },
          {
            label: "Custom Roles",
            value: customRolesCount,
            icon: "Copy",
            accent: "#7C3AED",
          },
          {
            label: "Pending Access Requests",
            value: roleState.pendingAccessRequests,
            icon: "AlertCircle",
            accent: "#D97706",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl border border-[#E8ECF0] bg-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${item.accent}14`,
                color: item.accent,
              }}
            >
              <Icon name={item.icon} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {item.label}
              </p>
              <p className="text-lg font-semibold text-[#1F2A44] leading-tight">
                {loading && !stats ? "—" : item.value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1F2A44]">Employee Access Management</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Assign roles, control access levels, and open detailed permission controls per employee.
              </p>
            </div>
          </div>
        </div>

        {!canManage && (
          <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Only Super Admins can edit the permission matrix. You can review access for
              each role below. Owner and Super Admin are protected.
          </div>
        )}

        {roleState.error && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {roleState.error}
          </div>
        )}
        {roleState.success && (
          <div className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {roleState.success}
          </div>
        )}

        <div className="p-5 space-y-6">
          <UserDesignationManagementSection
            canManage={canManage}
            search={employeeState.search}
            roleFilter={employeeState.roleFilter}
            statusFilter={employeeState.statusFilter}
            availableRoles={roleState.availableRoles}
            filteredUsers={employeeState.filteredUsers}
            employeeProfiles={employeeState.employeeProfiles}
            formatRoleLabel={formatRoleLabel}
            onSearchChange={employeeState.setSearch}
            onRoleFilterChange={employeeState.setRoleFilter}
            onStatusFilterChange={employeeState.setStatusFilter}
            onProfileChange={employeeState.updateEmployeeProfile}
            onRoleChange={(userId, role) => {
              void employeeState.updateEmployeeRole(userId, role);
            }}
            onManageAccess={employeeState.setManageAccessUserId}
          />

        </div>

        <ActivityLogTable activityLog={activityLog} />

        <div className="px-5 py-3 border-t border-[#E8ECF0] bg-[#FAFBFC] text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
          <span>
            Access changes are logged instantly for compliance and audit visibility.
          </span>
          {roleState.dirty && canManage && (
            <span className="text-amber-700 font-medium">Unsaved changes</span>
          )}
        </div>
      </div>

      <EmployeeAccessDrawer
        canManage={canManage}
        employee={employeeState.selectedEmployee}
        employeeProfiles={employeeState.employeeProfiles}
        selectedEmployeeHasOverrides={employeeState.selectedEmployeeHasOverrides}
        selectedEmployeeOverrides={employeeState.selectedEmployeeOverrides}
        rolePermissions={roleState.rolePermissions}
        fallbackPermissions={roleState.draft}
        modulesByGroup={modulesByGroup}
        formatRoleLabel={formatRoleLabel}
        onClose={() => employeeState.setManageAccessUserId(null)}
        onTogglePermission={employeeState.toggleEmployeePermission}
        onResetDefaults={() => {
          employeeState.resetSelectedEmployeeOverrides();
        }}
        onSave={() => {
          employeeState.saveEmployeeAccess();
        }}
      />

      <RoleFormModal
        open={roleState.roleModalOpen}
        editingRoleKey={roleState.editingRoleKey}
        roleForm={roleState.roleForm}
        allUsers={allUsers}
        onClose={() => roleState.setRoleModalOpen(false)}
        onRoleFormChange={roleState.setRoleForm}
        onSubmit={() => {
          void roleState.submitRoleModal().then(() => reloadData());
        }}
      />

      <AlertDialog open={Boolean(roleState.deleteRoleKey)} onOpenChange={(open) => !open && roleState.setDeleteRoleKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              {roleState.deleteRoleKey
                ? `This will remove ${formatRoleLabel(roleState.deleteRoleKey)}. Assigned users: ${
                    allUsers.filter((userRow) => userRow.role === roleState.deleteRoleKey).length
                  }. Protected roles cannot be deleted.`
                : "Confirm role deletion."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                void roleState.deleteRole(PROTECTED_ROLES);
              }}
            >
              Remove Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
