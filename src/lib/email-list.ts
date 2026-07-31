const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Split comma / semicolon / newline separated email lists. */
export function parseEmailList(value: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(value)
    ? value.join(",")
    : typeof value === "string"
      ? value
      : "";

  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of raw.split(/[,;\n]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    result.push(email);
  }

  return result;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function formatEmailList(emails: string[]): string {
  return emails.join(", ");
}

export function validateEmailList(
  value: string,
  fieldLabel: string
): string | null {
  const emails = parseEmailList(value);
  for (const email of emails) {
    if (!isValidEmail(email)) {
      return `${fieldLabel} contains an invalid email: ${email}`;
    }
  }
  return null;
}
