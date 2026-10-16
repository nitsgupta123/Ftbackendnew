import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query } from "./db";
import { LEGACY_TABLES, SETTINGS_BLOB } from "./legacy-tables";

const TABLE = LEGACY_TABLES.settings;

/** tbl_settings.setting_value is VARCHAR(255); full payloads live in setting_content (TEXT). */
const SETTING_VALUE_MAX = 255;
/** TEXT holds 65,535 bytes; non-strict MySQL would silently truncate anything larger. */
const SETTING_CONTENT_MAX_BYTES = 65_535;

function serializeContent(data: unknown): string {
  const content = JSON.stringify(data);
  if (Buffer.byteLength(content, "utf8") > SETTING_CONTENT_MAX_BYTES) {
    throw new Error("Data is too large to save (limit 64 KB per section)");
  }
  return content;
}

type BlobRow = RowDataPacket & {
  id: number;
  setting_name: string | null;
  setting_value: string | null;
  setting_type: string | null;
  setting_content: string | null;
  status: number | null;
  inset_date: Date | string | null;
  update_date: Date | string | null;
};

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clampValue(value: string): string {
  return value.length > SETTING_VALUE_MAX ? value.slice(0, SETTING_VALUE_MAX) : value;
}

async function insertSettingRow(
  name: string,
  value: string,
  settingType: string,
  content: string
): Promise<number> {
  const result = await query<ResultSetHeader>(
    `INSERT INTO ${TABLE}
      (setting_name, setting_value, setting_type, setting_content, setting_link, setting_img,
       inset_date, update_date, status, user_id)
     VALUES (?, ?, ?, ?, '', '', NOW(), NOW(), 1, 0)`,
    [clampValue(name), clampValue(value), settingType, content]
  );
  return Number(result.insertId);
}

/** List JSON blobs stored under a setting_type in tbl_settings. */
export async function listSettingBlobs<T extends object>(
  settingType: string
): Promise<Array<T & { id: number; _rowId: number }>> {
  const rows = await query<BlobRow[]>(
    `SELECT id, setting_name, setting_value, setting_content, status, inset_date, update_date
     FROM ${TABLE}
     WHERE setting_type = ?
     ORDER BY id ASC`,
    [settingType]
  );

  return rows
    .map((row) => {
      const data = parseJson<T>(row.setting_content);
      if (!data) return null;
      const id = Number((data as { id?: number }).id ?? row.id);
      return { ...data, id, _rowId: Number(row.id) };
    })
    .filter(Boolean) as Array<T & { id: number; _rowId: number }>;
}

/**
 * Find a blob by its logical id (the `id` inside the JSON). The logical id is not
 * necessarily the tbl_settings row id (e.g. user_permissions keys by user id), so a
 * row-id match alone is never trusted when the JSON carries a different id.
 */
export async function getSettingBlobById<T extends object>(
  settingType: string,
  id: number
): Promise<(T & { id: number; _rowId: number }) | null> {
  const rows = await query<BlobRow[]>(
    `SELECT id, setting_name, setting_content FROM ${TABLE}
     WHERE setting_type = ? AND (id = ? OR setting_name = ?)
     ORDER BY id ASC`,
    [settingType, id, String(id)]
  );
  for (const row of rows) {
    const data = parseJson<T>(row.setting_content);
    if (!data) continue;
    const logicalId = Number((data as { id?: number }).id ?? row.id);
    if (logicalId !== id) continue;
    return { ...data, id: logicalId, _rowId: Number(row.id) };
  }
  return null;
}

export async function insertSettingBlob<T extends object>(
  settingType: string,
  name: string,
  data: T
): Promise<number> {
  const rowId = await insertSettingRow(name, name, settingType, serializeContent(data));
  // Keep JSON id aligned with row id when caller did not set one
  const withId = { ...data, id: (data as { id?: number }).id ?? rowId };
  await query(
    `UPDATE ${TABLE} SET setting_name = ?, setting_value = ?, setting_content = ?, update_date = NOW() WHERE id = ?`,
    [String(withId.id ?? rowId), clampValue(name), serializeContent(withId), rowId]
  );
  return Number((withId as { id?: number }).id ?? rowId);
}

export async function updateSettingBlob<T extends object>(
  settingType: string,
  id: number,
  data: T
): Promise<boolean> {
  const existing = await getSettingBlobById<T>(settingType, id);
  if (!existing) return false;
  const next = { ...data, id };
  const result = await query<ResultSetHeader>(
    `UPDATE ${TABLE}
     SET setting_content = ?, update_date = NOW(), status = 1
     WHERE id = ? AND setting_type = ?`,
    [serializeContent(next), existing._rowId, settingType]
  );
  return result.affectedRows > 0;
}

