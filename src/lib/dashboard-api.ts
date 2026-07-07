import type { DashboardOverview } from "./dashboard-types";
import { getStoredToken, getStoredUser } from "./auth-storage";
import { AUDIT_USER_HEADER } from "./audit-context";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function requestHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const user = getStoredUser();
  if (user?.fullName) {
    headers[AUDIT_USER_HEADER] = user.fullName;
  }
  return headers;
}

export async function getDashboardOverview(chartDays = 7): Promise<DashboardOverview> {
  const params = new URLSearchParams();
  if (chartDays !== 7) {
    params.set("chartDays", String(chartDays));
  }
  const query = params.toString();

  const response = await fetch(apiUrl(`/api/dashboard${query ? `?${query}` : ""}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });

  return parseApiResponse<DashboardOverview>(response);
}
