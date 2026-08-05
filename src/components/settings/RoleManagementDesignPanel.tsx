"use client";

import { useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import RoleFormModal from "@/components/settings/access-control/RoleFormModal";
import { getPermissions, updateRolePermissions } from "@/lib/permission-api";
import { buildDefaultMatrix } from "@/lib/permission-types";
import type { ModulePermission } from "@/lib/permission-types";
import type { AdminRole } from "@/lib/auth-types";
import {
  isValidRoleKey,
  normalizeRoleKey,
  rememberKnownRole,
  rememberKnownRoles,
} from "@/lib/role-catalog";
import { getUserStats, listUsers, updateUser } from "@/lib/user-api";
import { formatRoleLabel } from "@/lib/user-types";
import { formatPackageDateTime } from "@/lib/format-date";
import type { ManageableUser, RoleMeta } from "@/components/settings/access-control/types";
import { useAuth } from "@/components/auth/AuthProvider";

const GOLD = "#A68231";
const PROTECTED_ROLES = new Set(["owner", "super_admin"]);
const LOCAL_STORAGE_ROLE_META = "ftadmin-role-meta-v1";
const ACTOR_ROLE_LABEL = "Super Admin";

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

function formatSingaporeDateTime(value?: string): string {
  return formatPackageDateTime(value);
}

export type RoleManagementDesignPanelHandle = {
  openCreate: () => void;
};

export default forwardRef<RoleManagementDesignPanelHandle>(function RoleManagementDesignPanel(
  _props,
  ref
) {
  const { user } = useAuth();
  const actorName = user?.fullName?.trim() || "Super Admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [rolePermissionMap, setRolePermissionMap] = useState<
    Record<string, ModulePermission[]>
  >({});
  const [users, setUsers] = useState<ManageableUser[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    superAdmins: 0,
  });
  const [roleMeta, setRoleMeta] = useState<Record<string, RoleMeta>>(() =>
    readLocalStorageJson<Record<string, RoleMeta>>(LOCAL_STORAGE_ROLE_META, {})
  );
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({
    roleName: "",
    description: "",
    department: "",
    designation: "",
    assignUsers: [] as number[],
  });

  useEffect(() => {
    queueMicrotask(async () => {
      setLoading(true);
      try {
        const [permissionsResult, usersResult, statsResult] = await Promise.all([
          getPermissions(),
          listUsers({ role: "all", status: "all", page: 1, limit: 200 }),
          getUserStats().catch(() => null),
        ]);
        setRoles(Array.from(new Set(permissionsResult.matrices.map((m) => m.role))));
        setRolePermissionMap(
          Object.fromEntries(
            permissionsResult.matrices.map((matrix) => [matrix.role, matrix.permissions])
          )
        );
        rememberKnownRoles(
          permissionsResult.matrices.map((matrix) => matrix.role)
        );
        setUsers(usersResult.users as ManageableUser[]);
        if (statsResult?.stats) {
          setStats({
            totalUsers: statsResult.stats.total,
            activeUsers: statsResult.stats.active,
            superAdmins: statsResult.stats.superAdmins,
          });
        }
      } finally {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ROLE_META, JSON.stringify(roleMeta));
  }, [roleMeta]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles
      .map((role) => {
        const meta = roleMeta[role];
        const assignedUsers = users.filter((u) => u.role === role);
        return {
          key: role,
          name: formatRoleLabel(role),
          description: meta?.description ?? `${formatRoleLabel(role)} role access definition`,
          createdBy: meta?.createdBy ?? "system",
          createdByName: meta?.createdByName ?? (meta?.createdBy?.toLowerCase() === "super admin" ? "Neetu" : ""),
          createdTime: formatSingaporeDateTime(meta?.createdDate),
          updatedBy: meta?.updatedBy ?? meta?.createdBy ?? "system",
          updatedByName:
            meta?.updatedByName ??
            (meta?.updatedBy?.toLowerCase() === "super admin" ? "Neetu" : meta?.createdByName ?? ""),
          updatedTime: formatSingaporeDateTime(meta?.updatedAt ?? meta?.createdDate),
          usersCount: assignedUsers.length,
          protected: PROTECTED_ROLES.has(role),
        };
      })
      .filter((row) => {
        if (roleFilter !== "all" && row.key !== roleFilter) return false;
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q) ||
          row.createdBy.toLowerCase().includes(q)
        );
      });
  }, [roleFilter, roleMeta, roles, search, users]);

  const customRoles = rows.filter((row) => !row.protected && row.key !== "admin").length;

  const openCreateRoleModal = () => {
    setEditingRoleKey(null);
    setRoleForm({
      roleName: "",
      description: "",
      department: "",
      designation: "",
      assignUsers: [],
    });
    setRoleModalOpen(true);
  };

  useImperativeHandle(ref, () => ({ openCreate: openCreateRoleModal }), []);

  const openEditRoleModal = (roleKey: string) => {
    const meta = roleMeta[roleKey];
    setEditingRoleKey(roleKey);
    setRoleForm({
      roleName: formatRoleLabel(roleKey),
      description: meta?.description ?? "",
      department: meta?.department ?? "",
      designation: meta?.designation ?? "",
      assignUsers: users.filter((userRow) => userRow.role === roleKey).map((userRow) => userRow.id),
    });
    setRoleModalOpen(true);
  };

  const persistRolePermissions = async (
    roleKey: string,
    permissions?: ModulePermission[]
  ) => {
    const seed =
      permissions ??
      rolePermissionMap.admin ??
      buildDefaultMatrix("admin").permissions;
    const { matrix } = await updateRolePermissions(roleKey as AdminRole, {
      permissions: seed,
    });
    setRolePermissionMap((prev) => ({
      ...prev,
      [roleKey]: matrix.permissions,
    }));
  };

  const assignUsersToRole = async (roleKey: string, assignUserIds: number[]) => {
    const assignSet = new Set(assignUserIds);
    const nextUsers = [...users];

    for (const userRow of users) {
      const shouldHaveRole = assignSet.has(userRow.id);
      const currentlyHasRole = userRow.role === roleKey;
      if (shouldHaveRole && !currentlyHasRole) {
        try {
          const { user: updated } = await updateUser(userRow.id, {
            fullName: userRow.fullName,
            role: roleKey,
            isActive: userRow.isActive,
          });
          const idx = nextUsers.findIndex((row) => row.id === userRow.id);
          if (idx >= 0) nextUsers[idx] = updated as ManageableUser;
        } catch {
          // Keep going so other assignments still apply.
        }
      } else if (
        editingRoleKey &&
        currentlyHasRole &&
        !shouldHaveRole &&
        userRow.role === editingRoleKey
      ) {
        try {
          const { user: updated } = await updateUser(userRow.id, {
            fullName: userRow.fullName,
            role: "admin",
            isActive: userRow.isActive,
          });
          const idx = nextUsers.findIndex((row) => row.id === userRow.id);
          if (idx >= 0) nextUsers[idx] = updated as ManageableUser;
        } catch {
          // Keep going.
        }
      }
    }

    setUsers(nextUsers);
  };

  const submitRoleModal = async () => {
    const key = editingRoleKey ?? normalizeRoleKey(roleForm.roleName);
    if (!key) {
      setError("Role name is required.");
      return;
    }
    if (!isValidRoleKey(key)) {
      setError("Role name must be at least 2 characters (letters, numbers, underscore).");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Share with User Management immediately so the role appears in Add/Edit User.
      rememberKnownRole(key);

      const isNewRole = !editingRoleKey || !roles.includes(key);
      if (isNewRole) {
        await persistRolePermissions(key);
      }

      await assignUsersToRole(key, roleForm.assignUsers);

      setRoles((prev) => (prev.includes(key) ? prev : [...prev, key]));
      setRoleMeta((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] ?? {}),
          key,
          description: roleForm.description || `${formatRoleLabel(key)} role access definition`,
          department: roleForm.department || "General",
          designation: roleForm.designation || "Team Member",
          createdBy: editingRoleKey ? prev[key]?.createdBy ?? ACTOR_ROLE_LABEL : ACTOR_ROLE_LABEL,
          createdByName: editingRoleKey ? prev[key]?.createdByName ?? actorName : actorName,
          createdDate: editingRoleKey ? prev[key]?.createdDate ?? nowIso() : nowIso(),
          updatedBy: ACTOR_ROLE_LABEL,
          updatedByName: actorName,
          updatedAt: nowIso(),
        },
      }));
      setSuccess(
        editingRoleKey
          ? `Role "${formatRoleLabel(key)}" updated successfully.`
          : `Role "${formatRoleLabel(key)}" created successfully.`
      );
      setRoleModalOpen(false);
      setEditingRoleKey(null);
      setRoleForm({
        roleName: "",
        description: "",
        department: "",
        designation: "",
        assignUsers: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const duplicateRole = async (roleKey: string) => {
    const duplicatedKey = `${roleKey}_copy_${Math.floor(Math.random() * 1000)}`;
    const sourceMeta = roleMeta[roleKey];
    const sourcePermissions = rolePermissionMap[roleKey];

    setSaving(true);
    setError(null);
    try {
      await persistRolePermissions(duplicatedKey, sourcePermissions);
      rememberKnownRole(duplicatedKey);
      setRoles((prev) => [...prev, duplicatedKey]);
      setRoleMeta((prev) => ({
        ...prev,
        [duplicatedKey]: {
          key: duplicatedKey,
          description: sourceMeta?.description ?? `Duplicate of ${formatRoleLabel(roleKey)}`,
          department: sourceMeta?.department ?? "General",
          designation: sourceMeta?.designation ?? "Team Member",
          createdBy: ACTOR_ROLE_LABEL,
          createdByName: actorName,
          createdDate: nowIso(),
          updatedBy: ACTOR_ROLE_LABEL,
          updatedByName: actorName,
          updatedAt: nowIso(),
        },
      }));
      setSuccess(`Role "${formatRoleLabel(roleKey)}" duplicated successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate role");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = (roleKey: string) => {
    if (PROTECTED_ROLES.has(roleKey)) return;
    setRoles((prev) => prev.filter((role) => role !== roleKey));
    setRoleMeta((prev) => {
      const next = { ...prev };
      delete next[roleKey];
      return next;
    });
    setUsers((prev) =>
      prev.map((userRow) => (userRow.role === roleKey ? { ...userRow, role: "admin" } : userRow))
    );
    setSuccess(`Role "${formatRoleLabel(roleKey)}" deleted and users moved to Admin.`);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { label: "Total Roles", value: rows.length, icon: "Shield", accent: GOLD },
          { label: "Custom Roles", value: customRoles, icon: "Copy", accent: "#7C3AED" },
          { label: "Total Users", value: stats.totalUsers, icon: "Users", accent: "#3B82F6" },
          { label: "Active Users", value: stats.activeUsers, icon: "CheckCircle", accent: "#16A34A" },
          { label: "Super Admins", value: stats.superAdmins, icon: "UserCog", accent: GOLD },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl border border-[#E8ECF0] bg-white px-4 py-3.5 shadow-sm"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${item.accent}14`, color: item.accent }}
            >
              <Icon name={item.icon} size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{item.label}</p>
              <p className="text-lg font-semibold text-[#1F2A44]">
                {loading ? "—" : item.value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#E8ECF0] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8ECF0] bg-gradient-to-r from-[#FFFCF7] via-white to-white">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2A44]">Role Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              Design, assign, and govern role structures for every department.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search role name or description..."
              className="h-10 border-[#E5E7EB]"
            />
            <NativeSelect
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 border-[#E5E7EB]"
            >
              <option value="all">All Roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {formatRoleLabel(role)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {success && (
          <div className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-[#E8ECF0]">
                <th className="px-4 py-3">Role Name</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Updated (SGT)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-[#EEF1F4]">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-sm text-[#1F2A44] ring-1 ring-[#E5E7EB]">
                      <Icon name={row.protected ? "Shield" : "User"} size={13} />
                      {row.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#1F2A44]">{row.usersCount}</td>
                  <td className="px-4 py-3 text-gray-600">{row.description}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <p className="text-[15px] leading-5 text-[#1F2A44]">{row.createdTime}</p>
                    <p className="text-xs text-[#64748B] mt-1">By {row.createdBy}</p>
                    {row.createdByName ? (
                      <p className="text-xs text-[#94A3B8] mt-0.5">{row.createdByName}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p className="text-[15px] leading-5 text-[#1F2A44]">{row.updatedTime}</p>
                    <p className="text-xs text-[#64748B] mt-1">By {row.updatedBy}</p>
                    {row.updatedByName ? (
                      <p className="text-xs text-[#94A3B8] mt-0.5">By {row.updatedByName}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon-sm"
                        aria-label="Edit role"
                        onClick={() => openEditRoleModal(row.key)}
                      >
                        <Icon name="Pencil" size={14} />
                      </Button>
                      <Button
                        size="icon-sm"
                        aria-label="Duplicate role"
                        disabled={saving}
                        onClick={() => {
                          void duplicateRole(row.key);
                        }}
                      >
                        <Icon name="Copy" size={14} />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        disabled={row.protected}
                        aria-label="Delete role"
                        onClick={() => deleteRole(row.key)}
                      >
                        <Icon name="Trash2" size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No roles match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RoleFormModal
        open={roleModalOpen}
        editingRoleKey={editingRoleKey}
        roleForm={roleForm}
        allUsers={users}
        showDepartmentAndDesignation={false}
        isSaving={saving}
        onClose={() => {
          if (saving) return;
          setRoleModalOpen(false);
          setEditingRoleKey(null);
        }}
        onRoleFormChange={setRoleForm}
        onSubmit={() => {
          void submitRoleModal();
        }}
      />
    </div>
  );
});
