import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { getPool, query } from "./db";
import type { AdminRole } from "./auth-types";
import {
  ACCESS_MODULES,
  buildDefaultMatrix,
  defaultPermissionForRole,
  type ModulePermission,
  type PermissionsPayload,
  type RolePermissionMatrix,
} from "./permission-types";

interface PermissionRow extends RowDataPacket {
  role: AdminRole;
  module_key: string;
  can_view: number | boolean;
  can_edit: number | boolean;
  can_delete: number | boolean;
}

const BUILTIN_ROLES: AdminRole[] = ["admin", "super_admin"];

interface UserPermissionRow extends RowDataPacket {
  user_id: number;
  module_key: string;
  can_view: number | boolean;
  can_edit: number | boolean;
  can_delete: number | boolean;
}

let userPermissionsTableReady = false;

async function ensureUserPermissionsTable(): Promise<void> {
  if (userPermissionsTableReady) return;
  await query<ResultSetHeader>(
    `
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        module_key VARCHAR(80) NOT NULL,
        can_view TINYINT(1) NOT NULL DEFAULT 0,
        can_edit TINYINT(1) NOT NULL DEFAULT 0,
        can_delete TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_module (user_id, module_key),
        KEY idx_user_permissions_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  );
  userPermissionsTableReady = true;
}

function mapUserRow(row: UserPermissionRow): ModulePermission {
  return {
    moduleKey: row.module_key,
    canView: Boolean(row.can_view),
    canEdit: Boolean(row.can_edit),
    canDelete: Boolean(row.can_delete),
  };
}

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

function mapRow(row: PermissionRow): ModulePermission {
  return {
    moduleKey: row.module_key,
    canView: Boolean(row.can_view),
    canEdit: Boolean(row.can_edit),
    canDelete: Boolean(row.can_delete),
  };
}

async function listStoredPermissions(role?: AdminRole): Promise<PermissionRow[]> {
  if (role) {
    return query<PermissionRow[]>(
      `
        SELECT role, module_key, can_view, can_edit, can_delete
        FROM role_permissions
        WHERE role = ?
        ORDER BY module_key ASC
      `,
      [role]
    );
  }

  return query<PermissionRow[]>(
    `
      SELECT role, module_key, can_view, can_edit, can_delete
      FROM role_permissions
      ORDER BY role ASC, module_key ASC
    `
  );
}

async function listKnownRoles(): Promise<AdminRole[]> {
  const adminRoles = await query<RowDataPacket[]>(
    `
      SELECT DISTINCT role
      FROM admin_users
      WHERE role IS NOT NULL AND TRIM(role) <> ''
    `
  );
  const permissionRoles = await query<RowDataPacket[]>(
    `
      SELECT DISTINCT role
      FROM role_permissions
      WHERE role IS NOT NULL AND TRIM(role) <> ''
    `
  );
  const merged = new Set<AdminRole>(BUILTIN_ROLES);
  for (const row of [...adminRoles, ...permissionRoles]) {
    const role = String(row.role ?? "").trim();
    if (role) merged.add(role);
  }
  return Array.from(merged);
}

/** Ensure every catalog module has a row for each known role (seeds new modules/roles automatically). */
export async function ensureRolePermissionsSeeded(): Promise<void> {
  const roles = await listKnownRoles();
  for (const role of roles) {
    const existing = await listStoredPermissions(role);
    const existingKeys = new Set(existing.map((row) => row.module_key));

    for (const mod of ACCESS_MODULES) {
      if (existingKeys.has(mod.key)) continue;
      const defaults = defaultPermissionForRole(role, mod.key);
      await query<ResultSetHeader>(
        `
          INSERT INTO role_permissions (role, module_key, can_view, can_edit, can_delete)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE module_key = module_key
        `,
        [
          role,
          defaults.moduleKey,
          defaults.canView ? 1 : 0,
          defaults.canEdit ? 1 : 0,
          defaults.canDelete ? 1 : 0,
        ]
      );
    }
  }
}

function mergeMatrix(
  role: AdminRole,
  rows: PermissionRow[]
): RolePermissionMatrix {
  const byKey = new Map(rows.map((row) => [row.module_key, mapRow(row)]));
  return {
    role,
    permissions: ACCESS_MODULES.map((mod) => {
      const stored = byKey.get(mod.key);
      return stored ?? defaultPermissionForRole(role, mod.key);
    }),
  };
}

export async function getPermissionsPayload(): Promise<PermissionsPayload> {
  await ensureRolePermissionsSeeded();
  const roles = await listKnownRoles();
  const rows = await listStoredPermissions();
  const byRole = new Map<AdminRole, PermissionRow[]>();
  for (const role of roles) {
    byRole.set(role, []);
  }
  for (const row of rows) {
    const role = String(row.role ?? "").trim();
    if (!role) continue;
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role)?.push(row);
  }

  return {
    modules: ACCESS_MODULES,
    matrices: Array.from(byRole.keys()).map((role) =>
      mergeMatrix(role, byRole.get(role) ?? [])
    ),
  };
}

export async function getRolePermissionMatrix(
  role: AdminRole
): Promise<RolePermissionMatrix> {
  await ensureRolePermissionsSeeded();
  const rows = await listStoredPermissions(role);
  return mergeMatrix(role, rows);
}

export async function getUserPermissionOverrides(
  userId: number
): Promise<ModulePermission[]> {
  await ensureUserPermissionsTable();
  const rows = await query<UserPermissionRow[]>(
    `
      SELECT user_id, module_key, can_view, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = ?
      ORDER BY module_key ASC
    `,
    [userId]
  );
  return rows.map(mapUserRow);
}

export async function setUserPermissionOverrides(
  userId: number,
  permissions: ModulePermission[]
): Promise<ModulePermission[]> {
  await ensureUserPermissionsTable();

  const allowedKeys = new Set(ACCESS_MODULES.map((m) => m.key));
  const normalized = permissions
    .filter((perm) => allowedKeys.has(perm.moduleKey))
    .map(normalizeStoredPermission);

  await query<ResultSetHeader>(`DELETE FROM user_permissions WHERE user_id = ?`, [userId]);

  for (const perm of normalized) {
    await query<ResultSetHeader>(
      `
        INSERT INTO user_permissions (user_id, module_key, can_view, can_edit, can_delete)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        userId,
        perm.moduleKey,
        perm.canView ? 1 : 0,
        perm.canEdit ? 1 : 0,
        perm.canDelete ? 1 : 0,
      ]
    );
  }

  return getUserPermissionOverrides(userId);
}

