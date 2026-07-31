import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { query } from "./db";
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
const BUILTIN_ROLE_SET = new Set(BUILTIN_ROLES);

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
  const resolvedRole = BUILTIN_ROLE_SET.has(role) ? role : "admin";
  const rows = await listStoredPermissions(resolvedRole);
  return mergeMatrix(role, rows);
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
