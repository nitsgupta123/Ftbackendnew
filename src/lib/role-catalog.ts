/**
 * Session-only cache of role keys. tbl_roles (via GET /api/permissions) is the source of
 * truth; this only lets open screens react to role changes made elsewhere in the panel.
 */
export const ROLE_CATALOG_CHANGED_EVENT = "ftadmin-roles-changed";

let knownRoles: string[] = [];

export function normalizeRoleKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isValidRoleKey(role: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(role) && role.length >= 2 && role.length <= 60;
}

function publish(roles: string[]): string[] {
  knownRoles = Array.from(
    new Set(roles.map((role) => normalizeRoleKey(role)).filter((role) => isValidRoleKey(role)))
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ROLE_CATALOG_CHANGED_EVENT, { detail: { roles: knownRoles } })
    );
  }
  return knownRoles;
}

export function getKnownRolesFromStorage(): string[] {
  return [...knownRoles];
}

export function rememberKnownRoles(roles: string[]): string[] {
  return publish([...knownRoles, ...roles]);
}

export function rememberKnownRole(role: string): string[] {
  return rememberKnownRoles([role]);
}

export function setKnownRoles(roles: string[]): string[] {
  return publish(roles);
}

export function forgetKnownRole(role: string): string[] {
  const roleKey = normalizeRoleKey(role);
  return publish(knownRoles.filter((knownRole) => knownRole !== roleKey));
}

export function replaceKnownRole(currentRole: string, nextRole: string): string[] {
  const currentKey = normalizeRoleKey(currentRole);
  return publish([...knownRoles.filter((knownRole) => knownRole !== currentKey), nextRole]);
}
