import type { SupplierQuoteToolData } from "./package-types";
import { SGT_TIME_ZONE } from "./format-date";
import { formatRoleLabel } from "./user-types";

export interface SupplierQuoteEmailContext {
  destination?: string;
  budgetLabel?: string;
}

export interface QuoteEmailSignature {
  name?: string | null;
  position?: string | null;
  role?: string | null;
}

const GENERIC_ROLES = new Set(["admin", "super_admin"]);

export function packageAttachmentFilename(title?: string | null): string {
  const cleaned = (title?.trim() || "package-details")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${cleaned || "package-details"}.html`;
}

export function buildQuoteEmailSubject(data: SupplierQuoteToolData): string {
  const packageName = data.basedOnPackage?.trim() || "package enquiry";
  const typeLabel = quoteTypeLabel(data.quoteRequestType);
  const reference = data.referenceCode?.trim();
  return ["Quote request", typeLabel, reference, packageName].filter(Boolean).join(" — ");
}

/** Keep a TC reference code in the subject even if the preview was edited by hand. */
export function applyReferenceCodeToSubject(subject: string, referenceCode: string): string {
  const code = referenceCode.trim();
  const current = subject.trim();
  if (!code) return current;
  const segments = current.split(/\s+—\s+/).map((segment) => segment.trim());
  if (segments.some((segment) => segment.toLowerCase() === code.toLowerCase())) {
    return current;
  }
  return current ? `${current} — ${code}` : code;
}

export function buildQuoteEmailBody(
  data: SupplierQuoteToolData,
  context: SupplierQuoteEmailContext = {}
): string {
  const supplierName = data.supplierToSendTo?.trim() || "[Supplier Name]";
  const packageName = data.basedOnPackage?.trim() || "[Package Name]";
  const destination = context.destination?.trim() || "[Destination]";
  const travelDates = data.clientTravelDates?.trim() || "[Travel dates]";
  const adults = data.adults?.trim() || "[Adults]";
  const children = data.children?.trim() || "0";
  const hotelPref = data.hotelPreference?.trim() || "[Hotel preference]";
  const rooming = data.rooming?.trim() || "[Rooming details]";
  const mealReq = data.mealRequirements?.trim() || "[Meal requirement]";
  const ages =
    data.childrenAges?.trim() ? ` (ages ${data.childrenAges.trim()})` : "";

  const lines: string[] = [
    `Hi ${supplierName},`,
    "",
    "We have a client enquiry based on your package.",
    "",
    "Could you please quote your best net rate for the below?",
    "",
    `Package: ${packageName}`,
    `Destination: ${destination}`,
    `Travel dates: ${travelDates}`,
    `Travellers: ${adults} adults, ${children} children${ages}`,
    `Hotel preference: ${hotelPref}`,
    `Rooming: ${rooming}`,
    `Meal requirement: ${mealReq}`,
  ];

  if (data.requestedChanges?.trim()) {
    lines.push(`Requested changes: ${data.requestedChanges.trim()}`);
  }

  if (data.attachPackage !== false) {
    lines.push("Package details: please see the attached package file");
  } else if (data.includeDayByDayItinerary) {
    lines.push("Itinerary: Day-by-day itinerary attached / available on request");
  }

  if (data.includeClientBudget) {
    lines.push(
      `Client budget: ${context.budgetLabel?.trim() || "[Budget range]"}`
    );
  }

  if (data.negotiationNote?.trim()) {
    lines.push("", `Note: ${data.negotiationNote.trim()}`);
  }

  if (data.replyDeadline) {
    const deadline = formatDeadline(data.replyDeadline);
    if (deadline) {
      lines.push("", `Please reply by ${deadline}.`);
    }
  }

  lines.push("", "Kind regards,");

  return lines.join("\n");
}

export function quoteSenderPosition(role?: string | null): string | undefined {
  const key = String(role ?? "").trim().toLowerCase();
  if (!key || GENERIC_ROLES.has(key)) return undefined;
  return formatRoleLabel(role!);
}

export function buildQuoteEmailSignature(input: QuoteEmailSignature = {}): string {
  const name = input.name?.trim();
  const position = input.position?.trim() || quoteSenderPosition(input.role);
  const lines: string[] = [];
  if (name) lines.push(name);
  if (position && position !== name) lines.push(position);
  if (lines[lines.length - 1] !== "Fayyaz Travels") {
    lines.push("Fayyaz Travels");
  }
  return lines.join("\n");
}

export function stripQuoteEmailSignature(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/\n*(?:Kind regards,?\s*\n)(?:[^\n]+\n){0,4}Fayyaz Travels\s*$/i, "")
    .trimEnd();
}

export function withQuoteEmailSignature(
  body: string,
  input: QuoteEmailSignature & { text?: string } = {}
): string {
  const signature = input.text?.trim() || buildQuoteEmailSignature(input);
  const unsigned = stripQuoteEmailSignature(body).trimEnd();
  if (!signature) return unsigned;
  if (!unsigned) return `Kind regards,\n${signature}`;
  if (/kind regards,?\s*$/i.test(unsigned)) {
    return `${unsigned}\n${signature}`;
  }
  return `${unsigned}\n\nKind regards,\n${signature}`;
}

function quoteTypeLabel(type?: string): string {
  switch (type) {
    case "new-enquiry":
      return "New client enquiry";
    case "amendment":
      return "Amendment request";
    case "reconfirmation":
      return "Reconfirmation";
    case "updated-rate":
    default:
      return "Updated rate request";
  }
}

function formatDeadline(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    timeZone: SGT_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
