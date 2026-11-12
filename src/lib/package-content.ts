import { isValidEmail, parseEmailList } from "./email-list";
import { presentItineraryDay } from "./itinerary-days";
import type {
  ConsultantViewData,
  HotelCategoryKey,
  HotelEntry,
  HotelsSection,
  InclusionsData,
  ItineraryData,
  ItineraryDay,
  MediaFrontendData,
  PackageHighlight,
  PricingData,
  UpdatePackageInput,
} from "./package-types";

export const PACKAGE_HIGHLIGHT_LIMIT = 4;

export const STANDARD_SEASON_NAMES = ["Low Season", "High Season", "Peak Season"] as const;

export const DEFAULT_HOTEL_DISCLAIMER =
  "Listed hotels are for reference only. They are not guaranteed and are subject to availability and supplier confirmation.";

export const HOTEL_CATEGORY_OPTIONS: { key: HotelCategoryKey; label: string; stars: string }[] = [
  { key: "3star", label: "3-star package option", stars: "3" },
  { key: "4star", label: "4-star package option", stars: "4" },
  { key: "5star", label: "5-star package option", stars: "5" },
];

/** Package sections a consultant may open but must not change. */
export const CONSULTANT_READONLY_SECTIONS = new Set<string>([
  "supplier_source",
  "package_basics",
  "media_frontend",
  "pricing",
  "itinerary",
  "hotels",
  "inclusions",
  "booking_policy",
]);

export const CONSULTANT_READONLY_MODULES = new Set<string>([
  "supplier_source",
  "package_basics",
  "media_frontend",
  "pricing",
  "itinerary",
  "hotels",
  "inclusions",
  "exclusions",
  "booking_policy",
]);

export function isConsultantRole(role?: string | null): boolean {
  return (role ?? "").toLowerCase().includes("consultant");
}