export async function deleteSettingBlob(settingType: string, id: number): Promise<boolean> {
  const existing = await getSettingBlobById(settingType, id);
  if (!existing) return false;
  const result = await query<ResultSetHeader>(
    `DELETE FROM ${TABLE} WHERE id = ? AND setting_type = ?`,
    [existing._rowId, settingType]
  );
  return result.affectedRows > 0;
}

export async function getNamedSettingValue(name: string): Promise<string> {
  const rows = await query<BlobRow[]>(
    `SELECT setting_value, setting_content FROM ${TABLE}
     WHERE setting_name = ? AND (setting_type = ? OR setting_type = 'global' OR setting_type IS NULL)
     ORDER BY id DESC LIMIT 1`,
    [name, SETTINGS_BLOB.adminPanel]
  );
  if (!rows.length) return "";
  const content = String(rows[0].setting_content ?? "").trim();
  if (content) return content;
  return String(rows[0].setting_value ?? "").trim();
}

export async function upsertNamedSetting(
  name: string,
  value: string,
  settingType: string = SETTINGS_BLOB.adminPanel
): Promise<void> {
  const existing = await query<BlobRow[]>(
    `SELECT id FROM ${TABLE} WHERE setting_name = ? AND setting_type = ? LIMIT 1`,
    [name, settingType]
  );
  if (existing[0]?.id) {
    await query(
      `UPDATE ${TABLE}
       SET setting_value = ?, setting_content = ?, update_date = NOW(), status = 1
       WHERE id = ?`,
      [clampValue(value), value, existing[0].id]
    );
    return;
  }
  await insertSettingRow(name, value, settingType, value);
}

/** Read a JSON document stored as a named row (setting_type + setting_name). */
export async function getJsonSetting<T>(
  settingType: string,
  name: string,
  fallback: T
): Promise<T> {
  const rows = await query<BlobRow[]>(
    `SELECT setting_content FROM ${TABLE}
     WHERE setting_type = ? AND setting_name = ?
     ORDER BY id DESC LIMIT 1`,
    [settingType, name]
  );
  if (!rows.length) return fallback;
  return parseJson<T>(rows[0].setting_content) ?? fallback;
}

/** Read every named JSON row of a setting_type whose name starts with `prefix`. */
export async function listJsonSettingsByPrefix(
  settingType: string,
  prefix: string
): Promise<Map<string, unknown>> {
  const escaped = prefix.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const rows = await query<BlobRow[]>(
    `SELECT setting_name, setting_content FROM ${TABLE}
     WHERE setting_type = ? AND setting_name LIKE ?
     ORDER BY id ASC`,
    [settingType, `${escaped}%`]
  );
  const result = new Map<string, unknown>();
  for (const row of rows) {
    if (!row.setting_name) continue;
    try {
      result.set(row.setting_name, JSON.parse(String(row.setting_content ?? "null")));
    } catch {
      // Skip unreadable rows rather than failing the whole read.
    }
  }
  return result;
}

/** Read every named JSON row of a setting_type whose name ends with `suffix`. */
export async function listJsonSettingsBySuffix(
  settingType: string,
  suffix: string
): Promise<Map<string, unknown>> {
  const escaped = suffix.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const rows = await query<BlobRow[]>(
    `SELECT setting_name, setting_content FROM ${TABLE}
     WHERE setting_type = ? AND setting_name LIKE ?
     ORDER BY id ASC`,
    [settingType, `%${escaped}`]
  );
  const result = new Map<string, unknown>();
  for (const row of rows) {
    if (!row.setting_name) continue;
    try {
      result.set(row.setting_name, JSON.parse(String(row.setting_content ?? "null")));
    } catch {
      // Skip unreadable rows rather than failing the whole read.
    }
  }
  return result;
}

/** Upsert a JSON document as a named row (setting_type + setting_name). */
export async function setJsonSetting<T>(
  settingType: string,
  name: string,
  data: T
): Promise<void> {
  const content = serializeContent(data);
  const existing = await query<BlobRow[]>(
    `SELECT id FROM ${TABLE} WHERE setting_type = ? AND setting_name = ? ORDER BY id DESC LIMIT 1`,
    [settingType, name]
  );
  if (existing[0]?.id) {
    await query(
      `UPDATE ${TABLE} SET setting_value = ?, setting_content = ?, update_date = NOW(), status = 1 WHERE id = ?`,
      [name, content, existing[0].id]
    );
    return;
  }
  await insertSettingRow(name, name, settingType, content);
}
