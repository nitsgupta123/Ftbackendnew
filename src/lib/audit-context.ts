/** HTTP header sent by the admin UI to identify the acting user for audit fields. */
export const AUDIT_USER_HEADER = "x-audit-user";

function readEnv(key: string): string | undefined {
  try {
    const viteValue = import.meta.env?.[key as keyof ImportMetaEnv];
    if (typeof viteValue === "string" && viteValue.trim()) return viteValue.trim();
  } catch {
    // ignore — server contexts without Vite env
  }
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[key] ?? process.env[key.replace(/^VITE_/, "")];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Default audit label when no authenticated user is available (e.g. scripts). */
export const DEFAULT_AUDIT_USER = readEnv("VITE_AUDIT_USER") || "Admin User";

export interface PackageAuditContext {
  user: string;
}

export function resolveAuditUser(headerValue?: string | string[] | null): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const trimmed = raw?.trim();
  return trimmed || DEFAULT_AUDIT_USER;
}

export function auditContextFromHeader(
  headerValue?: string | string[] | null
): PackageAuditContext {
  return { user: resolveAuditUser(headerValue) };
}
