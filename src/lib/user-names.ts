import type { RowDataPacket } from "mysql2";
import { query } from "./db";
import { LEGACY_TABLES } from "./legacy-tables";

/** Display names for tbl_user ids (first + last name, falling back to email). */
export async function loadUserNameMap(userIds: unknown[]): Promise<Map<number, string>> {
  const ids = [...new Set(userIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const names = new Map<number, string>();
  if (!ids.length) return names;
  const rows = await query<RowDataPacket[]>(
    `SELECT id, first_name, last_name, user_email FROM ${LEGACY_TABLES.users}
     WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  for (const row of rows) {
    const name =
      [row.first_name, row.last_name].map((part) => String(part ?? "").trim()).filter(Boolean).join(" ") ||
      String(row.user_email ?? "").trim();
    if (name) names.set(Number(row.id), name);
  }
  return names;
}

export function userLabel(userId: unknown, names: Map<number, string>): string | null {
  const id = Number(userId);
  if (!id) return null;
  return names.get(id) ?? `User #${id}`;
}
