import {
  listJsonSettingsByPrefix,
  listJsonSettingsBySuffix,
  setJsonSetting,
} from "./legacy-settings-store";
import { SETTINGS_BLOB } from "./legacy-tables";
import type { PackageRecord, UpdatePackageInput } from "./package-types";

/**
 * Wizard sections that tbl_packages has no columns for. Each is stored as its own
 * tbl_settings row (`<packageId>:<section>`) so one large section cannot push the
 * others past the TEXT size limit.
 */
export const WIZARD_SECTIONS = [
  "current_step",
  "supplier_name",
  "supplier_source",
  "package_basics",
  "media_frontend",
  "pricing",
  "itinerary",
  "hotels",
  "inclusions",
  "booking_policy",
  "consultant_view",
  "supplier_quote_tool",
  "frontend_faqs",
  "sales_ads_assets",
  "seo",
  "review_publish",
] as const satisfies ReadonlyArray<keyof UpdatePackageInput & keyof PackageRecord>;

type WizardSection = (typeof WIZARD_SECTIONS)[number];

function rowName(packageId: number, section: WizardSection): string {
  return `${packageId}:${section}`;
}

export async function saveWizardSections(
  packageId: number,
  input: Partial<Record<WizardSection, unknown>>
): Promise<void> {
  for (const section of WIZARD_SECTIONS) {
    const value = input[section];
    if (value === undefined) continue;
    await setJsonSetting(SETTINGS_BLOB.packageWizard, rowName(packageId, section), value);
  }
}

/** One section across every package, keyed by package id. */
export async function loadSectionForAllPackages(
  section: WizardSection
): Promise<Map<number, unknown>> {
  const rows = await listJsonSettingsBySuffix(SETTINGS_BLOB.packageWizard, `:${section}`);
  const result = new Map<number, unknown>();
  for (const [name, value] of rows) {
    const id = Number(name.slice(0, -(section.length + 1)));
    if (Number.isInteger(id) && id > 0) result.set(id, value);
  }
  return result;
}

export async function loadWizardSections(
  packageId: number
): Promise<Partial<Record<WizardSection, unknown>>> {
  const rows = await listJsonSettingsByPrefix(SETTINGS_BLOB.packageWizard, `${packageId}:`);
  const result: Partial<Record<WizardSection, unknown>> = {};
  for (const section of WIZARD_SECTIONS) {
    const name = rowName(packageId, section);
    if (rows.has(name)) result[section] = rows.get(name);
  }
  return result;
}
