import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { query } from "./db";
import type { AdminSettings, UpdateAdminSettingsInput } from "./settings-types";
import { parseEmailList, formatEmailList } from "./email-list";

interface SettingsRow extends RowDataPacket {
  site_name: string | null;
  company_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  office_address: string | null;
  timezone: string | null;
  homepage_title: string | null;
  homepage_description: string | null;
  maintenance_mode: number | boolean | null;
  quote_cc_emails: string | null;
  quote_bcc_emails: string | null;
  updated_at: Date | string | null;
  updated_by: string | null;
}

function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value);
}

function asIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeStoredEmailList(value: unknown): string {
  return formatEmailList(parseEmailList(asString(value, "")));
}

function mapSettings(row?: SettingsRow): AdminSettings {
  return {
    site_name: asString(row?.site_name, "Fayyaz Travels Admin"),
    company_name: asString(row?.company_name, "Fayyaz Travels"),
    support_email: asString(row?.support_email, ""),
    support_phone: asString(row?.support_phone, ""),
    office_address: asString(row?.office_address, ""),
    timezone: asString(row?.timezone, "Asia/Kolkata"),
    homepage_title: asString(row?.homepage_title, "Welcome to Fayyaz Travels"),
    homepage_description: asString(row?.homepage_description, ""),
    maintenance_mode: Boolean(row?.maintenance_mode),
    quote_cc_emails: normalizeStoredEmailList(row?.quote_cc_emails),
    quote_bcc_emails: normalizeStoredEmailList(row?.quote_bcc_emails),
    updated_at: asIsoDate(row?.updated_at),
    updated_by: asString(row?.updated_by, "") || null,
  };
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const rows = await query<SettingsRow[]>(
    `
      SELECT
        site_name,
        company_name,
        support_email,
        support_phone,
        office_address,
        timezone,
        homepage_title,
        homepage_description,
        maintenance_mode,
        quote_cc_emails,
        quote_bcc_emails,
        updated_at,
        updated_by
      FROM admin_settings
      WHERE id = 1
      LIMIT 1
    `
  );

  return mapSettings(rows[0]);
}

export async function updateAdminSettings(
  input: UpdateAdminSettingsInput,
  updatedBy: string | null
): Promise<AdminSettings> {
  const quoteCc = formatEmailList(parseEmailList(input.quote_cc_emails));
  const quoteBcc = formatEmailList(parseEmailList(input.quote_bcc_emails));

  await query<ResultSetHeader>(
    `
      INSERT INTO admin_settings (
        id,
        site_name,
        company_name,
        support_email,
        support_phone,
        office_address,
        timezone,
        homepage_title,
        homepage_description,
        maintenance_mode,
        quote_cc_emails,
        quote_bcc_emails,
        updated_by
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        site_name = VALUES(site_name),
        company_name = VALUES(company_name),
        support_email = VALUES(support_email),
        support_phone = VALUES(support_phone),
        office_address = VALUES(office_address),
        timezone = VALUES(timezone),
        homepage_title = VALUES(homepage_title),
        homepage_description = VALUES(homepage_description),
        maintenance_mode = VALUES(maintenance_mode),
        quote_cc_emails = VALUES(quote_cc_emails),
        quote_bcc_emails = VALUES(quote_bcc_emails),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      input.site_name,
      input.company_name,
      input.support_email,
      input.support_phone,
      input.office_address,
      input.timezone,
      input.homepage_title,
      input.homepage_description,
      input.maintenance_mode ? 1 : 0,
      quoteCc,
      quoteBcc,
      updatedBy,
    ]
  );

  return getAdminSettings();
}
