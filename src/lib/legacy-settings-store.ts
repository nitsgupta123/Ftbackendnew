import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query } from "./db";
import { LEGACY_TABLES, SETTINGS_BLOB } from "./legacy-tables";

const TABLE = LEGACY_TABLES.settings;

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

export async function getSettingBlobById<T extends object>(
  settingType: string,
  id: number
): Promise<(T & { id: number; _rowId: number }) | null> {
  const rows = await query<BlobRow[]>(
    `SELECT id, setting_content FROM ${TABLE}
     WHERE setting_type = ? AND (id = ? OR setting_name = ?)
     LIMIT 1`,
    [settingType, id, String(id)]
  );
  if (!rows.length) return null;
  const data = parseJson<T>(rows[0].setting_content);
  if (!data) return null;
  return {
    ...data,
    id: Number((data as { id?: number }).id ?? rows[0].id),
    _rowId: Number(rows[0].id),
  };
}

export async function insertSettingBlob<T extends object>(
  settingType: string,
  name: string,
  data: T
): Promise<number> {
  const result = await query<ResultSetHeader>(
    `INSERT INTO ${TABLE}
      (setting_name, setting_value, setting_type, setting_content, inset_date, update_date, status, user_id)
     VALUES (?, ?, ?, ?, NOW(), NOW(), 1, 0)`,
    [name, name, settingType, JSON.stringify(data)]
  );
  const rowId = Number(result.insertId);
  // Keep JSON id aligned with row id when caller did not set one
  const withId = { ...data, id: (data as { id?: number }).id ?? rowId };
  await query(
    `UPDATE ${TABLE} SET setting_name = ?, setting_value = ?, setting_content = ?, update_date = NOW() WHERE id = ?`,
    [String(withId.id ?? rowId), name, JSON.stringify(withId), rowId]
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
    [JSON.stringify(next), existing._rowId, settingType]
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
  return String(rows[0].setting_value ?? rows[0].setting_content ?? "").trim();
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
      [value, value, existing[0].id]
    );
    return;
  }
  await query(
    `INSERT INTO ${TABLE}
      (setting_name, setting_value, setting_type, setting_content, inset_date, update_date, status, user_id)
     VALUES (?, ?, ?, ?, NOW(), NOW(), 1, 0)`,
    [name, value, settingType, value]
  );
}
