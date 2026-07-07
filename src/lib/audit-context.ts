/** HTTP header sent by the admin UI to identify the acting user for audit fields. */
export const AUDIT_USER_HEADER = "x-audit-user";

/** Default audit label when no authenticated user is available (e.g. scripts). */
export const DEFAULT_AUDIT_USER =
  process.env.NEXT_PUBLIC_AUDIT_USER ?? "Admin User";

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
