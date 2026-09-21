import type {
  PackageListSource,
  PackageRecord,
  PackageStats,
  UpdatePackageInput,
} from "./package-types";
import { AUDIT_USER_HEADER } from "./audit-context";
import { getStoredToken, getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function requestHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const user = getStoredUser();
  if (user?.fullName) {
    headers[AUDIT_USER_HEADER] = user.fullName;
  }
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function authenticatedFetch(path: string, init: RequestInit = {}) {
  return fetch(apiUrl(path), {
    cache: "no-store",
    ...init,
    headers: {
      ...requestHeaders(),
      ...(init.headers ?? {}),
    },
  });
}


export function getPackageEditHref(pkg: PackageRecord, step?: number): string {
  // All catalogue rows live in tbl_packages; edit via the package wizard.
  const id = pkg.id || pkg.package_id;
  const base = `/add-package?id=${id}`;
  if (step != null && step >= 1 && step <= 14) {
    return `${base}&step=${step}`;
  }
  return base;
}

export function isWizardPackage(pkg: PackageRecord): boolean {
  return pkg.source === "wizard";
}

/** Stable list identity — wizard and legacy IDs can overlap. */
export function getPackageRecordKey(pkg: Pick<PackageRecord, "id" | "source">): string {
  return `${pkg.source ?? "wizard"}-${pkg.id}`;
}

export function isSamePackageRecord(
  a: Pick<PackageRecord, "id" | "source">,
  b: Pick<PackageRecord, "id" | "source">
): boolean {
  return a.id === b.id && (a.source ?? "wizard") === (b.source ?? "wizard");
}

export async function createPackage(payload: UpdatePackageInput = {}) {
  const response = await fetch(apiUrl("/api/packages"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<{ package: PackageRecord }>(response);
}

export async function updatePackage(id: number, payload: UpdatePackageInput) {
  const response = await fetch(apiUrl(`/api/packages/${id}`), {
    method: "PATCH",
    headers: requestHeaders(true),
    body: JSON.stringify(payload),
  });
  return parseApiResponse<{ package: PackageRecord }>(response);
}

export async function getPackage(id: number) {
  const response = await authenticatedFetch(`/api/packages/${id}`);
  return parseApiResponse<{ package: PackageRecord }>(response);
}

export async function listPackages(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await authenticatedFetch(`/api/packages${query}`);
  return parseApiResponse<{ packages: PackageRecord[] }>(response);
}

export async function listAllPackages() {
  const response = await authenticatedFetch("/api/packages/combined");
  return parseApiResponse<{ packages: PackageRecord[] }>(response);
}

export async function listAllTblPackages() {
  const response = await authenticatedFetch("/api/packages/all");
  return parseApiResponse<{ packages: PackageRecord[] }>(response);
}

export function computePackageStats(packages: PackageRecord[]): PackageStats {
  const counts = packages.reduce(
    (acc, pkg) => {
      acc[pkg.status] = (acc[pkg.status] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<PackageRecord["status"], number>>
  );

  const wizardTotal = packages.filter((pkg) => pkg.source === "wizard").length;
  const legacyTotal = packages.filter((pkg) => pkg.source === "legacy").length;

  return {
    total: packages.length,
    draft: counts.draft ?? 0,
    pending_review: counts.pending_review ?? 0,
    published: counts.published ?? 0,
    archived: counts.archived ?? 0,
    expiring_rates: packages.filter((pkg) => {
      const validityTo = (pkg.supplier_source as { validityTo?: string } | null)?.validityTo;
      if (!validityTo) return false;
      const expiry = new Date(validityTo);
      const now = new Date();
      const in30Days = new Date();
      in30Days.setDate(now.getDate() + 30);
      return expiry >= now && expiry <= in30Days;
    }).length,
    supplier_quotes: packages.filter(
      (pkg) => pkg.supplier_quote_tool && Object.keys(pkg.supplier_quote_tool).length > 0
    ).length,
    wizard_total: wizardTotal,
    legacy_total: legacyTotal,
  };
}

export async function getPackageStats() {
  const response = await authenticatedFetch("/api/packages/stats");
  return parseApiResponse<{ stats: PackageStats }>(response);
}

export async function listRecentlyPublishedPackages() {
  const response = await authenticatedFetch("/api/packages/recently-published");
  return parseApiResponse<{ packages: PackageRecord[] }>(response);
}

export async function listExpiringPackages() {
  const response = await authenticatedFetch("/api/packages/expiring-rates");
  return parseApiResponse<{ packages: PackageRecord[] }>(response);
}

export async function listSupplierQuoteRequests() {
  const response = await authenticatedFetch("/api/packages/supplier-quotes");
  return parseApiResponse<{ packages: PackageRecord[] }>(response);
}

export async function deletePackage(id: number, source: PackageRecord["source"] = "wizard") {
  const queryString = source === "legacy" ? "?source=legacy" : "";
  const response = await fetch(apiUrl(`/api/packages/${id}${queryString}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ success: boolean }>(response);
}

export async function deletePackageRecord(pkg: PackageRecord) {
  const id = pkg.source === "legacy" ? pkg.package_id : pkg.id;
  return deletePackage(id, pkg.source ?? "wizard");
}

export async function archivePackage(id: number) {
  return updatePackage(id, { status: "archived" });
}

export async function duplicatePackage(source: PackageRecord) {
  const loaded =
    source.source === "legacy"
      ? source
      : (await getPackage(source.id)).package;
  const full = loaded ?? source;

  const baseTitle = full.package_title?.trim() || "Draft Package";
  const title = baseTitle.toLowerCase().startsWith("copy of ")
    ? baseTitle
    : `Copy of ${baseTitle}`;
  const slugSeed = full.slug?.trim() || "draft";
  const slug = `${slugSeed}-copy-${Date.now()}`;

  const packageBasics = full.package_basics
    ? {
        ...full.package_basics,
        packageTitle: title,
        slug,
      }
    : null;

  return createPackage({
    status: "draft",
    current_step: full.current_step || 1,
    package_title: title,
    slug,
    supplier_name: full.supplier_name,
    supplier_source: full.supplier_source,
    package_basics: packageBasics,
    media_frontend: full.media_frontend,
    pricing: full.pricing,
    itinerary: full.itinerary,
    hotels: full.hotels,
    inclusions: full.inclusions,
    booking_policy: full.booking_policy,
    consultant_view: full.consultant_view,
    supplier_quote_tool: full.supplier_quote_tool,
    frontend_faqs: full.frontend_faqs,
    sales_ads_assets: full.sales_ads_assets,
    seo: full.seo,
    review_publish: full.review_publish
      ? {
          ...full.review_publish,
          submitAction: "save",
          publishedAt: null,
        }
      : null,
  });
}

export async function archivePackageRecord(pkg: PackageRecord) {
  if (pkg.source === "legacy") {
    const response = await fetch(
      apiUrl(`/api/packages/${pkg.package_id}?source=legacy`),
      {
        method: "PATCH",
        headers: requestHeaders(true),
        body: JSON.stringify({ status: "archived" }),
      }
    );
    return parseApiResponse<{ package: PackageRecord }>(response);
  }
  return archivePackage(pkg.id);
}

export async function sendSupplierQuoteEmail(
  packageId: number,
  payload: {
    to: string[];
    additionalTo?: string[];
    subject: string;
    body: string;
    emailSignature?: string;
    quoteData?: Record<string, unknown>;
  }
) {
  const response = await authenticatedFetch(
    `/api/packages/${packageId}/supplier-quotes/send`,
    {
      method: "POST",
      headers: requestHeaders(true),
      body: JSON.stringify(payload),
    }
  );
  return parseApiResponse<{
    success: boolean;
    messageId: string;
    mode?: "graph" | "smtp" | "ethereal";
    previewUrl?: string;
    package: PackageRecord;
    recipients: { to: string[]; cc: string[]; bcc: string[] };
    attachments?: string[];
  }>(response);
}

export type { PackageListSource, PackageStats };
