import type { PackageAuditContext } from "./audit-context";
import {
  deleteSettingBlob,
  getSettingBlobById,
  insertSettingBlob,
  listSettingBlobs,
  updateSettingBlob,
} from "./legacy-settings-store";
import { SETTINGS_BLOB } from "./legacy-tables";
import { nowIsoSgt } from "./format-date";
import { slugify, uniqueSlug } from "./slug";
import type {
  ApplyPackageTemplateResult,
  CreatePackageTemplateInput,
  ListPackageTemplatesParams,
  ListPackageTemplatesResult,
  PackageTemplateRecord,
  PackageTemplatesStats,
  UpdatePackageTemplateInput,
} from "./package-template-types";
import type { PackageSectionKey, UpdatePackageInput } from "./package-types";
import { TEMPLATE_STEP_OPTIONS } from "./package-template-types";

type StoredTemplate = PackageTemplateRecord & { _rowId?: number };

const SECTION_COLUMNS = [
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
] as const satisfies readonly PackageSectionKey[];

function nowIso(): string {
  return nowIsoSgt();
}

function stripRow(template: StoredTemplate): PackageTemplateRecord {
  const { _rowId: _omit, ...rest } = template;
  return rest;
}

async function loadAll(): Promise<StoredTemplate[]> {
  return listSettingBlobs<PackageTemplateRecord>(SETTINGS_BLOB.packageTemplate);
}

function normalizeIncludedSteps(steps?: number[]): number[] {
  if (!steps?.length) return [2];
  return [
    ...new Set(steps.filter((step) => Number.isInteger(step) && step >= 1 && step <= 13)),
  ].sort((a, b) => a - b);
}

function inferTemplateType(steps: number[]): "full" | "partial" {
  return steps.length >= 8 ? "full" : "partial";
}

async function clearOtherDefaults(excludeId?: number): Promise<void> {
  const all = await loadAll();
  for (const template of all) {
    if (!template.is_default) continue;
    if (excludeId && template.id === excludeId) continue;
    await updateSettingBlob(SETTINGS_BLOB.packageTemplate, template.id, {
      ...stripRow(template),
      is_default: false,
    });
  }
}

export async function resolveTemplateSlug(
  name: string,
  requestedSlug?: string,
  excludeId?: number
): Promise<string> {
  const base = requestedSlug?.trim() ? slugify(requestedSlug) : slugify(name);
  if (!base) throw new Error("Unable to generate a valid slug");
  const existing = (await loadAll())
    .filter((t) => t.id !== excludeId)
    .map((t) => t.slug);
  if (!existing.includes(base)) return base;
  return uniqueSlug(base, existing);
}

