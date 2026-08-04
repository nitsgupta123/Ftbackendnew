const STORAGE_KEY = "ftadmin-known-roles-v1";
export const ROLE_CATALOG_CHANGED_EVENT = "ftadmin-roles-changed";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

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

export function getKnownRolesFromStorage(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map((value) => normalizeRoleKey(String(value ?? "")))
          .filter((role) => isValidRoleKey(role))
      )
    );
  } catch {
    return [];
  }
}

export function rememberKnownRoles(roles: string[]): string[] {
  if (!canUseStorage()) return [];
  const merged = Array.from(
    new Set(
      [...getKnownRolesFromStorage(), ...roles]
        .map((role) => normalizeRoleKey(role))
        .filter((role) => isValidRoleKey(role))
    )
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(
    new CustomEvent(ROLE_CATALOG_CHANGED_EVENT, { detail: { roles: merged } })
  );
  return merged;
}

export function rememberKnownRole(role: string): string[] {
  return rememberKnownRoles([role]);
}
