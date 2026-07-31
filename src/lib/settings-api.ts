import { getStoredToken, getStoredUser } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";
import { AUDIT_USER_HEADER } from "./audit-context";
import type { AdminSettings, UpdateAdminSettingsInput } from "./settings-types";

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
  const user = getStoredUser();
  if (user?.fullName) {
    headers[AUDIT_USER_HEADER] = user.fullName;
  }
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function getSettings(): Promise<{ settings: AdminSettings }> {
  const response = await fetch(apiUrl("/api/settings"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ settings: AdminSettings }>(response);
}

export async function updateSettings(
  input: UpdateAdminSettingsInput
): Promise<{ settings: AdminSettings }> {
  const response = await fetch(apiUrl("/api/settings"), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ settings: AdminSettings }>(response);
}
