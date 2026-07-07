export async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  let data: unknown;

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new Error("Invalid JSON response from server");
    }
  } else {
    const text = (await response.text()).trim();
    if (!response.ok) {
      if (response.status === 502 || response.status === 503 || text === "Internal Server Error") {
        throw new Error("API server is unavailable. Make sure the backend is running on port 4000.");
      }
      if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        throw new Error(
          `API route not found (${response.status}). Restart the dev server if you recently added new API routes.`
        );
      }
      throw new Error(text || `Request failed (${response.status})`);
    }
    throw new Error("Unexpected non-JSON response from server");
  }

  if (!response.ok) {
    const err = data as { error?: string; details?: unknown };
    throw new Error(
      typeof err?.error === "string"
        ? err.error
        : err?.details
          ? "Validation failed"
          : `Request failed (${response.status})`
    );
  }

  return data as T;
}
