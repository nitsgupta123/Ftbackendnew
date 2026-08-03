"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resetRolePermissions, updateRolePermissions } from "@/lib/permission-api";
import { updateUser } from "@/lib/user-api";
import type { AdminRole } from "@/lib/auth-types";
import type { AccessModuleDefinition, ModulePermission } from "@/lib/permission-types";
import type {
  ActivityItem,
  ExtendedPermission,
  ManageableUser,
  PermissionKey,
  RoleMeta,
} from "./types";

const LOCAL_STORAGE_ROLE_META = "ftadmin-role-meta-v1";

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

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeExtended(list: ModulePermission[]): ExtendedPermission[] {
  return list.map((row) => ({
    moduleKey: row.moduleKey,
    canView: Boolean(row.canView),
    canCreate: Boolean(row.canEdit),
    canEdit: Boolean(row.canEdit),
    canDelete: Boolean(row.canDelete),
    canApprove: Boolean(row.canEdit),
  }));
}

export function toBasePermissions(list: ExtendedPermission[]): ModulePermission[] {
  return list.map((row) => ({
    moduleKey: row.moduleKey,
    canView: row.canView || row.canCreate || row.canEdit || row.canDelete || row.canApprove,
    canEdit: row.canCreate || row.canEdit || row.canApprove,
    canDelete: row.canDelete,
  }));
}

function clonePermissions(list: ExtendedPermission[]): ExtendedPermission[] {
  return list.map((p) => ({ ...p }));
}

function permissionsEqual(a: ExtendedPermission[], b: ExtendedPermission[]): boolean {
  if (a.length !== b.length) return false;
  const mapB = new Map(b.map((p) => [p.moduleKey, p]));
  return a.every((row) => {
    const other = mapB.get(row.moduleKey);
    return (
      other &&
      other.canView === row.canView &&
      other.canCreate === row.canCreate &&
      other.canEdit === row.canEdit &&
      other.canDelete === row.canDelete &&
      other.canApprove === row.canApprove
    );
  });
}

type RoleFormState = {
  roleName: string;
  description: string;
  department: string;
  designation: string;
  assignUsers: number[];
};

type UseRolePermissionsArgs = {
  canManage: boolean;
  allUsers: ManageableUser[];
  currentUserName?: string;
  formatRoleLabel: (role: string) => string;
  refreshMyPermissions: () => Promise<void>;
  onPushActivity: (entry: Omit<ActivityItem, "id" | "createdAt">) => void;
};

