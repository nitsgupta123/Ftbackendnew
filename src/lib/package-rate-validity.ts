import type { PricingData } from "./package-types";

export const EXPIRING_WINDOW_DAYS = 30;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

/** Last date any booking range or departure in the pricing step is valid for (YYYY-MM-DD). */
export function latestRateDate(pricing: PricingData | null | undefined): string | null {
  let latest: string | null = null;
  const consider = (value: unknown) => {
    const text = typeof value === "string" ? value.trim().slice(0, 10) : "";
    if (!DATE_PATTERN.test(text)) return;
    if (!latest || text > latest) latest = text;
  };
  for (const category of pricing?.hotelCategories ?? []) {
    for (const range of category.bookingRanges ?? []) consider(range.toDate);
    for (const month of category.departureMonths ?? []) {
      for (const departure of month.dates ?? []) consider(departure.date);
    }
  }
  return latest;
}

export function isRateExpiringSoon(validTo: string | null | undefined, now = new Date()): boolean {
  if (!validTo) return false;
  const today = now.toISOString().slice(0, 10);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + EXPIRING_WINDOW_DAYS);
  return validTo >= today && validTo <= limit.toISOString().slice(0, 10);
}
