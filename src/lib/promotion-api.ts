import type { PromotionInput, PromotionRecord, PromotionStatus } from "./promotion-types";
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

export async function listPromotions() {
  const response = await fetch(apiUrl("/api/promotions"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ promotions: PromotionRecord[] }>(response);
}

export async function createPromotion(input: PromotionInput) {
  const response = await fetch(apiUrl("/api/promotions"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ promotion: PromotionRecord }>(response);
}

export async function updatePromotion(id: number, input: PromotionInput) {
  const response = await fetch(apiUrl(`/api/promotions/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ promotion: PromotionRecord }>(response);
}

export async function setPromotionStatus(id: number, status: PromotionStatus) {
  const response = await fetch(apiUrl(`/api/promotions/${id}/status`), {
    method: "PATCH",
    headers: requestHeaders(true),
    body: JSON.stringify({ status }),
  });
  return parseApiResponse<{ promotion: PromotionRecord }>(response);
}

export async function deletePromotion(id: number) {
  const response = await fetch(apiUrl(`/api/promotions/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}