export function useRolePermissions({
  canManage,
  allUsers,
  currentUserName,
  formatRoleLabel,
  refreshMyPermissions,
  onPushActivity,
}: UseRolePermissionsArgs) {
  const [rolePermissions, setRolePermissions] = useState<Record<string, ExtendedPermission[]>>({});
  const [roleMeta, setRoleMeta] = useState<Record<string, RoleMeta>>(() =>
    readLocalStorageJson<Record<string, RoleMeta>>(LOCAL_STORAGE_ROLE_META, {})
  );
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [draft, setDraft] = useState<ExtendedPermission[]>([]);
  const [saved, setSaved] = useState<ExtendedPermission[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<RoleFormState>({
    roleName: "",
    description: "",
    department: "",
    designation: "",
    assignUsers: [],
  });
  const [deleteRoleKey, setDeleteRoleKey] = useState<string | null>(null);
  const [pendingAccessRequests, setPendingAccessRequests] = useState(4);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ROLE_META, JSON.stringify(roleMeta));
  }, [roleMeta]);

  const availableRoles = useMemo(() => Object.keys(rolePermissions), [rolePermissions]);
  const selectedRolePermissions = useMemo(
    () => rolePermissions[selectedRole] ?? [],
    [rolePermissions, selectedRole]
  );
  const dirty = useMemo(() => !permissionsEqual(draft, saved), [draft, saved]);
  const draftMap = useMemo(() => new Map(draft.map((p) => [p.moduleKey, p])), [draft]);

  const applyRole = useCallback(
    (role: string) => {
      const matrix = rolePermissions[role];
      if (!matrix) return;
      const next = clonePermissions(matrix);
      setSelectedRole(role);
      setDraft(next);
      setSaved(clonePermissions(next));
      setSuccess(null);
      setError(null);
    },
    [rolePermissions]
  );

  const bootstrapFromPermissions = useCallback(
    (mappedPermissions: Record<string, ExtendedPermission[]>) => {
      setRolePermissions(mappedPermissions);
      const currentRole = mappedPermissions.admin
        ? "admin"
        : Object.keys(mappedPermissions)[0] ?? "admin";
      const current = mappedPermissions[currentRole] ?? [];
      if (current.length > 0) {
        setSelectedRole(currentRole);
        const next = clonePermissions(current);
        setDraft(next);
        setSaved(clonePermissions(next));
      }
      setRoleMeta((prev) => {
        const next = { ...prev };
        for (const role of Object.keys(mappedPermissions)) {
          if (next[role]) continue;
          next[role] = {
            key: role,
            description: `${formatRoleLabel(role)} role permissions`,
            department: "General",
            designation: "Team Member",
            createdBy: "System",
            createdDate: nowIso(),
          };
        }
        return next;
      });
    },
    [formatRoleLabel]
  );

  const setPermission = (moduleKey: string, field: PermissionKey, value: boolean) => {
    setDraft((prev) =>
      prev.map((row) => {
        if (row.moduleKey !== moduleKey) return row;
        const next = { ...row, [field]: value };
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
        return next;
      })
    );
    setSuccess(null);
  };

  const toggleAllInGroup = (
    groupModules: AccessModuleDefinition[],
    field: PermissionKey,
    value: boolean
  ) => {
    const keys = new Set(groupModules.map((m) => m.key));
    setDraft((prev) =>
      prev.map((row) => {
        if (!keys.has(row.moduleKey)) return row;
        const next = { ...row, [field]: value };
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
        return next;
      })
    );
    setSuccess(null);
  };

  const save = async () => {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { matrix } = await updateRolePermissions(selectedRole as AdminRole, {
        permissions: toBasePermissions(draft),
      });
      const next = clonePermissions(normalizeExtended(matrix.permissions));
      setDraft(next);
      setSaved(clonePermissions(next));
      setRolePermissions((prev) => ({ ...prev, [selectedRole]: next }));
      setSuccess(`Permissions saved for ${formatRoleLabel(selectedRole)}.`);
      onPushActivity({
        actor: currentUserName ?? "Super Admin",
        employee: "Role Matrix",
        permission: `${formatRoleLabel(selectedRole)} permissions updated`,
        previousAccess: "Previous role matrix",
        newAccess: "Updated role matrix",
      });
      await refreshMyPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { matrix } = await resetRolePermissions(selectedRole as AdminRole);
      const next = clonePermissions(normalizeExtended(matrix.permissions));
      setDraft(next);
      setSaved(clonePermissions(next));
      setRolePermissions((prev) => ({ ...prev, [selectedRole]: next }));
      setSuccess(`Reset ${formatRoleLabel(selectedRole)} to default permissions.`);
      onPushActivity({
        actor: currentUserName ?? "Super Admin",
        employee: "Role Matrix",
        permission: `${formatRoleLabel(selectedRole)} reset`,
        previousAccess: "Custom matrix",
        newAccess: "Role defaults",
      });
      await refreshMyPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset permissions");
    } finally {
      setSaving(false);
    }
  };

  const openRoleModal = (roleKey?: string) => {
    if (!canManage) return;
    if (roleKey) {
      const meta = roleMeta[roleKey];
      setEditingRoleKey(roleKey);
      setRoleForm({
        roleName: formatRoleLabel(roleKey),
        description: meta?.description ?? "",
        department: meta?.department ?? "",
        designation: meta?.designation ?? "",
        assignUsers: allUsers.filter((userRow) => userRow.role === roleKey).map((u) => u.id),
      });
    } else {
      setEditingRoleKey(null);
      setRoleForm({
        roleName: "",
        description: "",
        department: "",
        designation: "",
        assignUsers: [],
      });
    }
    setRoleModalOpen(true);
  };

  const submitRoleModal = async () => {
    if (!canManage) return;
    const key = editingRoleKey ?? slugify(roleForm.roleName);
    if (!key) {
      setError("Role name is required.");
      return;
    }
    const existing = rolePermissions[key];
    const seed = existing ?? clonePermissions(selectedRolePermissions.length ? selectedRolePermissions : draft);
    setRolePermissions((prev) => ({ ...prev, [key]: seed }));
    setRoleMeta((prev) => ({
      ...prev,
      [key]: {
        key,
        description: roleForm.description || `${formatRoleLabel(key)} permissions`,
        department: roleForm.department || "General",
        designation: roleForm.designation || "Team Member",
        createdBy: editingRoleKey
          ? (prev[key]?.createdBy ?? currentUserName ?? "Super Admin")
          : currentUserName ?? "Super Admin",
        createdDate: editingRoleKey ? (prev[key]?.createdDate ?? nowIso()) : nowIso(),
      },
    }));
    for (const userId of roleForm.assignUsers) {
      const target = allUsers.find((userRow) => userRow.id === userId);
      if (!target) continue;
      try {
        await updateUser(target.id, {
          fullName: target.fullName,
          role: key,
          isActive: target.isActive,
        });
      } catch {
        // Continue.
      }
    }
    if (!existing) {
      try {
        await updateRolePermissions(key as AdminRole, { permissions: toBasePermissions(seed) });
      } catch {
        // Keep local role.
      }
    }
    onPushActivity({
      actor: currentUserName ?? "Super Admin",
      employee: editingRoleKey ? "Role Edited" : "Role Created",
      permission: formatRoleLabel(key),
      previousAccess: editingRoleKey ? "Existing role" : "Not available",
      newAccess: editingRoleKey ? "Updated role metadata" : "Role added",
    });
    setSelectedRole(key);
    setDraft(clonePermissions(seed));
    setSaved(clonePermissions(seed));
    setRoleModalOpen(false);
    setSuccess(editingRoleKey ? "Role updated successfully." : "New role created successfully.");
    setPendingAccessRequests((prev) => Math.max(0, prev - 1));
  };

  const duplicateRole = async (roleKey: string) => {
    if (!canManage) return;
    const source = rolePermissions[roleKey];
    if (!source) return;
    const newKey = `${roleKey}_copy_${Math.floor(Math.random() * 1000)}`;
    setRolePermissions((prev) => ({ ...prev, [newKey]: clonePermissions(source) }));
    setRoleMeta((prev) => ({
      ...prev,
      [newKey]: {
        key: newKey,
        description: `Duplicate of ${formatRoleLabel(roleKey)}`,
        department: roleMeta[roleKey]?.department ?? "General",
        designation: roleMeta[roleKey]?.designation ?? "Team Member",
        createdBy: currentUserName ?? "Super Admin",
        createdDate: nowIso(),
      },
    }));
    try {
      await updateRolePermissions(newKey as AdminRole, { permissions: toBasePermissions(source) });
    } catch {
      // keep local
    }
    onPushActivity({
      actor: currentUserName ?? "Super Admin",
      employee: "Role Duplicated",
      permission: `${formatRoleLabel(roleKey)} -> ${formatRoleLabel(newKey)}`,
      previousAccess: "Source role",
      newAccess: "Duplicate role",
    });
    setSuccess(`Role duplicated as ${formatRoleLabel(newKey)}.`);
  };

  const deleteRole = async (protectedRoles: Set<string>) => {
    if (!deleteRoleKey || !canManage || protectedRoles.has(deleteRoleKey)) return;
    const assigned = allUsers.filter((userRow) => userRow.role === deleteRoleKey);
    if (assigned.length > 0) {
      setError(`Cannot delete "${formatRoleLabel(deleteRoleKey)}" while ${assigned.length} users are assigned.`);
      return;
    }
    setRolePermissions((prev) => {
      const next = { ...prev };
      delete next[deleteRoleKey];
      return next;
    });
    setRoleMeta((prev) => {
      const next = { ...prev };
      delete next[deleteRoleKey];
      return next;
    });
    if (selectedRole === deleteRoleKey) applyRole("admin");
    onPushActivity({
      actor: currentUserName ?? "Super Admin",
      employee: "Role Deleted",
      permission: formatRoleLabel(deleteRoleKey),
      previousAccess: "Role available",
      newAccess: "Role removed",
    });
    setDeleteRoleKey(null);
    setSuccess("Role removed.");
  };

  return {
    rolePermissions,
    roleMeta,
    selectedRole,
    draft,
    saving,
    error,
    success,
    dirty,
    draftMap,
    availableRoles,
    roleModalOpen,
    editingRoleKey,
    roleForm,
    deleteRoleKey,
    pendingAccessRequests,
    setRoleForm,
    setDeleteRoleKey,
    setSuccess,
    setError,
    setRolePermissions,
    bootstrapFromPermissions,
    applyRole,
    setPermission,
    toggleAllInGroup,
    save,
    resetDefaults,
    openRoleModal,
    submitRoleModal,
    duplicateRole,
    deleteRole,
    setRoleModalOpen,
  };
}
