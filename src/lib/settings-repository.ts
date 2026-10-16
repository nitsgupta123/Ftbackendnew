import type { AdminSettings, UpdateAdminSettingsInput } from "./settings-types";
import { getNamedSettingValue, upsertNamedSetting } from "./legacy-settings-store";
import { LEGACY_TABLES, SETTINGS_BLOB } from "./legacy-tables";
import { query } from "./db";
import { APP_TIMEZONE, toIsoSgt } from "./format-date";
import type { RowDataPacket } from "mysql2";

type SettingRow = RowDataPacket & {
  id: number;
  setting_name: string | null;
  setting_value: string | null;
  setting_content: string | null;
  setting_type: string | null;
  update_date: Date | string | null;
};

function pick(
  rows: SettingRow[],
  names: string[],
  fallback = ""
): string {
  const ordered = [
    ...rows.filter((r) => r.setting_type === SETTINGS_BLOB.adminPanel),
    ...rows.filter((r) => r.setting_type !== SETTINGS_BLOB.adminPanel),
  ];
  for (const name of names) {
    const row = ordered.find(
      (r) => String(r.setting_name ?? "").toLowerCase() === name.toLowerCase()
    );
    if (!row) continue;
    const value = (
      String(row.setting_content ?? "").trim() || String(row.setting_value ?? "").trim()
    );
    if (value) return value;
  }
  return fallback;
}

/**
 * Form fields the public website reads from its own "global" rows (setting_value only).
 * These are edited in place so the panel and the site share one value.
 */
const SITE_SETTINGS = {
  homepage_title: "site_title",
  homepage_description: "site_disc",
  support_email: "site_email",
  support_phone: "site_phone",
} as const;

function globalValue(rows: SettingRow[], name: string): string | null {
  const row = rows.find(
    (r) => r.setting_type === "global" && String(r.setting_name ?? "") === name
  );
  return row ? String(row.setting_value ?? "").trim() : null;
}

async function upsertGlobalSetting(name: string, value: string): Promise<void> {
  const existing = await query<RowDataPacket[]>(
    `SELECT id FROM ${LEGACY_TABLES.settings}
     WHERE setting_type = 'global' AND setting_name = ? LIMIT 1`,
    [name]
  );
  if (existing[0]?.id) {
    await query(
      `UPDATE ${LEGACY_TABLES.settings} SET setting_value = ?, update_date = NOW() WHERE id = ?`,
      [value.slice(0, 255), existing[0].id]
    );
    return;
  }
  await upsertNamedSetting(name, value.slice(0, 255), "global");
}

function toBool(value: string): boolean {
  return ["1", "true", "yes", "on", "enabled"].includes(value.toLowerCase());
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  return toIsoSgt(
    value instanceof Date || typeof value === "string" ? value : String(value)
  );
}

async function loadAllRows(): Promise<SettingRow[]> {
  return query<SettingRow[]>(
    `SELECT id, setting_name, setting_value, setting_content, setting_type, update_date
     FROM ${LEGACY_TABLES.settings}
     ORDER BY id ASC`
  );
}

function latestUpdateDate(rows: SettingRow[]): SettingRow["update_date"] | null {
  let latest: SettingRow["update_date"] | null = null;
  let latestTime = -Infinity;
  for (const row of rows) {
    const time = row.update_date ? new Date(row.update_date as string | Date).getTime() : NaN;
    if (Number.isFinite(time) && time > latestTime) {
      latestTime = time;
      latest = row.update_date;
    }
  }
  return latest;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const rows = await loadAllRows();
  const panelRows = rows.filter(
    (r) =>
      String(r.setting_type ?? "") === SETTINGS_BLOB.adminPanel ||
      String(r.setting_type ?? "") === "global"
  );

  const maintenanceRaw =
    pick(panelRows, ["maintenance_mode"]) ||
    (await getNamedSettingValue("maintenance_mode"));

  return {
    site_name:
      pick(panelRows, ["site_name", "site_title"], "Fayyaz Travels") ||
      pick(rows, ["site_title", "site_name"], "Fayyaz Travels"),
    company_name: pick(panelRows, ["company_name"], "Fayyaz Travels"),
    support_email:
      globalValue(rows, SITE_SETTINGS.support_email) ??
      pick(panelRows, ["support_email", "email"], "support@fayyaztravels.com"),
    support_phone:
      globalValue(rows, SITE_SETTINGS.support_phone) ?? pick(panelRows, ["support_phone", "phone"], ""),
    office_address: pick(panelRows, ["office_address", "address"], ""),
    timezone: APP_TIMEZONE,
    homepage_title:
      globalValue(rows, SITE_SETTINGS.homepage_title) ?? pick(panelRows, ["homepage_title"], ""),
    homepage_description:
      globalValue(rows, SITE_SETTINGS.homepage_description) ??
      pick(panelRows, ["homepage_description"], ""),
    maintenance_mode: toBool(maintenanceRaw),
    quote_cc_emails: pick(panelRows, ["quote_cc_emails"], ""),
    quote_bcc_emails: pick(panelRows, ["quote_bcc_emails"], ""),
    updated_at: toIso(latestUpdateDate(panelRows)),
    updated_by: pick(panelRows, ["updated_by"], "") || null,
  };
}

export async function updateAdminSettings(
  input: UpdateAdminSettingsInput,
  updatedBy?: string | null
): Promise<AdminSettings> {
  const pairs: Array<[string, string]> = [
    ["updated_by", updatedBy?.trim() ?? ""],
    ["site_name", input.site_name],
    ["company_name", input.company_name],
    ["office_address", input.office_address],
    ["timezone", APP_TIMEZONE],
    ["maintenance_mode", input.maintenance_mode ? "1" : "0"],
    ["quote_cc_emails", input.quote_cc_emails],
    ["quote_bcc_emails", input.quote_bcc_emails],
  ];

  for (const [name, value] of pairs) {
    await upsertNamedSetting(name, value ?? "", SETTINGS_BLOB.adminPanel);
  }
  for (const [field, globalName] of Object.entries(SITE_SETTINGS) as [
    keyof typeof SITE_SETTINGS,
    string,
  ][]) {
    await upsertGlobalSetting(globalName, String(input[field] ?? "").trim());
  }
  // Panel-only copies of these fields are superseded by the global rows.
  await query(
    `DELETE FROM ${LEGACY_TABLES.settings}
     WHERE setting_type = ? AND setting_name IN (${Object.keys(SITE_SETTINGS).map(() => "?").join(",")})`,
    [SETTINGS_BLOB.adminPanel, ...Object.keys(SITE_SETTINGS)]
  );

  return getAdminSettings();
}