export async function listPackageTemplates(
  params: ListPackageTemplatesParams = {}
): Promise<ListPackageTemplatesResult> {
  const {
    search,
    status = "all",
    template_type = "all",
    sort = "display_order",
    order = "asc",
    page = 1,
    limit = 20,
    activeOnly = false,
  } = params;

  let templates = (await loadAll()).map(stripRow);

  if (activeOnly || status === "active") templates = templates.filter((t) => t.status === "active");
  else if (status === "inactive") templates = templates.filter((t) => t.status === "inactive");

  if (template_type === "full" || template_type === "partial") {
    templates = templates.filter((t) => t.template_type === template_type);
  }

  if (search?.trim()) {
    const term = search.trim().toLowerCase();
    templates = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        (t.description ?? "").toLowerCase().includes(term)
    );
  }

  templates.sort((a, b) => {
    const dir = order === "desc" ? -1 : 1;
    if (sort === "created_at") return a.created_at.localeCompare(b.created_at) * dir;
    if (sort === "usage_count") return (a.usage_count - b.usage_count) * dir;
    return (a.display_order - b.display_order) * dir || a.name.localeCompare(b.name);
  });

  const total = templates.length;
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  return {
    templates: templates.slice(offset, offset + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}

export async function getPackageTemplateStats(): Promise<PackageTemplatesStats> {
  const templates = (await loadAll()).map(stripRow);
  const defaultTemplate = templates.find((t) => t.is_default) ?? null;
  return {
    total: templates.length,
    active: templates.filter((t) => t.status === "active").length,
    inactive: templates.filter((t) => t.status === "inactive").length,
    full: templates.filter((t) => t.template_type === "full").length,
    partial: templates.filter((t) => t.template_type === "partial").length,
    default_template: defaultTemplate
      ? { id: defaultTemplate.id, name: defaultTemplate.name, slug: defaultTemplate.slug }
      : null,
  };
}

export async function getPackageTemplateById(
  id: number
): Promise<PackageTemplateRecord | null> {
  const blob = await getSettingBlobById<PackageTemplateRecord>(
    SETTINGS_BLOB.packageTemplate,
    id
  );
  return blob ? stripRow(blob) : null;
}

export async function createPackageTemplate(
  input: CreatePackageTemplateInput,
  audit?: PackageAuditContext
): Promise<PackageTemplateRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Template name is required");

  const all = await loadAll();
  if (all.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("A template with this name already exists");
  }

  const slug = await resolveTemplateSlug(name, input.slug);
  const includedSteps = normalizeIncludedSteps(input.included_steps);
  const templateType = input.template_type ?? inferTemplateType(includedSteps);
  if (input.is_default) await clearOtherDefaults();

  const stamp = nowIso();
  const draft: Omit<PackageTemplateRecord, "id"> & { id?: number } = {
    name,
    slug,
    description: input.description?.trim() || null,
    template_type: templateType,
    included_steps: includedSteps,
    supplier_source: input.supplier_source ?? null,
    package_basics: input.package_basics ?? null,
    media_frontend: input.media_frontend ?? null,
    pricing: input.pricing ?? null,
    itinerary: input.itinerary ?? null,
    hotels: input.hotels ?? null,
    inclusions: input.inclusions ?? null,
    booking_policy: input.booking_policy ?? null,
    consultant_view: input.consultant_view ?? null,
    supplier_quote_tool: input.supplier_quote_tool ?? null,
    frontend_faqs: input.frontend_faqs ?? null,
    sales_ads_assets: input.sales_ads_assets ?? null,
    seo: input.seo ?? null,
    status: input.status ?? "active",
    is_default: Boolean(input.is_default),
    display_order: input.display_order ?? 0,
    usage_count: 0,
    created_by: audit?.user ?? null,
    updated_by: audit?.user ?? null,
    created_at: stamp,
    updated_at: stamp,
  };

  const id = await insertSettingBlob(SETTINGS_BLOB.packageTemplate, name, draft);
  const created = await getPackageTemplateById(id);
  if (!created) throw new Error("Failed to load template after create");
  return created;
}

