/** Convert display text to a URL-friendly slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Ensure slug uniqueness by appending -2, -3, etc. when needed. */
export function uniqueSlug(base: string, existingSlugs: string[]): string {
  const normalized = slugify(base);
  if (!normalized) return `category-${Date.now()}`;

  const taken = new Set(existingSlugs.map((s) => s.toLowerCase()));
  if (!taken.has(normalized)) return normalized;

  let counter = 2;
  while (taken.has(`${normalized}-${counter}`)) {
    counter += 1;
  }
  return `${normalized}-${counter}`;
}
