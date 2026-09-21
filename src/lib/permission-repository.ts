import { getPool, query } from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { AdminRole } from "./auth-types";
import {
  listLegacyRoleKeys,
  resolveRoleTypeId,
  ROLES_TABLE,
  USERS_TABLE,
} from "./auth-repository";
import {
  ACCESS_MODULES,
  buildDefaultMatrix,
  defaultPermissionForRole,
  type ModulePermission,
  type PermissionsPayload,
  type RolePermissionMatrix,
} from "./permission-types";
import {
  deleteSettingBlob,
  getSettingBlobById,
  insertSettingBlob,
  updateSettingBlob,
} from "./legacy-settings-store";
import { SETTINGS_BLOB } from "./legacy-tables";

const BUILTIN_ROLES: AdminRole[] = ["admin", "super_admin"];

type RoleRow = RowDataPacket & {
  id: number;
  role_name: string;
  roles: string | null;
};

function normalizeStoredPermission(perm: ModulePermission): ModulePermission {
  const canEdit = Boolean(perm.canEdit);
  const canDelete = Boolean(perm.canDelete);
  const canView = Boolean(perm.canView) || canEdit || canDelete;
  return {
    moduleKey: perm.moduleKey,
    canView,
    canEdit,
    canDelete,
  };
}

function permissionsEqual(a: ModulePermission, b: ModulePermission): boolean {
  return (
    a.moduleKey === b.moduleKey &&
    a.canView === b.canView &&
    a.canEdit === b.canEdit &&
    a.canDelete === b.canDelete
  );
}

function roleKeyFromName(roleName: string): AdminRole {
  const key = roleName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (key === "superadmin" || key === "super_admin") return "super_admin";
  return (key || "admin") as AdminRole;
}

function parseRolesColumn(raw: string | null | undefined, role: AdminRole): ModulePermission[] {
  const text = String(raw ?? "").trim();
  if (!text) return buildDefaultMatrix(role).permissions;

  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as
        | ModulePermission[]
        | { permissions?: ModulePermission[] };
      const list = Array.isArray(parsed) ? parsed : parsed.permissions;
      if (Array.isArray(list) && list.length) {
        const byKey = new Map(
          list
            .filter((p) => p && typeof p.moduleKey === "string")
            .map((p) => [p.moduleKey, normalizeStoredPermission(p)])
        );
        return ACCESS_MODULES.map(
          (mod) => byKey.get(mod.key) ?? defaultPermissionForRole(role, mod.key)
        );
      }
    } catch {
      // fall through to CSV / defaults
    }
  }

  // Legacy CSV permission keys → allow full access for known panel modules when
  // the role already has broad legacy rights (super admin / admin heuristics).
  if (role === "super_admin") {
    return buildDefaultMatrix(role).permissions;
  }

  const tokens = new Set(
    text
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );

  return ACCESS_MODULES.map((mod) => {
    const key = mod.key.toLowerCase();
    const canView =
      tokens.has(key) ||
      tokens.has(`${key}_view`) ||
      [...tokens].some((t) => t.startsWith(key));
    const canEdit = tokens.has(`${key}_edit`) || tokens.has(`${key}_add`) || canView;
    const canDelete = tokens.has(`${key}_delete`);
    if (!canView && !canEdit && !canDelete) {
      return defaultPermissionForRole(role, mod.key);
    }
    return normalizeStoredPermission({
      moduleKey: mod.key,
      canView: canView || canEdit || canDelete,
      canEdit,
      canDelete,
    });
  });
}

async function listRoleRows(): Promise<RoleRow[]> {
  return query<RoleRow[]>(
    `SELECT id, role_name, roles FROM ${ROLES_TABLE} WHERE status = 1 ORDER BY id ASC`
  );
}

async function listKnownRoles(): Promise<AdminRole[]> {
  const legacyRoles = await listLegacyRoleKeys();
  return Array.from(new Set<AdminRole>([...BUILTIN_ROLES, ...legacyRoles]));
}

function mergeMatrix(role: AdminRole, permissions: ModulePermission[]): RolePermissionMatrix {
  const byKey = new Map(permissions.map((p) => [p.moduleKey, p]));
  return {
    role,
    permissions: ACCESS_MODULES.map(
      (mod) => byKey.get(mod.key) ?? defaultPermissionForRole(role, mod.key)
    ),
  };
}

async function loadRolePermissions(role: AdminRole): Promise<ModulePermission[]> {
  const rows = await listRoleRows();
  const match = rows.find((row) => roleKeyFromName(String(row.role_name ?? "")) === role);
  if (!match) return buildDefaultMatrix(role).permissions;
  return parseRolesColumn(match.roles, role);
}

/** No-op seed — permissions live on tbl_roles.roles. */
export async function ensureRolePermissionsSeeded(): Promise<void> {
  // intentionally empty — do not CREATE tables
}

export async function getPermissionsPayload(): Promise<PermissionsPayload> {
  const roles = await listKnownRoles();
  const matrices = await Promise.all(
    roles.map(async (role) => mergeMatrix(role, await loadRolePermissions(role)))
  );
  return { modules: ACCESS_MODULES, matrices };
}

