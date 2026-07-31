import { getStoredToken } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";
import type {
  EnquiryRecord,
  EnquiryStats,
  ListEnquiriesParams,
  ListEnquiriesResult,
} from "./enquiry-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function requestHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function buildQuery(params: ListEnquiriesParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.type) search.set("type", params.type);
  if (params.status) search.set("status", params.status);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getEnquiryStats(): Promise<{ stats: EnquiryStats }> {
  const response = await fetch(apiUrl("/api/enquiries/stats"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ stats: EnquiryStats }>(response);
}

export async function listEnquiries(
  params: ListEnquiriesParams = {}
): Promise<ListEnquiriesResult> {
  const response = await fetch(apiUrl(`/api/enquiries${buildQuery(params)}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListEnquiriesResult>(response);
}

export async function getEnquiry(
  id: number
): Promise<{ enquiry: EnquiryRecord }> {
  const response = await fetch(apiUrl(`/api/enquiries/${id}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ enquiry: EnquiryRecord }>(response);
}

export async function updateEnquiryStatus(
  id: number,
  status: "open" | "closed"
): Promise<{ enquiry: EnquiryRecord }> {
  const response = await fetch(apiUrl(`/api/enquiries/${id}`), {
    method: "PATCH",
    headers: requestHeaders(true),
    body: JSON.stringify({ status }),
  });
  return parseApiResponse<{ enquiry: EnquiryRecord }>(response);
}

export async function deleteEnquiry(
  id: number
): Promise<{ success: boolean }> {
  const response = await fetch(apiUrl(`/api/enquiries/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ success: boolean }>(response);
}
