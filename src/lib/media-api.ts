import { getStoredToken } from "./auth-storage";
import { parseApiResponse } from "./parse-api-response";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export type MediaUploadResult = {
  url: string;
  kind: "image" | "video" | "document";
  filename: string;
  mimetype: string;
  size?: number;
};

export async function uploadMediaFile(file: File): Promise<MediaUploadResult> {
  const body = new FormData();
  body.append("file", file);

  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl("/api/media/upload"), {
    method: "POST",
    headers,
    body,
  });

  return parseApiResponse<MediaUploadResult>(response);
}
