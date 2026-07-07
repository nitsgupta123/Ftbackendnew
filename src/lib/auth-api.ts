import type { AuthResponse, LoginInput, SignupInput } from "./auth-types";
import { getStoredToken } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function authHeaders(includeJson = false): HeadersInit {
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

export async function signupRequest(input: SignupInput): Promise<AuthResponse> {
  const response = await fetch(apiUrl("/api/auth/signup"), {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<AuthResponse>(response);
}

export async function loginRequest(input: LoginInput): Promise<AuthResponse> {
  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<AuthResponse>(response);
}

export async function fetchCurrentUser() {
  const response = await fetch(apiUrl("/api/auth/me"), {
    headers: authHeaders(),
  });
  return parseApiResponse<{ user: AuthResponse["user"] }>(response);
}

export function getAuthHeadersForApi(): HeadersInit {
  return authHeaders();
}
