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
  for (const name of names) {
    const row = rows.find(
      (r) => String(r.setting_name ?? "").toLowerCase() === name.toLowerCase()
    );
    if (!row) continue;
    const value = String(row.setting_value ?? row.setting_content ?? "").trim();
    if (value) return value;
  }
  return fallback;
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
    support_email: pick(panelRows, ["support_email", "email"], "support@fayyaztravels.com"),
    support_phone: pick(panelRows, ["support_phone", "phone"], ""),
    office_address: pick(panelRows, ["office_address", "address"], ""),
    timezone: APP_TIMEZONE,
    homepage_title: pick(panelRows, ["homepage_title", "site_title"], ""),
    homepage_description: pick(panelRows, ["homepage_description"], ""),
    maintenance_mode: toBool(maintenanceRaw),
    quote_cc_emails: pick(panelRows, ["quote_cc_emails"], ""),
    quote_bcc_emails: pick(panelRows, ["quote_bcc_emails"], ""),
    updated_at: toIso(panelRows[0]?.update_date ?? rows[0]?.update_date),
    updated_by: null,
  };
}

export async function updateAdminSettings(
  input: UpdateAdminSettingsInput,
  _updatedBy?: string | null
): Promise<AdminSettings> {
  const pairs: Array<[string, string]> = [
    ["site_name", input.site_name],
    ["company_name", input.company_name],
    ["support_email", input.support_email],
    ["support_phone", input.support_phone],
    ["office_address", input.office_address],
    ["timezone", APP_TIMEZONE],
    ["homepage_title", input.homepage_title],
    ["homepage_description", input.homepage_description],
    ["maintenance_mode", input.maintenance_mode ? "1" : "0"],
    ["quote_cc_emails", input.quote_cc_emails],
    ["quote_bcc_emails", input.quote_bcc_emails],
  ];

  for (const [name, value] of pairs) {
    await upsertNamedSetting(name, value ?? "", SETTINGS_BLOB.adminPanel);
  }

  return getAdminSettings();
}