function highlightId(): string {
  return `highlight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyPackageHighlight(): PackageHighlight {
  return { id: highlightId(), url: "", altText: "", description: "" };
}

export function normalizePackageHighlights(
  media?: MediaFrontendData | null
): PackageHighlight[] {
  const saved = Array.isArray(media?.packageHighlights) ? media.packageHighlights : [];
  const legacy = (media?.highlightImages ?? []).map((asset) => ({
    id: asset.id || highlightId(),
    url: asset.url,
    altText: asset.altText ?? "",
    description: asset.description ?? "",
    filename: asset.filename,
  }));
  const source = saved.length > 0 ? saved : legacy;

  return Array.from({ length: PACKAGE_HIGHLIGHT_LIMIT }, (_, index) => {
    const item = source[index];
    if (!item) return emptyPackageHighlight();
    return {
      id: item.id || highlightId(),
      url: item.url ?? "",
      altText: item.altText ?? "",
      description: item.description ?? "",
      filename: item.filename,
    };
  });
}

export function serializePackageHighlights(highlights: PackageHighlight[]): PackageHighlight[] {
  return highlights
    .slice(0, PACKAGE_HIGHLIGHT_LIMIT)
    .filter((item) => item.url?.trim() || item.altText?.trim() || item.description?.trim())
    .map((item) => ({
      id: item.id || highlightId(),
      url: item.url?.trim() || undefined,
      altText: item.altText?.trim() || undefined,
      description: item.description?.trim() || undefined,
      filename: item.filename?.trim() || undefined,
    }));
}

export function highlightValidationError(highlights: PackageHighlight[]): string | null {
  const filled = highlights.filter((item) => item.url?.trim() || item.altText?.trim() || item.description?.trim());
  if (filled.length > PACKAGE_HIGHLIGHT_LIMIT) {
    return `Keep package highlights to ${PACKAGE_HIGHLIGHT_LIMIT}.`;
  }
  const missingAlt = filled.find((item) => item.url?.trim() && !item.altText?.trim());
  if (missingAlt) return "Each package highlight image needs alt text.";
  const missingDescription = filled.find((item) => item.url?.trim() && !item.description?.trim());
  if (missingDescription) return "Each package highlight image needs its own short description.";
  return null;
}

export function normalizeHotels(value: unknown): HotelsSection {
  if (Array.isArray(value)) {
    return {
      entries: asHotelEntries(value),
      disclaimer: DEFAULT_HOTEL_DISCLAIMER,
    };
  }
  if (value && typeof value === "object") {
    const record = value as { entries?: unknown; hotels?: unknown; disclaimer?: unknown };
    const entries = Array.isArray(record.entries)
      ? record.entries
      : Array.isArray(record.hotels)
        ? record.hotels
        : [];
    const disclaimer =
      typeof record.disclaimer === "string" && record.disclaimer.trim()
        ? record.disclaimer.trim()
        : DEFAULT_HOTEL_DISCLAIMER;
    return {
      entries: asHotelEntries(entries),
      disclaimer,
    };
  }
  return { entries: [], disclaimer: DEFAULT_HOTEL_DISCLAIMER };
}

export function inferStarCategory(hotel: HotelEntry): HotelCategoryKey | "" {
  if (hotel.starCategory === "3star" || hotel.starCategory === "4star" || hotel.starCategory === "5star") {
    return hotel.starCategory;
  }
  const raw = `${hotel.starRating ?? ""}`.toLowerCase();
  const match = raw.match(/([345])(?:\s*[-*]?\s*star|\s*\*|\.0)?/);
  if (match?.[1] === "3") return "3star";
  if (match?.[1] === "4") return "4star";
  if (match?.[1] === "5") return "5star";
  return "";
}

function asHotelEntries(value: unknown[]): HotelEntry[] {
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => storedHotelEntry(item as HotelEntry));
}

function withoutHotelNights(hotel: HotelEntry): HotelEntry {
  return Object.fromEntries(
    Object.entries(hotel).filter(([key]) => key !== "nights")
  ) as HotelEntry;
}

function storedHotelEntry(hotel: HotelEntry): HotelEntry {
  const category = inferStarCategory(hotel);
  const rest = withoutHotelNights(hotel);
  return category ? { ...rest, starCategory: category } : rest;
}

export function serializeHotelEntry(hotel: HotelEntry): HotelEntry {
  const category = inferStarCategory(hotel);
  const rest = withoutHotelNights(hotel);
  return {
    ...rest,
    starCategory: category || undefined,
    starRating: category ? category.replace("star", "") : rest.starRating?.trim() || undefined,
    hotelName: rest.hotelName?.trim() || undefined,
    city: rest.city?.trim() || undefined,
    roomType: rest.roomType?.trim() || undefined,
    childPolicy: rest.childPolicy?.trim() || undefined,
    maxOccupancy: rest.maxOccupancy?.trim() || undefined,
    address: rest.address?.trim() || undefined,
    googleMapsLink: rest.googleMapsLink?.trim() || undefined,
    visibility: rest.visibility?.trim() || "Internal only",
    notesVisibility: rest.notesVisibility === "client" ? "client" : "internal",
    internalNotes: rest.internalNotes?.trim() || undefined,
  };
}

export function serializeHotels(value: unknown): HotelsSection {
  const section = normalizeHotels(value);
  return {
    entries: section.entries.map(serializeHotelEntry),
    disclaimer: section.disclaimer?.trim() || DEFAULT_HOTEL_DISCLAIMER,
  };
}

function plainText(value?: string | null): string {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").trim();
}

function escapePlain(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Local fees and taxes now live inside Important Notes. */
export function foldRetiredInclusionNotes(
  importantInfo?: string | null,
  localFees?: string | null
): string {
  const text = localFees?.trim();
  const next = importantInfo ?? "";
  if (!text || plainText(next).includes(text)) return next;
  if (/<\/?[a-z][\s\S]*>/i.test(next)) {
    const block = `<p>${escapePlain(text).replace(/\n/g, "<br>")}</p>`;
    return next.trim() ? `${next.trim()}${block}` : block;
  }
  return next.trim() ? `${next.trim()}\n${text}` : text;
}

export function inclusionImportantInfo(
  data?: Pick<InclusionsData, "importantInfo" | "localFees"> | null,
  legacyImportantInfo?: string | null
): string {
  const base =
    data && Object.prototype.hasOwnProperty.call(data, "importantInfo")
      ? data.importantInfo ?? ""
      : legacyImportantInfo ?? "";
  return foldRetiredInclusionNotes(base, data?.localFees);
}

export function sanitizeInclusions(data: InclusionsData): InclusionsData {
  return {
    included: data.included,
    excluded: data.excluded,
    optionalAddons: data.optionalAddons,
    importantInfo: inclusionImportantInfo(data),
    consultantMustExplain: data.consultantMustExplain,
    flightsIncluded: data.flightsIncluded,
    trainIncluded: data.trainIncluded,
    transfersIncluded: data.transfersIncluded,
  };
}

export function mergeObjectionText(data?: ConsultantViewData | null): string {
  const objections = data?.commonObjections?.trim() ?? "";
  const response = data?.suggestedResponse?.trim() ?? "";
  if (objections && response && !objections.includes(response)) {
    return `${objections}\n\nSuggested response:\n${response}`;
  }
  return objections || response;
}

export function sanitizeConsultantView(data: ConsultantViewData): ConsultantViewData {
  const { suggestedResponse: _suggestedResponse, ...rest } = data;
  return {
    ...rest,
    commonObjections: mergeObjectionText(data) || undefined,
  };
}

function sanitizeDay(day: ItineraryDay): ItineraryDay {
  return presentItineraryDay(day);
}

export function sanitizeItinerary(data: ItineraryData): ItineraryData {
  return {
    days: (data.days ?? []).map(sanitizeDay),
  };
}

export function itineraryImageAltError(days: ItineraryDay[]): string | null {
  const missing = days.find((day) => day.imageUrl?.trim() && !day.imageAlt?.trim());
  if (!missing) return null;
  return `Day ${missing.dayNumber} image needs alt text.`;
}

export function sanitizeMedia(data: MediaFrontendData): MediaFrontendData {
  const { frontEndSummary: _summary, clientFacingNotes: _notes, ...rest } = data;
  return {
    ...rest,
    packageHighlights: serializePackageHighlights(normalizePackageHighlights(data)),
  };
}

export function sanitizePricing(data: PricingData): PricingData {
  if (!data.hotelCategories?.length) return data;
  return {
    ...data,
    hotelCategories: data.hotelCategories.map((category) => ({
      ...category,
      bookingRanges: (category.bookingRanges ?? []).map((range) => {
        const periods =
          range.travelPeriods?.filter((period) => period.fromDate || period.toDate) ?? [];
        const first = periods[0];
        return {
          ...range,
          travelPeriods: periods.length ? periods : range.travelPeriods,
          fromDate: first?.fromDate || range.fromDate,
          toDate: first?.toDate || range.toDate,
        };
      }),
    })),
  };
}

export interface QuoteRecipientOption {
  email: string;
  sources: Array<"supplier_source" | "supplier_module">;
  supplierName?: string;
  supplierStatus?: string;
  relationshipStatus?: string;
}

function mergeSupplierName(current: string | undefined, next?: string | null): string | undefined {
  const name = next?.trim();
  if (!name) return current;
  if (!current) return name;
  const parts = current.split(", ");
  if (parts.some((part) => part.toLowerCase() === name.toLowerCase())) return current;
  return `${current}, ${name}`;
}

export function buildQuoteRecipients(input: {
  sourceEmails?: string[] | null;
  moduleSuppliers?:
    | {
        company_name?: string | null;
        email_address?: string | null;
        status?: string | null;
        relationship_status?: string | null;
      }[]
    | null;
}): QuoteRecipientOption[] {
  const byEmail = new Map<string, QuoteRecipientOption>();

  const add = (
    email: string,
    source: QuoteRecipientOption["sources"][number],
    supplier?: {
      company_name?: string | null;
      status?: string | null;
      relationship_status?: string | null;
    }
  ) => {
    const normalized = email.trim().toLowerCase();
    if (!isValidEmail(normalized)) return;
    const current = byEmail.get(normalized);
    if (!current) {
      byEmail.set(normalized, {
        email: normalized,
        sources: [source],
        supplierName: supplier?.company_name?.trim() || undefined,
        supplierStatus: supplier?.status?.trim() || undefined,
        relationshipStatus: supplier?.relationship_status?.trim() || undefined,
      });
      return;
    }
    if (!current.sources.includes(source)) current.sources.push(source);
    current.supplierName = mergeSupplierName(current.supplierName, supplier?.company_name);
    if (supplier?.status === "do_not_use" || !current.supplierStatus) {
      if (supplier?.status?.trim()) current.supplierStatus = supplier.status.trim();
    }
    if (supplier?.relationship_status === "blacklisted" || !current.relationshipStatus) {
      if (supplier?.relationship_status?.trim()) {
        current.relationshipStatus = supplier.relationship_status.trim();
      }
    }
  };

  for (const email of parseEmailList(input.sourceEmails ?? [])) {
    add(email, "supplier_source");
  }
  for (const supplier of input.moduleSuppliers ?? []) {
    for (const email of parseEmailList(supplier.email_address ?? "")) {
      add(email, "supplier_module", supplier);
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => {
    const aSource = a.sources.includes("supplier_source") ? 0 : 1;
    const bSource = b.sources.includes("supplier_source") ? 0 : 1;
    if (aSource !== bSource) return aSource - bSource;
    const byName = (a.supplierName ?? "").localeCompare(b.supplierName ?? "", undefined, {
      sensitivity: "base",
    });
    if (byName !== 0) return byName;
    return a.email.localeCompare(b.email);
  });
}

export function sanitizePackageUpdate<T extends UpdatePackageInput>(input: T): T {
  const next: UpdatePackageInput = { ...input };
  if (next.package_basics) {
    const { frontendNotes: _frontendNotes, ...basics } = next.package_basics;
    next.package_basics = basics;
  }
  if (next.media_frontend) next.media_frontend = sanitizeMedia(next.media_frontend);
  if (next.pricing) next.pricing = sanitizePricing(next.pricing);
  if (next.itinerary) next.itinerary = sanitizeItinerary(next.itinerary);
  if (next.hotels) next.hotels = serializeHotels(next.hotels);
  const retiredNonRefundable = next.inclusions?.nonRefundable?.trim();
  if (next.inclusions) next.inclusions = sanitizeInclusions(next.inclusions);
  if (
    retiredNonRefundable &&
    next.booking_policy !== null &&
    !next.booking_policy?.nonRefundableComponents?.trim()
  ) {
    next.booking_policy = {
      ...(next.booking_policy ?? {}),
      nonRefundableComponents: retiredNonRefundable,
    };
  }
  if (next.consultant_view) next.consultant_view = sanitizeConsultantView(next.consultant_view);
  return next as T;
}
