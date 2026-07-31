import type { SupplierQuoteToolData } from "./package-types";
import { SGT_TIME_ZONE } from "./format-date";

export interface SupplierQuoteEmailContext {
  destination?: string;
  budgetLabel?: string;
}

export function buildQuoteEmailSubject(data: SupplierQuoteToolData): string {
  const packageName = data.basedOnPackage?.trim() || "package enquiry";
  const typeLabel = quoteTypeLabel(data.quoteRequestType);
  return `Quote request — ${typeLabel} — ${packageName}`;
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

  if (data.includeDayByDayItinerary) {
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

  lines.push("", "Kind regards,", "Fayyaz Travels");

  return lines.join("\n");
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
