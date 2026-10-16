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
    const detail = firstValidationMessage(err?.details);
    const base =
      typeof err?.error === "string"
        ? err.error
        : err?.details
          ? "Validation failed"
          : `Request failed (${response.status})`;
    throw new Error(detail && base === "Validation failed" ? `${base}: ${detail}` : base);
  }

  return data as T;
}

/** First message from a zod `flatten()` payload (or its bare `fieldErrors` map). */
function firstValidationMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const shape = details as { formErrors?: unknown; fieldErrors?: unknown };
  if (Array.isArray(shape.formErrors) && typeof shape.formErrors[0] === "string") {
    return shape.formErrors[0];
  }
  const fieldErrors =
    shape.fieldErrors && typeof shape.fieldErrors === "object" ? shape.fieldErrors : details;
  for (const [field, messages] of Object.entries(fieldErrors as Record<string, unknown>)) {
    if (Array.isArray(messages) && typeof messages[0] === "string") {
      return `${field.replace(/_/g, " ")}: ${messages[0]}`;
    }
  }
  return null;
}
