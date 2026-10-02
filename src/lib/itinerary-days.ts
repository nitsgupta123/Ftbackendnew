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
    activitiesIncluded: "",
    highlights: "",
    internalNotes: "",
    mobilityWarning: "",
    supplierNotes: "",
    dietaryNotes: "",
    breakfast: false,
    lunch: false,
    dinner: false,
    imageUrl: null,
  };
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
  return {
    ...createEmptyDay(dayNumber),
    ...day,
    dayNumber,
    description: toEditorHtml(day.description),
    dietaryNotes: day.dietaryNotes ?? day.halalFoodNote ?? "",
  };
}

export function dayHasUserContent(day: ItineraryDay): boolean {
  return Boolean(
    day.title?.trim() ||
      !isEmptyRichText(day.description ?? "") ||
      day.activitiesIncluded?.trim() ||
      day.highlights?.trim() ||
      day.internalNotes?.trim() ||
      day.mobilityWarning?.trim() ||
      day.supplierNotes?.trim() ||
      day.dietaryNotes?.trim() ||
      day.halalFoodNote?.trim() ||
      day.city?.trim() ||
      day.optionalActivities?.trim() ||
      day.transport?.trim() ||
      day.hotelThatNight?.trim() ||
      day.imageUrl?.trim() ||
      day.breakfast ||
      day.lunch ||
      day.dinner ||
      day.guideIncluded
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
