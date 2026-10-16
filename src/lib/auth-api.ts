import type {
  AuthResponse,
  LoginInput,
  SignupInput,
  SignupResult,
} from "./auth-types";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function authHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function signupRequest(input: SignupInput): Promise<SignupResult> {
  const response = await fetch(apiUrl("/api/auth/signup"), {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<SignupResult>(response);
}

export async function verifyEmailRequest(token: string): Promise<AuthResponse & { message?: string }> {
  const response = await fetch(apiUrl("/api/auth/verify-email"), {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ token }),
  });
  return parseApiResponse<AuthResponse & { message?: string }>(response);
}

export async function loginRequest(input: LoginInput): Promise<AuthResponse> {
  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(input),
  });
  return parseApiResponse<AuthResponse>(response);
}

export async function forgotPasswordRequest(
  email: string
): Promise<{
  status: "ok";
  message: string;
}> {
  const response = await fetch(apiUrl("/api/auth/forgot-password"), {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ email }),
  });
  return parseApiResponse(response);
}

export async function resetPasswordRequest(
  token: string,
  password: string
): Promise<AuthResponse & { message?: string }> {
  const response = await fetch(apiUrl("/api/auth/reset-password"), {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ token, password }),
  });
  return parseApiResponse(response);
}

export async function fetchCurrentUser(signal?: AbortSignal) {
  const response = await fetch(apiUrl("/api/auth/me"), {
    headers: authHeaders(),
    signal,
  });
  return parseApiResponse<{ user: AuthResponse["user"] }>(response);
}

export async function logoutRequest(): Promise<void> {
  await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
}
