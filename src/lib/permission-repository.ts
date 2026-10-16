import { getPool, query } from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { AdminRole } from "./auth-types";
import {
  findRoleTypeId,
  listLegacyRoleKeys,
  resolveRoleTypeId,
  ROLES_TABLE,
  USERS_TABLE,
} from "./auth-repository";
import { normalizeRoleKey } from "./role-catalog";
import {
  ACCESS_MODULES,
  buildDefaultMatrix,
  defaultPermissionForRole,
  PACKAGE_STEP_PERMISSION_KEYS,
  type ModulePermission,
  type PermissionsPayload,
  type RolePermissionMatrix,
} from "./permission-types";
import {
  deleteSettingBlob,
  getJsonSetting,
  getSettingBlobById,
  insertSettingBlob,
  setJsonSetting,
  updateSettingBlob,
} from "./legacy-settings-store";
import { LEGACY_TABLES, SETTINGS_BLOB } from "./legacy-tables";

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

const PACKAGE_MODULES = [
  "packages",
  "package_categories",
  "package_templates",
  "pricing_rules",
  "suppliers",
  ...Object.values(PACKAGE_STEP_PERMISSION_KEYS),
  "exclusions",
];

/** Legacy admin permission token (tbl_roles.roles CSV) → panel modules it grants. */
const LEGACY_TOKEN_MODULES: Record<string, string[]> = {
  blog_data: ["blogs"],
  blog_category: ["blog_categories"],
  page_data: ["pages"],
  packages: PACKAGE_MODULES,
  enquirys: ["enquiries"],
  website_settings: ["settings"],
  users: ["users"],
  manage_roles: ["roles"],
};

const CONTENT_TOKENS = ["blog_data", "page_data", "packages"];

function parseLegacyTokens(raw: string | null | undefined, role: AdminRole): ModulePermission[] {
  if (role === "super_admin") return buildDefaultMatrix(role).permissions;

  const tokens = new Set(
    String(raw ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );
  const granted = new Map<string, ModulePermission>();
  const grant = (moduleKey: string, view: boolean, edit: boolean, remove: boolean) => {
    const current = granted.get(moduleKey) ?? { moduleKey, canView: false, canEdit: false, canDelete: false };
    granted.set(moduleKey, {
      moduleKey,
      canView: current.canView || view || edit || remove,
      canEdit: current.canEdit || edit,
      canDelete: current.canDelete || remove,
    });
  };

  for (const [token, modules] of Object.entries(LEGACY_TOKEN_MODULES)) {
    const view = tokens.has(token) || tokens.has(`${token}_view`);
    const edit = tokens.has(`${token}_add`) || tokens.has(`${token}_edit`);
    const remove = tokens.has(`${token}_delete`);
    if (!view && !edit && !remove) continue;
    for (const moduleKey of modules) grant(moduleKey, view, edit, remove);
  }
  if (tokens.size) grant("dashboard", true, false, false);
  if (CONTENT_TOKENS.some((token) => tokens.has(`${token}_add`) || tokens.has(`${token}_edit`))) {
    grant("media", true, true, false);
  }

  return ACCESS_MODULES.map((mod) => {
    const fromTokens = granted.get(mod.key);
    if (fromTokens) return fromTokens;
    if (BUILTIN_ROLES.includes(role)) return defaultPermissionForRole(role, mod.key);
    return { moduleKey: mod.key, canView: false, canEdit: false, canDelete: false };
  });
}

function rolePermissionsBlobName(roleId: number): string {
  return `role_${roleId}`;
}

async function loadPanelRolePermissions(roleId: number): Promise<ModulePermission[] | null> {
  const stored = await getJsonSetting<ModulePermission[] | null>(
    SETTINGS_BLOB.rolePermissions,
    rolePermissionsBlobName(roleId),
    null
  );
  if (!Array.isArray(stored) || !stored.length) return null;
  return stored.filter((p) => p && typeof p.moduleKey === "string").map(normalizeStoredPermission);
}

function parseRolesColumn(raw: string | null | undefined, role: AdminRole): ModulePermission[] {
  const text = String(raw ?? "").trim();
  if (!text) return buildDefaultMatrix(role).permissions;
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as ModulePermission[] | { permissions?: ModulePermission[] };
      const list = Array.isArray(parsed) ? parsed : parsed.permissions;
      if (Array.isArray(list) && list.length) {
        const byKey = new Map(
          list
            .filter((p) => p && typeof p.moduleKey === "string")
            .map((p) => [p.moduleKey, normalizeStoredPermission(p)])
        );
        return ACCESS_MODULES.map((mod) => byKey.get(mod.key) ?? defaultPermissionForRole(role, mod.key));
      }
    } catch {
      // fall through to legacy tokens
    }
  }
  return parseLegacyTokens(text, role);
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
  const panel = await loadPanelRolePermissions(Number(match.id));
  if (panel) {
    const byKey = new Map(panel.map((p) => [p.moduleKey, p]));
    const legacy = parseRolesColumn(match.roles, role);
    return legacy.map((perm) => byKey.get(perm.moduleKey) ?? perm);
  }
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

  // tbl_roles.roles keeps the legacy admin's CSV tokens; the panel matrix lives in tbl_settings.
  const roleTypeId = Number(await resolveRoleTypeId(role));
  await setJsonSetting(SETTINGS_BLOB.rolePermissions, rolePermissionsBlobName(roleTypeId), next);
  await query<ResultSetHeader>(`UPDATE ${ROLES_TABLE} SET edit_date = NOW() WHERE id = ?`, [roleTypeId]);

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

    const currentTypeId = await findRoleTypeId(currentRole);
    if (!currentTypeId) throw new Error("Role not found");
    const nextLabel = nextRole
      .split("_")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ");

    const nextKey = normalizeRoleKey(nextRole);
    const [roleRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, role_name FROM ${ROLES_TABLE} WHERE id <> ?`,
      [Number(currentTypeId)]
    );
    if (roleRows.some((row) => normalizeRoleKey(String(row.role_name ?? "")) === nextKey)) {
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
    if (BUILTIN_ROLES.includes(role)) throw new Error("Built-in roles cannot be deleted");
    const match = (await listRoleRows()).find(
      (row) => roleKeyFromName(String(row.role_name ?? "")) === role
    );
    if (!match) return;
    const fallbackTypeId = await resolveRoleTypeId(fallbackRole);
    await connection.beginTransaction();
    await connection.query(
      `UPDATE ${USERS_TABLE} SET user_type = ?, edit_date = NOW() WHERE user_type = ?`,
      [fallbackTypeId, String(match.id)]
    );
    await connection.query(`DELETE FROM ${ROLES_TABLE} WHERE id = ?`, [match.id]);
    await connection.query(
      `DELETE FROM ${LEGACY_TABLES.settings} WHERE setting_type = ? AND setting_name = ?`,
      [SETTINGS_BLOB.rolePermissions, rolePermissionsBlobName(Number(match.id))]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
