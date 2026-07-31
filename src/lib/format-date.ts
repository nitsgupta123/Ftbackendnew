export const SGT_TIME_ZONE = "Asia/Singapore";

function toValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWithSgt(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  locale = "en-GB"
): string {
  if (!value) return "—";
  const date = toValidDate(value);
  if (!date) return value;
  return date.toLocaleString(locale, { ...options, timeZone: SGT_TIME_ZONE });
}

export function formatPackageDate(value: string | null | undefined): string {
  return formatWithSgt(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatPackageDateTime(value: string | null | undefined): string {
  return formatWithSgt(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatPackageTime(value: string | null | undefined): string {
  return formatWithSgt(value, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
