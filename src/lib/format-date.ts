export const SGT_TIME_ZONE = "Asia/Singapore";
export const SGT_UTC_OFFSET = "+08:00";

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
): string {
  return parts.find((part) => part.type === type)?.value ?? "00";
}

/** Current Singapore wall-clock time as `YYYY-MM-DD HH:mm:ss` for MySQL. */
export function nowMysqlDateTimeSgt(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SGT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hourRaw = getPart(parts, "hour");
  const hour = hourRaw === "24" ? "00" : hourRaw.padStart(2, "0");

  return `${getPart(parts, "year")}-${getPart(parts, "month")}-${getPart(parts, "day")} ${hour}:${getPart(parts, "minute")}:${getPart(parts, "second")}`;
}

/**
 * Parse API/DB datetime values. Naive strings (no Z/offset) are treated as
 * Singapore time so display matches how we store publish timestamps.
 */
export function toValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (match) {
    const [, year, month, day, hour, minute, second = "00"] = match;
    const date = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}${SGT_UTC_OFFSET}`
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
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

/** Same as `formatPackageDateTime`, with an explicit `SGT` suffix. */
export function formatPackageDateTimeSgt(value: string | null | undefined): string {
  const formatted = formatPackageDateTime(value);
  if (!value || formatted === "—") return "—";
  return formatted.endsWith(" SGT") ? formatted : `${formatted} SGT`;
}

export function formatPackageTime(value: string | null | undefined): string {
  return formatWithSgt(value, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format a stored datetime for `<input type="datetime-local">` in Singapore time. */
export function toDatetimeLocalValue(value: string | null | undefined): string {
  const date = toValidDate(value);
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SGT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hourRaw = getPart(parts, "hour");
  const hour = hourRaw === "24" ? "00" : hourRaw.padStart(2, "0");

  return `${getPart(parts, "year")}-${getPart(parts, "month")}-${getPart(parts, "day")}T${hour}:${getPart(parts, "minute")}`;
}

/**
 * Convert a `datetime-local` value (treated as Singapore wall-clock) to
 * `YYYY-MM-DD HH:mm:ss` for MySQL storage.
 */
export function fromDatetimeLocalValue(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "00"] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second.padStart(2, "0")}`;
}