export async function clearUserPermissionOverrides(userId: number): Promise<void> {
  await ensureUserPermissionsTable();
  await query<ResultSetHeader>(`DELETE FROM user_permissions WHERE user_id = ?`, [userId]);
}

/** Role matrix with per-user overrides applied (overrides win when present). */
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

/** Keep only modules that differ from the role defaults. */
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
  await ensureRolePermissionsSeeded();

  const allowedKeys = new Set(ACCESS_MODULES.map((m) => m.key));
  const incoming = new Map<string, ModulePermission>();

  for (const perm of permissions) {
    if (!allowedKeys.has(perm.moduleKey)) continue;
    incoming.set(perm.moduleKey, {
      moduleKey: perm.moduleKey,
      canView: Boolean(perm.canView),
      canEdit: Boolean(perm.canEdit),
      canDelete: Boolean(perm.canDelete),
    });
  }

  for (const mod of ACCESS_MODULES) {
    const next = incoming.get(mod.key) ?? defaultPermissionForRole(role, mod.key);

    // Edit/delete imply view for consistency.
    const canView = next.canView || next.canEdit || next.canDelete;
    const canEdit = next.canEdit;
    const canDelete = next.canDelete;

    await query<ResultSetHeader>(
      `
        INSERT INTO role_permissions (role, module_key, can_view, can_edit, can_delete)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          can_view = VALUES(can_view),
          can_edit = VALUES(can_edit),
          can_delete = VALUES(can_delete),
          updated_at = CURRENT_TIMESTAMP
      `,
      [role, mod.key, canView ? 1 : 0, canEdit ? 1 : 0, canDelete ? 1 : 0]
    );
  }

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

    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT role FROM role_permissions WHERE role = ? LIMIT 1
      `,
      [nextRole]
    );
    const [existingUsers] = await connection.execute<RowDataPacket[]>(
      `
        SELECT role FROM admin_users WHERE role = ? LIMIT 1
      `,
      [nextRole]
    );
    if (existingRows.length || existingUsers.length) {
      throw new Error("A role with that name already exists");
    }

    await connection.execute(
      `UPDATE role_permissions SET role = ? WHERE role = ?`,
      [nextRole, currentRole]
    );
    await connection.execute(
      `UPDATE admin_users SET role = ? WHERE role = ?`,
      [nextRole, currentRole]
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
    await connection.execute(
      `UPDATE admin_users SET role = ? WHERE role = ?`,
      [fallbackRole, role]
    );
    await connection.execute(`DELETE FROM role_permissions WHERE role = ?`, [role]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
