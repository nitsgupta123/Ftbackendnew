import type {
  ApplyPackageTemplateResult,
  CreatePackageTemplateInput,
  ListPackageTemplatesParams,
  ListPackageTemplatesResult,
  PackageTemplateRecord,
  PackageTemplatesStats,
  UpdatePackageTemplateInput,
} from "./package-template-types";
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

function buildQuery(params: ListPackageTemplatesParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.template_type) search.set("template_type", params.template_type);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.activeOnly) search.set("activeOnly", "true");
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getPackageTemplateStats() {
  const response = await fetch(apiUrl("/api/package-templates/stats"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ stats: PackageTemplatesStats }>(response);
}

export async function listPackageTemplates(
  params: ListPackageTemplatesParams = {}
): Promise<ListPackageTemplatesResult> {
  const response = await fetch(apiUrl(`/api/package-templates${buildQuery(params)}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListPackageTemplatesResult>(response);
}

export async function getPackageTemplate(id: number) {
  const response = await fetch(apiUrl(`/api/package-templates/${id}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ template: PackageTemplateRecord }>(response);
}

export async function createPackageTemplate(input: CreatePackageTemplateInput) {
  const response = await fetch(apiUrl("/api/package-templates"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ template: PackageTemplateRecord }>(response);
}

export async function updatePackageTemplate(id: number, input: UpdatePackageTemplateInput) {
  const response = await fetch(apiUrl(`/api/package-templates/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ template: PackageTemplateRecord }>(response);
}

export async function deletePackageTemplate(id: number) {
  const response = await fetch(apiUrl(`/api/package-templates/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}

export async function applyPackageTemplate(id: number) {
  const response = await fetch(apiUrl(`/api/package-templates/${id}/apply`), {
    method: "POST",
    headers: requestHeaders(),
  });
  return parseApiResponse<ApplyPackageTemplateResult>(response);
}

export async function listActiveTemplates() {
  return listPackageTemplates({
    activeOnly: true,
    limit: 100,
    sort: "display_order",
    order: "asc",
  });
}
