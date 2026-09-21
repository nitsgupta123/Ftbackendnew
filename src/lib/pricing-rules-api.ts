import type {
  CreatePricingRuleInput,
  ListPricingRulesParams,
  ListPricingRulesResult,
  PricingRuleRecord,
  PricingRulesStats,
  UpdatePricingRuleInput,
} from "./pricing-rules-types";
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

function buildQuery(params: ListPricingRulesParams): string {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.scope_type) search.set("scope_type", params.scope_type);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.activeOnly) search.set("activeOnly", "true");
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listPricingRules(
  params: ListPricingRulesParams = {}
): Promise<ListPricingRulesResult> {
  const response = await fetch(apiUrl(`/api/pricing-rules${buildQuery(params)}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<ListPricingRulesResult>(response);
}

export async function getPricingRulesStats(): Promise<PricingRulesStats> {
  const response = await fetch(apiUrl("/api/pricing-rules/stats"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<PricingRulesStats>(response);
}

export async function getDefaultPricingRule() {
  const response = await fetch(apiUrl("/api/pricing-rules/default"), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ rule: PricingRuleRecord | null }>(response);
}

export async function getPricingRule(id: number) {
  const response = await fetch(apiUrl(`/api/pricing-rules/${id}`), {
    cache: "no-store",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ rule: PricingRuleRecord }>(response);
}

export async function createPricingRule(input: CreatePricingRuleInput) {
  const response = await fetch(apiUrl("/api/pricing-rules"), {
    method: "POST",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ rule: PricingRuleRecord }>(response);
}

export async function updatePricingRule(id: number, input: UpdatePricingRuleInput) {
  const response = await fetch(apiUrl(`/api/pricing-rules/${id}`), {
    method: "PUT",
    headers: requestHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<{ rule: PricingRuleRecord }>(response);
}

export async function deletePricingRule(id: number) {
  const response = await fetch(apiUrl(`/api/pricing-rules/${id}`), {
    method: "DELETE",
    headers: requestHeaders(),
  });
  return parseApiResponse<{ ok: boolean }>(response);
}