export async function updatePackageTemplate(
  id: number,
  input: UpdatePackageTemplateInput,
  audit?: PackageAuditContext
): Promise<PackageTemplateRecord | null> {
  const existing = await getPackageTemplateById(id);
  if (!existing) return null;

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Template name is required");
    const all = await loadAll();
    if (all.some((t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("A template with this name already exists");
    }
  }

  if (input.is_default) await clearOtherDefaults(id);

  const includedSteps =
    input.included_steps !== undefined
      ? normalizeIncludedSteps(input.included_steps)
      : existing.included_steps;

  const next: PackageTemplateRecord = {
    ...existing,
    ...input,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    slug: await resolveTemplateSlug(
      input.name?.trim() ?? existing.name,
      input.slug ?? existing.slug,
      id
    ),
    description:
      input.description !== undefined ? input.description?.trim() || null : existing.description,
    included_steps: includedSteps,
    template_type:
      input.template_type ??
      (input.included_steps !== undefined
        ? inferTemplateType(includedSteps)
        : existing.template_type),
    updated_by: audit?.user ?? existing.updated_by,
    updated_at: nowIso(),
  };

  for (const column of SECTION_COLUMNS) {
    if (column in input) {
      (next as unknown as Record<string, unknown>)[column] = input[column] ?? null;
    }
  }

  await updateSettingBlob(SETTINGS_BLOB.packageTemplate, id, next);
  return getPackageTemplateById(id);
}

export async function deletePackageTemplate(id: number): Promise<boolean> {
  return deleteSettingBlob(SETTINGS_BLOB.packageTemplate, id);
}

function sanitizeAppliedBasics(
  basics: PackageTemplateRecord["package_basics"]
): PackageTemplateRecord["package_basics"] {
  if (!basics) return null;
  return { ...basics, packageTitle: "", slug: "" };
}

function sanitizeAppliedSupplier(
  supplier: PackageTemplateRecord["supplier_source"]
): PackageTemplateRecord["supplier_source"] {
  if (!supplier) return null;
  const emails = Array.isArray(supplier.supplierEmails)
    ? supplier.supplierEmails.filter(
        (email): email is string => typeof email === "string" && email.trim().length > 0
      )
    : [];
  return {
    supplierName: supplier.supplierName ?? "",
    supplierPackageName: supplier.supplierPackageName ?? "",
    supplierCountry: supplier.supplierCountry ?? "",
    contactPerson: supplier.contactPerson ?? "",
    supplierEmails: emails,
    supplierWhatsapp: supplier.supplierWhatsapp ?? "",
    quotationFiles: supplier.quotationFiles ?? [],
    internalSupplierNotes: supplier.internalSupplierNotes ?? "",
  };
}

function sanitizeAppliedSeo(seo: PackageTemplateRecord["seo"]): PackageTemplateRecord["seo"] {
  if (!seo) return null;
  return { ...seo, metaTitle: "", metaDescription: "" };
}

function computeFirstStep(template: PackageTemplateRecord): number {
  return template.included_steps.length ? template.included_steps[0] : 1;
}

export function buildApplyTemplatePayload(
  template: PackageTemplateRecord
): ApplyPackageTemplateResult {
  const includedSet = new Set(template.included_steps);
  const payload: UpdatePackageInput = {};

  for (const option of TEMPLATE_STEP_OPTIONS) {
    if (!includedSet.has(option.step)) continue;
    const key = option.key;
    const value = template[key];
    if (value === null || value === undefined) continue;

    if (key === "package_basics") {
      payload.package_basics = sanitizeAppliedBasics(
        value as PackageTemplateRecord["package_basics"]
      );
    } else if (key === "supplier_source") {
      payload.supplier_source = sanitizeAppliedSupplier(
        value as PackageTemplateRecord["supplier_source"]
      );
    } else if (key === "seo") {
      payload.seo = sanitizeAppliedSeo(value as PackageTemplateRecord["seo"]);
    } else {
      (payload as Record<string, unknown>)[key] = value;
    }
  }

  return {
    payload,
    current_step: computeFirstStep(template),
    template,
  };
}

export async function applyPackageTemplate(
  id: number,
  audit?: PackageAuditContext
): Promise<ApplyPackageTemplateResult | null> {
  const template = await getPackageTemplateById(id);
  if (!template) return null;
  if (template.status !== "active") {
    throw new Error("Only active templates can be applied");
  }

  await updateSettingBlob(SETTINGS_BLOB.packageTemplate, id, {
    ...template,
    usage_count: Number(template.usage_count ?? 0) + 1,
    updated_by: audit?.user ?? template.updated_by,
    updated_at: nowIso(),
  });

  const refreshed = await getPackageTemplateById(id);
  return buildApplyTemplatePayload(refreshed ?? template);
}

export async function listActiveTemplateOptions(): Promise<
  Pick<
    PackageTemplateRecord,
    "id" | "name" | "slug" | "template_type" | "included_steps" | "description"
  >[]
> {
  const templates = (await loadAll())
    .map(stripRow)
    .filter((t) => t.status === "active")
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    template_type: t.template_type,
    included_steps: t.included_steps,
    description: t.description,
  }));
}
