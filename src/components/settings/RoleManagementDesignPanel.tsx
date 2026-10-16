import { useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import RoleFormModal from "@/components/settings/access-control/RoleFormModal";
import {
  deleteRole as deleteRoleRequest,
  getAccessMeta,
  getPermissions,
  renameRole as renameRoleRequest,
  saveRoleMeta,
  updateRolePermissions,
} from "@/lib/permission-api";
import { buildDefaultMatrix } from "@/lib/permission-types";
import type { ModulePermission } from "@/lib/permission-types";
import type { AdminRole } from "@/lib/auth-types";
import {
  forgetKnownRole,
  isValidRoleKey,
  normalizeRoleKey,
  replaceKnownRole,
  rememberKnownRole,
  rememberKnownRoles,
} from "@/lib/role-catalog";
import { getUserStats, listAllUsers, updateUser } from "@/lib/user-api";
import { formatRoleLabel } from "@/lib/user-types";
import { formatPackageDateTime } from "@/lib/format-date";
import type { ManageableUser, RoleMeta } from "@/components/settings/access-control/types";

const GOLD = "#A68231";
const PROTECTED_ROLES = new Set(["admin", "owner", "super_admin"]);

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
  const [roleMeta, setRoleMeta] = useState<Record<string, RoleMeta>>({});
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
        const [permissionsResult, usersResult, statsResult, accessMeta] = await Promise.all([
          getPermissions(),
          listAllUsers({ role: "all", status: "all" }),
          getUserStats().catch(() => null),
          getAccessMeta(),
        ]);
        setRoleMeta(accessMeta.roleMeta);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roles");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles
      .map((role) => {
        const meta = roleMeta[role];
        const assignedUsers = users.filter((u) => u.role === role);
        return {
          key: role,
          name: formatRoleLabel(role),
          description: meta?.description || "—",
          createdBy: meta?.createdBy ?? "system",
          createdByName: meta?.createdByName ?? "",
          createdTime: formatSingaporeDateTime(meta?.createdDate),
          updatedBy: meta?.updatedBy ?? meta?.createdBy ?? "system",
          updatedByName: meta?.updatedByName ?? meta?.createdByName ?? "",
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

  const assignUsersToRole = async (
    roleKey: string,
    assignUserIds: number[],
    sourceUsers = users
  ) => {
    const assignSet = new Set(assignUserIds);
    const nextUsers = [...sourceUsers];
    const failed: string[] = [];

    for (const userRow of sourceUsers) {
      const shouldHaveRole = assignSet.has(userRow.id);
      const currentlyHasRole = userRow.role === roleKey;
      let targetRole: string | null = null;
      if (shouldHaveRole && !currentlyHasRole) targetRole = roleKey;
      else if (editingRoleKey && currentlyHasRole && !shouldHaveRole) targetRole = "admin";
      if (!targetRole) continue;
      try {
        const { user: updated } = await updateUser(userRow.id, {
          fullName: userRow.fullName,
          role: targetRole,
          isActive: userRow.isActive,
        });
        const idx = nextUsers.findIndex((row) => row.id === userRow.id);
        if (idx >= 0) nextUsers[idx] = updated as ManageableUser;
      } catch {
        // Keep going so other assignments still apply; failures are reported below.
        failed.push(userRow.fullName);
      }
    }

    setUsers(nextUsers);
    if (failed.length > 0) {
      throw new Error(`Role saved, but these users could not be reassigned: ${failed.join(", ")}`);
    }
  };

  const submitRoleModal = async () => {
    const key = normalizeRoleKey(roleForm.roleName);
    if (!key) {
      setError("Role name is required.");
      return;
    }
    if (!isValidRoleKey(key)) {
      setError("Role name must be at least 2 characters (letters, numbers, underscore).");
      return;
    }
    if (editingRoleKey && key !== editingRoleKey && roles.includes(key)) {
      setError("A role with that name already exists.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const isNewRole = !editingRoleKey || !roles.includes(key);
      const isRenaming = Boolean(editingRoleKey && editingRoleKey !== key);
      let usersForAssignment = users;

      if (isRenaming && editingRoleKey) {
        const { matrix } = await renameRoleRequest(editingRoleKey, key);
        usersForAssignment = users.map((userRow) =>
          userRow.role === editingRoleKey ? { ...userRow, role: key } : userRow
        );
        setRolePermissionMap((prev) => {
          const next = { ...prev, [key]: matrix.permissions };
          delete next[editingRoleKey];
          return next;
        });
        replaceKnownRole(editingRoleKey, key);
      } else {
        rememberKnownRole(key);
      }

      if (isNewRole && !isRenaming) {
        await persistRolePermissions(key);
      }

      const { meta } = await saveRoleMeta(key, {
        description: roleForm.description,
        department: roleForm.department,
        designation: roleForm.designation,
      });

      setRoles((prev) => {
        if (isRenaming && editingRoleKey) {
          return prev.map((role) => (role === editingRoleKey ? key : role));
        }
        return prev.includes(key) ? prev : [...prev, key];
      });
      setRoleMeta((prev) => {
        const next = { ...prev };
        if (editingRoleKey) delete next[editingRoleKey];
        next[key] = meta;
        return next;
      });

      await assignUsersToRole(key, roleForm.assignUsers, usersForAssignment);
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
    let copyIndex = 1;
    while (roles.includes(`${roleKey}_copy_${copyIndex}`)) copyIndex += 1;
    const duplicatedKey = `${roleKey}_copy_${copyIndex}`;
    const sourceMeta = roleMeta[roleKey];
    const sourcePermissions = rolePermissionMap[roleKey];

    setSaving(true);
    setError(null);
    try {
      await persistRolePermissions(duplicatedKey, sourcePermissions);
      const { meta } = await saveRoleMeta(duplicatedKey, {
        description: sourceMeta?.description ?? `Duplicate of ${formatRoleLabel(roleKey)}`,
        department: sourceMeta?.department ?? "",
        designation: sourceMeta?.designation ?? "",
      });
      rememberKnownRole(duplicatedKey);
      setRoles((prev) => [...prev, duplicatedKey]);
      setRoleMeta((prev) => ({ ...prev, [duplicatedKey]: meta }));
      setSuccess(`Role "${formatRoleLabel(roleKey)}" duplicated successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate role");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleKey: string) => {
    if (PROTECTED_ROLES.has(roleKey)) return;
    const assigned = users.filter((userRow) => userRow.role === roleKey).length;
    const message = assigned
      ? `Delete role "${formatRoleLabel(roleKey)}"? ${assigned} user(s) will be moved to Admin.`
      : `Delete role "${formatRoleLabel(roleKey)}"?`;
    if (!window.confirm(message)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteRoleRequest(roleKey);
      forgetKnownRole(roleKey);
      setRoles((prev) => prev.filter((role) => role !== roleKey));
      setRoleMeta((prev) => {
        const next = { ...prev };
        delete next[roleKey];
        return next;
      });
      setRolePermissionMap((prev) => {
        const next = { ...prev };
        delete next[roleKey];
        return next;
      });
      setUsers((prev) =>
        prev.map((userRow) =>
          userRow.role === roleKey ? { ...userRow, role: "admin" } : userRow
        )
      );
      setSuccess(`Role "${formatRoleLabel(roleKey)}" deleted and users moved to Admin.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setSaving(false);
    }
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
                        onClick={() => {
                          void deleteRole(row.key);
                        }}
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
        roleNameDisabled={Boolean(
          editingRoleKey && PROTECTED_ROLES.has(editingRoleKey)
        )}
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
