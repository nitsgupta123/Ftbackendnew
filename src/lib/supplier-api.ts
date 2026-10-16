import type {
  CreateSupplierInput,
  CustomSupplierService,
  ListSuppliersParams,
  ListSuppliersResult,
  SupplierRecord,
  SuppliersStats,
  UpdateSupplierInput,
} from "./supplier-types";
import { AUDIT_USER_HEADER } from "./audit-context";
import { getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function requestHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  const user = getStoredUser();
  if (user?.fullName) {
    headers[AUDIT_USER_HEADER] = user.fullName;
  }
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function buildQuery(params: ListSuppliersParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.relationship_status) search.set("relationship_status", params.relationship_status);
  if (params.country) search.set("country", params.country);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listSuppliers(
  params: ListSuppliersParams = {}
): Promise<ListSuppliersResult> {
  const response = await fetch(apiUrl(`/api/suppliers${buildQuery(params)}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListSuppliersResult>(response);
}

export async function getSuppliersStats(): Promise<SuppliersStats> {
  const response = await fetch(apiUrl("/api/suppliers/stats"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<SuppliersStats>(response);
}

export async function listSupplierCountries(): Promise<string[]> {
  const response = await fetch(apiUrl("/api/suppliers/countries"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  const data = await parseApiResponse<{ countries: string[] }>(response);
  return data.countries;
}

export async function getSupplier(id: number) {
  const response = await fetch(apiUrl(`/api/suppliers/${id}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ supplier: SupplierRecord }>(response);
}

export async function createSupplier(input: CreateSupplierInput) {
  const response = await fetch(apiUrl("/api/suppliers"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ supplier: SupplierRecord }>(response);
}

export async function updateSupplier(id: number, input: UpdateSupplierInput) {
  const response = await fetch(apiUrl(`/api/suppliers/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ supplier: SupplierRecord }>(response);
}

export async function deleteSupplier(id: number) {
  const response = await fetch(apiUrl(`/api/suppliers/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}

export async function listCustomSupplierServices() {
  const response = await fetch(apiUrl("/api/suppliers/custom-services"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ services: CustomSupplierService[] }>(response);
}

export async function addCustomSupplierService(input: CustomSupplierService) {
  const response = await fetch(apiUrl("/api/suppliers/custom-services"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ services: CustomSupplierService[] }>(response);
}
