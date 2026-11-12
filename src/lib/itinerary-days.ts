import type { ItineraryData, ItineraryDay } from "@/lib/package-types";

const DRAFT_PREFIX = "ftadmin.itinerary-draft.";
const MAX_DAYS = 60;

export function parseDurationDays(raw: string | number | null | undefined): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(Math.floor(n), MAX_DAYS);
}

export function isEmptyRichText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim() === "";
}

export function createEmptyDay(dayNumber: number): ItineraryDay {
  return {
    dayNumber,
    title: "",
    description: "",
    highlights: "",
    internalNotes: "",
    dietaryNotes: "",
    breakfast: false,
    lunch: false,
    dinner: false,
    imageUrl: null,
    imageAlt: "",
  };
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function containsText(haystack: string | undefined, needle: string): boolean {
  if (!needle) return true;
  return stripTags(haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function appendPlain(existing: string | undefined, extra: string | undefined): string {
  const addition = stripTags(extra ?? "");
  const current = (existing ?? "").trim();
  if (!addition || containsText(current, addition)) return current;
  return current ? `${current}\n${addition}` : addition;
}

function appendDescription(existing: string | undefined, label: string, note: string | undefined): string {
  const addition = stripTags(note ?? "");
  if (!addition || containsText(existing, addition)) return existing ?? "";
  const block = `${label}: ${addition}`;
  const current = existing ?? "";
  if (!current.trim()) return block;
  if (/<\/?[a-z][\s\S]*>/i.test(current)) {
    return `${current.trim()}<p>${escapeHtml(block)}</p>`;
  }
  return `${current.trim()}\n\n${block}`;
}

/** Moves retired day fields into Highlights and Description, then drops those fields. */
export function presentItineraryDay(day: ItineraryDay): ItineraryDay {
  let description = day.description ?? "";
  description = appendDescription(description, "Mobility", day.mobilityWarning);
  description = appendDescription(description, "Supplier notes", day.supplierNotes);

  const next: ItineraryDay = {
    ...day,
    title: day.title?.trim() || undefined,
    description: description.trim() || undefined,
    highlights: appendPlain(day.highlights, day.activitiesIncluded).trim() || undefined,
    dietaryNotes: appendPlain(day.dietaryNotes, day.halalFoodNote).trim() || undefined,
    internalNotes: day.internalNotes?.trim() || undefined,
    imageAlt: day.imageAlt?.trim() || undefined,
    imageUrl: day.imageUrl?.trim() || null,
  };
  delete next.activitiesIncluded;
  delete next.mobilityWarning;
  delete next.supplierNotes;
  delete next.halalFoodNote;
  return next;
}

function toEditorHtml(value: string | undefined): string {
  const raw = value ?? "";
  if (!raw.trim()) return "";
  if (/<\/?[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function normalizeDay(day: ItineraryDay, dayNumber: number): ItineraryDay {
  const presented = presentItineraryDay({ ...day, dayNumber });
  return {
    ...createEmptyDay(dayNumber),
    ...presented,
    dayNumber,
    title: presented.title ?? "",
    description: toEditorHtml(presented.description),
    highlights: presented.highlights ?? "",
    internalNotes: presented.internalNotes ?? "",
    dietaryNotes: presented.dietaryNotes ?? "",
    imageUrl: presented.imageUrl ?? null,
    imageAlt: presented.imageAlt ?? "",
    breakfast: presented.breakfast ?? false,
    lunch: presented.lunch ?? false,
    dinner: presented.dinner ?? false,
  };
}

export function dayHasUserContent(day: ItineraryDay): boolean {
  const shown = presentItineraryDay(day);
  return Boolean(
    shown.title?.trim() ||
      !isEmptyRichText(shown.description ?? "") ||
      shown.highlights?.trim() ||
      shown.internalNotes?.trim() ||
      shown.dietaryNotes?.trim() ||
      shown.city?.trim() ||
      shown.optionalActivities?.trim() ||
      shown.transport?.trim() ||
      shown.hotelThatNight?.trim() ||
      shown.imageUrl?.trim() ||
      shown.imageAlt?.trim() ||
      shown.breakfast ||
      shown.lunch ||
      shown.dinner ||
      shown.guideIncluded
  );
}

/** Supplier and client documents omit consultant-only notes. */
export function itineraryDayIsClientVisible(day: ItineraryDay): boolean {
  const shown = presentItineraryDay(day);
  return Boolean(
    shown.title?.trim() ||
      !isEmptyRichText(shown.description ?? "") ||
      shown.highlights?.trim() ||
      shown.dietaryNotes?.trim() ||
      shown.city?.trim() ||
      shown.optionalActivities?.trim() ||
      shown.transport?.trim() ||
      shown.hotelThatNight?.trim() ||
      shown.imageUrl?.trim() ||
      shown.breakfast ||
      shown.lunch ||
      shown.dinner
  );
}

export function coerceItineraryDays(
  data: ItineraryData | ItineraryDay[] | null | undefined
): ItineraryDay[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter((day) => day && typeof day === "object");
  if (Array.isArray(data.days)) {
    return data.days.filter((day) => day && typeof day === "object");
  }
  return [];
}

function dayCount(duration: number, days: ItineraryDay[]): number {
  let max = duration;
  days.forEach((day, index) => {
    const parsed = Number(day?.dayNumber);
    const dayNumber = Number.isFinite(parsed) && parsed > 0 ? parsed : index + 1;
    if (dayNumber > max) max = dayNumber;
  });
  if (max < 1) return 0;
  return Math.min(Math.floor(max), MAX_DAYS);
}

export function buildDaysForDuration(
  duration: number,
  existing?: ItineraryDay[] | null
): ItineraryDay[] {
  const count = dayCount(duration, existing ?? []);
  if (count < 1) return [];

  return Array.from({ length: count }, (_, index) => {
    const dayNumber = index + 1;
    const prior =
      existing?.find((day) => Number(day?.dayNumber) === dayNumber) ?? existing?.[index];
    return prior ? normalizeDay(prior, dayNumber) : createEmptyDay(dayNumber);
  });
}

/** Saved copy wins once it has real content. A local draft is used only until that save exists. */
export function resolveItineraryDays(
  durationRaw: string | number | null | undefined,
  saved: ItineraryDay[] | null | undefined,
  draft: ItineraryDay[] | null | undefined,
  inProgress?: ItineraryDay[] | null
): ItineraryDay[] {
  const duration = parseDurationDays(durationRaw);
  const savedList = saved ?? [];
  const draftList = draft ?? [];
  const editing = inProgress ?? [];

  const prefer = editing.some(dayHasUserContent)
    ? editing
    : savedList.some(dayHasUserContent)
      ? savedList
      : draftList.some(dayHasUserContent)
        ? draftList
        : editing.length
          ? editing
          : savedList.length
            ? savedList
            : draftList;

  return buildDaysForDuration(dayCount(duration, prefer), prefer);
}

function draftKey(packageId: number | null | undefined): string | null {
  if (!packageId || packageId < 1) return null;
  return `${DRAFT_PREFIX}${packageId}`;
}

export function readItineraryDraft(packageId: number | null | undefined): ItineraryDay[] | null {
  const key = draftKey(packageId);
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ItineraryDay[];
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((day) => day && typeof day === "object");
  } catch {
    return null;
  }
}

export function writeItineraryDraft(
  packageId: number | null | undefined,
  days: ItineraryDay[]
): void {
  const key = draftKey(packageId);
  if (!key || typeof window === "undefined") return;
  if (!days.some(dayHasUserContent)) {
    window.sessionStorage.removeItem(key);
    return;
  }
  window.sessionStorage.setItem(key, JSON.stringify(days));
}

export function clearItineraryDraft(packageId: number | null | undefined): void {
  const key = draftKey(packageId);
  if (!key || typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}
