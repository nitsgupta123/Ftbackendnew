import { useCallback, useMemo, useState } from "react";
import { resetRolePermissions, updateRolePermissions } from "@/lib/permission-api";
import type { AdminRole } from "@/lib/auth-types";
import type { AccessModuleDefinition, ModulePermission } from "@/lib/permission-types";
import type { ActivityItem, ExtendedPermission, PermissionKey } from "./types";

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

function applyToggle(row: ExtendedPermission, field: PermissionKey, value: boolean): ExtendedPermission {
  const next = { ...row, [field]: value };
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
  return next;
}

type UseRolePermissionsArgs = {
  canManage: boolean;
  currentUserName?: string;
  formatRoleLabel: (role: string) => string;
  refreshMyPermissions: () => Promise<void>;
  onPushActivity: (entry: Omit<ActivityItem, "id" | "createdAt">) => void;
};

export function useRolePermissions({
  canManage,
  currentUserName,
  formatRoleLabel,
  refreshMyPermissions,
  onPushActivity,
}: UseRolePermissionsArgs) {
  const [rolePermissions, setRolePermissions] = useState<Record<string, ExtendedPermission[]>>({});
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [draft, setDraft] = useState<ExtendedPermission[]>([]);
  const [saved, setSaved] = useState<ExtendedPermission[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const availableRoles = useMemo(() => Object.keys(rolePermissions), [rolePermissions]);
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
    },
    []
  );

  const setPermission = (moduleKey: string, field: PermissionKey, value: boolean) => {
    setDraft((prev) =>
      prev.map((row) => (row.moduleKey === moduleKey ? applyToggle(row, field, value) : row))
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
      prev.map((row) => (keys.has(row.moduleKey) ? applyToggle(row, field, value) : row))
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

  return {
    rolePermissions,
    selectedRole,
    draft,
    saving,
    error,
    success,
    dirty,
    draftMap,
    availableRoles,
    setSuccess,
    setError,
    setRolePermissions,
    bootstrapFromPermissions,
    applyRole,
    setPermission,
    toggleAllInGroup,
    save,
    resetDefaults,
  };
}