export async function getRolePermissionMatrix(
  role: AdminRole
): Promise<RolePermissionMatrix> {
  return mergeMatrix(role, await loadRolePermissions(role));
}

export async function getUserPermissionOverrides(
  userId: number
): Promise<ModulePermission[]> {
  const blob = await getSettingBlobById<{ permissions?: ModulePermission[] }>(
    SETTINGS_BLOB.userPermissions,
    userId
  );
  if (!blob?.permissions?.length) return [];
  return blob.permissions.map(normalizeStoredPermission);
}

export async function setUserPermissionOverrides(
  userId: number,
  permissions: ModulePermission[]
): Promise<ModulePermission[]> {
  const allowedKeys = new Set(ACCESS_MODULES.map((m) => m.key));
  const normalized = permissions
    .filter((perm) => allowedKeys.has(perm.moduleKey))
    .map(normalizeStoredPermission);

  const existing = await getSettingBlobById(SETTINGS_BLOB.userPermissions, userId);
  const payload = { id: userId, permissions: normalized };
  if (existing) {
    await updateSettingBlob(SETTINGS_BLOB.userPermissions, userId, payload);
  } else {
    await insertSettingBlob(SETTINGS_BLOB.userPermissions, `user_${userId}`, payload);
  }
  return getUserPermissionOverrides(userId);
}

export async function clearUserPermissionOverrides(userId: number): Promise<void> {
  await deleteSettingBlob(SETTINGS_BLOB.userPermissions, userId);
}

export async function getEffectivePermissionMatrix(
  userId: number,
  role: AdminRole
): Promise<RolePermissionMatrix> {
  const roleMatrix = await getRolePermissionMatrix(role);
  const overrides = await getUserPermissionOverrides(userId);
  if (!overrides.length) return roleMatrix;

  const overrideMap = new Map(overrides.map((row) => [row.moduleKey, row]));
  return {
    role,
    permissions: roleMatrix.permissions.map((row) => overrideMap.get(row.moduleKey) ?? row),
  };
}

export function diffFromRoleDefaults(
  rolePermissions: ModulePermission[],
  overrides: ModulePermission[]
): ModulePermission[] {
  const roleMap = new Map(rolePermissions.map((row) => [row.moduleKey, row]));
  return overrides
    .map(normalizeStoredPermission)
    .filter((row) => {
      const roleDefault = roleMap.get(row.moduleKey);
      if (!roleDefault) return true;
      return !permissionsEqual(row, roleDefault);
    });
}

export async function updateRolePermissions(
  role: AdminRole,
  permissions: ModulePermission[]
): Promise<RolePermissionMatrix> {
  const allowedKeys = new Set(ACCESS_MODULES.map((m) => m.key));
  const incoming = new Map<string, ModulePermission>();

  for (const perm of permissions) {
    if (!allowedKeys.has(perm.moduleKey)) continue;
    incoming.set(perm.moduleKey, normalizeStoredPermission(perm));
  }

  const next = ACCESS_MODULES.map((mod) => {
    const value = incoming.get(mod.key) ?? defaultPermissionForRole(role, mod.key);
    return normalizeStoredPermission(value);
  });

  const roleTypeId = await resolveRoleTypeId(role);
  await query<ResultSetHeader>(
    `UPDATE ${ROLES_TABLE} SET roles = ?, edit_date = NOW() WHERE id = ?`,
    [JSON.stringify(next), Number(roleTypeId)]
  );

  return getRolePermissionMatrix(role);
}

export async function resetRolePermissions(
  role: AdminRole
): Promise<RolePermissionMatrix> {
  const defaults = buildDefaultMatrix(role);
  return updateRolePermissions(role, defaults.permissions);
}

export async function renameRole(
  currentRole: AdminRole,
  nextRole: AdminRole
): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const currentTypeId = await resolveRoleTypeId(currentRole);
    const nextLabel = nextRole
      .split("_")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ");

    const [nameClash] = await connection.query<RowDataPacket[]>(
      `
        SELECT id FROM ${ROLES_TABLE}
        WHERE id <> ?
          AND LOWER(REPLACE(TRIM(role_name), ' ', '_')) = ?
        LIMIT 1
      `,
      [Number(currentTypeId), nextRole.toLowerCase()]
    );
    if (nameClash.length) {
      throw new Error("A role with that name already exists");
    }

    await connection.query(
      `UPDATE ${ROLES_TABLE} SET role_name = ?, edit_date = NOW() WHERE id = ?`,
      [nextLabel || nextRole, Number(currentTypeId)]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteRole(
  role: AdminRole,
  fallbackRole: AdminRole = "admin"
): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const roleTypeId = await resolveRoleTypeId(role);
    const fallbackTypeId = await resolveRoleTypeId(fallbackRole);
    await connection.query(
      `UPDATE ${USERS_TABLE} SET user_type = ?, edit_date = NOW() WHERE user_type = ?`,
      [fallbackTypeId, roleTypeId]
    );
    await connection.query(
      `UPDATE ${ROLES_TABLE} SET status = 2, edit_date = NOW() WHERE id = ?`,
      [Number(roleTypeId)]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
