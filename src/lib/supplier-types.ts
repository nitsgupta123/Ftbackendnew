export type SupplierStatus = "active" | "inactive" | "do_not_use";

export type SupplierRelationshipStatus =
  | "new"
  | "under_review"
  | "with_issues"
  | "on_probation"
  | "inactive"
  | "blacklisted"
  | "poor"
  | "average"
  | "good"
  | "excellent";

export interface SupplierRecord {
  id: number;
  company_name: string;
  country: string;
  city_tour_area: string | null;
  status: SupplierStatus;
  relationship_status: SupplierRelationshipStatus;
  services_offered: string | null;
  contact_person: string | null;
  email_address: string | null;
  contact_number: string | null;
  website: string | null;
  notes: string | null;
  problems_with_services: string | null;
  account_details: string | null;
  tc_poc_fixed_departure: string | null;
  relationship_owner: string | null;
  date_added_updated: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierInput {
  company_name: string;
  country: string;
  city_tour_area?: string | null;
  status?: SupplierStatus;
  relationship_status?: SupplierRelationshipStatus;
  services_offered?: string | null;
  contact_person?: string | null;
  email_address?: string | null;
  contact_number?: string | null;
  website?: string | null;
  notes?: string | null;
  problems_with_services?: string | null;
  account_details?: string | null;
  tc_poc_fixed_departure?: string | null;
  relationship_owner?: string | null;
  date_added_updated?: string | null;
}

export interface UpdateSupplierInput {
  company_name?: string;
  country?: string;
  city_tour_area?: string | null;
  status?: SupplierStatus;
  relationship_status?: SupplierRelationshipStatus;
  services_offered?: string | null;
  contact_person?: string | null;
  email_address?: string | null;
  contact_number?: string | null;
  website?: string | null;
  notes?: string | null;
  problems_with_services?: string | null;
  account_details?: string | null;
  tc_poc_fixed_departure?: string | null;
  relationship_owner?: string | null;
  date_added_updated?: string | null;
}

export const SUPPLIER_SORT_FIELDS = [
  "date_added_updated",
  "country",
  "status",
  "city_tour_area",
  "relationship_status",
  "company_name",
  "services_offered",
  "contact_person",
  "email_address",
  "contact_number",
  "website",
  "notes",
  "problems_with_services",
  "account_details",
  "tc_poc_fixed_departure",
  "relationship_owner",
  "updated_at",
] as const;

export type SupplierSortField = (typeof SUPPLIER_SORT_FIELDS)[number];

export function isSupplierSortField(value: string): value is SupplierSortField {
  return (SUPPLIER_SORT_FIELDS as readonly string[]).includes(value);
}

export interface ListSuppliersParams {
  search?: string;
  status?: SupplierStatus | "all";
  relationship_status?: SupplierRelationshipStatus | "all";
  country?: string | "all";
  sort?: SupplierSortField;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ListSuppliersResult {
  suppliers: SupplierRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SuppliersStats {
  total: number;
  active: number;
  inactive: number;
  with_issues: number;
  countries: number;
}

export const SUPPLIER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "do_not_use", label: "Do not use" },
] as const;

export const SUPPLIER_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...SUPPLIER_STATUS_OPTIONS,
] as const;

export type SupplierStatusFilter =
  (typeof SUPPLIER_STATUS_FILTER_OPTIONS)[number]["value"];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  do_not_use: "Do not use",
};

export const SUPPLIER_RELATIONSHIP_OPTIONS = [
  { value: "new", label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "with_issues", label: "With Issues" },
  { value: "on_probation", label: "On Probation" },
  { value: "inactive", label: "Inactive" },
  { value: "blacklisted", label: "Blacklisted" },
  { value: "poor", label: "Poor" },
  { value: "average", label: "Average" },
  { value: "good", label: "Good" },
  { value: "excellent", label: "Excellent" },
] as const;

export const SUPPLIER_RELATIONSHIP_FILTER_OPTIONS = [
  { value: "all", label: "All relationships" },
  ...SUPPLIER_RELATIONSHIP_OPTIONS,
] as const;

export type SupplierRelationshipFilter =
  (typeof SUPPLIER_RELATIONSHIP_FILTER_OPTIONS)[number]["value"];

export const SUPPLIER_SORT_OPTIONS = [
  { value: "company_name", label: "Company name" },
  { value: "country", label: "Country" },
  { value: "status", label: "Active status" },
  { value: "city_tour_area", label: "City / Tour Area" },
  { value: "relationship_status", label: "Relationship status" },
  { value: "services_offered", label: "Services offered" },
  { value: "contact_person", label: "Point of contact" },
  { value: "email_address", label: "Email address" },
  { value: "contact_number", label: "Contact number" },
  { value: "website", label: "Website" },
  { value: "notes", label: "Notes" },
  { value: "problems_with_services", label: "Problems with services" },
  { value: "account_details", label: "Account details" },
  { value: "tc_poc_fixed_departure", label: "TC POC fixed departure" },
  { value: "relationship_owner", label: "Relationship owner" },
  { value: "updated_at", label: "Last updated" },
  { value: "date_added_updated", label: "Date added" },
] as const;

export const RELATIONSHIP_STATUS_LABELS: Record<SupplierRelationshipStatus, string> = {
  new: "New",
  under_review: "Under Review",
  with_issues: "With Issues",
  on_probation: "On Probation",
  inactive: "Inactive",
  blacklisted: "Blacklisted",
  poor: "Poor",
  average: "Average",
  good: "Good",
  excellent: "Excellent",
};

export type SupplierServiceOption = {
  value: string;
  label: string;
  className: string;
};

/** Preset services for supplier Services Offered multi-select */
export const SUPPLIER_SERVICE_OPTIONS: readonly SupplierServiceOption[] = [
  { value: "FIT", label: "FIT", className: "bg-violet-700 text-white" },
  { value: "Bespoked", label: "Bespoked", className: "bg-amber-100 text-amber-900" },
  { value: "SIC", label: "SIC", className: "bg-emerald-100 text-emerald-800" },
  { value: "Honeymoon", label: "Honeymoon", className: "bg-sky-100 text-sky-800" },
  { value: "Land Only", label: "Land Only", className: "bg-violet-100 text-violet-800" },
  { value: "Luxury", label: "Luxury", className: "bg-[#5C4033] text-white" },
  { value: "Private", label: "Private", className: "bg-violet-800 text-white" },
  { value: "Self-Drive", label: "Self-Drive", className: "bg-gray-200 text-gray-800" },
  { value: "Transportation", label: "Transportation", className: "bg-red-600 text-white" },
  { value: "Corporate", label: "Corporate", className: "bg-blue-100 text-blue-800" },
  { value: "Budgeted", label: "Budgeted", className: "bg-rose-100 text-rose-800" },
  { value: "Hotel", label: "Hotel", className: "bg-[#0B3A5C] text-white" },
  {
    value: "Adventure/Hikes",
    label: "Adventure/Hikes",
    className: "bg-gray-700 text-white",
  },
  { value: "Group", label: "Group", className: "bg-purple-800 text-white" },
  { value: "Visa", label: "Visa", className: "bg-amber-100 text-amber-900" },
  { value: "Cruise", label: "Cruise", className: "bg-sky-100 text-sky-800" },
  { value: "Restaurant", label: "Restaurant", className: "bg-[#F5D0B5] text-[#9A5B2F]" },
  { value: "MICE", label: "MICE", className: "bg-[#3D5A5B] text-white" },
  { value: "Umrah", label: "Umrah", className: "bg-[#F5D0B5] text-[#9A5B2F]" },
  {
    value: "Attractions & Ticketing",
    label: "Attractions & Ticketing",
    className: "bg-red-700 text-white",
  },
  { value: "Resort", label: "Resort", className: "bg-sky-100 text-sky-800" },
  { value: "Flights", label: "Flights", className: "bg-[#0B3A5C] text-white" },
  { value: "Insurance", label: "Insurance", className: "bg-gray-200 text-gray-800" },
  { value: "Tour Guide", label: "Tour Guide", className: "bg-gray-200 text-gray-800" },
  {
    value: "Online Supplier",
    label: "Online Supplier",
    className: "bg-gray-200 text-gray-800",
  },
];

export type SupplierServiceValue = (typeof SUPPLIER_SERVICE_OPTIONS)[number]["value"];

const CUSTOM_SERVICES_STORAGE_KEY = "ftadmin.supplier.customServices";

export type CustomSupplierService = {
  name: string;
  slug: string;
};

export function parseSupplierServices(
  value: string | null | undefined
): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function serializeSupplierServices(values: string[]): string {
  return values.map((v) => v.trim()).filter(Boolean).join(", ");
}

export function getSupplierServiceClassName(value: string): string {
  const match = SUPPLIER_SERVICE_OPTIONS.find(
    (option) => option.value.toLowerCase() === value.toLowerCase()
  );
  return match?.className ?? "bg-gray-100 text-gray-700";
}

export function isPresetSupplierService(value: string): boolean {
  return SUPPLIER_SERVICE_OPTIONS.some(
    (option) => option.value.toLowerCase() === value.toLowerCase()
  );
}

function normalizeCustomService(item: unknown): CustomSupplierService | null {
  if (typeof item === "string") {
    const name = item.trim();
    if (!name) return null;
    return { name, slug: name.toLowerCase().replace(/\s+/g, "-") };
  }
  if (!item || typeof item !== "object") return null;
  const record = item as { name?: unknown; slug?: unknown };
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;
  const slug =
    typeof record.slug === "string" && record.slug.trim()
      ? record.slug.trim()
      : name.toLowerCase().replace(/\s+/g, "-");
  return { name, slug };
}

export function loadCustomSupplierServices(): CustomSupplierService[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_SERVICES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const byName = new Map<string, CustomSupplierService>();
    for (const item of parsed) {
      const normalized = normalizeCustomService(item);
      if (!normalized || isPresetSupplierService(normalized.name)) continue;
      const key = normalized.name.toLowerCase();
      if (!byName.has(key)) byName.set(key, normalized);
    }
    return [...byName.values()];
  } catch {
    return [];
  }
}

export function saveCustomSupplierService(input: {
  name: string;
  slug: string;
}): CustomSupplierService[] {
  const name = input.name.trim();
  const slug = input.slug.trim();
  if (!name || isPresetSupplierService(name)) {
    return loadCustomSupplierServices();
  }

  const existing = loadCustomSupplierServices();
  if (existing.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    return existing;
  }

  const next = [...existing, { name, slug: slug || name.toLowerCase().replace(/\s+/g, "-") }];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CUSTOM_SERVICES_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function buildSupplierServiceOptions(
  customServices: CustomSupplierService[] = [],
  selectedServices: string[] = []
): SupplierServiceOption[] {
  const extras = new Map<string, string>();

  for (const service of customServices) {
    const trimmed = service.name.trim();
    if (!trimmed || isPresetSupplierService(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (!extras.has(key)) extras.set(key, trimmed);
  }

  for (const service of selectedServices) {
    const trimmed = service.trim();
    if (!trimmed || isPresetSupplierService(trimmed)) continue;
    const key = trimmed.toLowerCase();
    if (!extras.has(key)) extras.set(key, trimmed);
  }

  const customOptions: SupplierServiceOption[] = [...extras.values()].map(
    (value) => ({
      value,
      label: value,
      className: "bg-gray-100 text-gray-700",
    })
  );

  return [...SUPPLIER_SERVICE_OPTIONS, ...customOptions];
}

/** Mirrors the Google Sheet Summary formula column */
export function buildSupplierSummary(supplier: SupplierRecord): string {
  const parts = [
    `Country: ${supplier.country}`,
    `Active Status: ${SUPPLIER_STATUS_LABELS[supplier.status]}`,
    supplier.city_tour_area ? `City / Tour Area: ${supplier.city_tour_area}` : null,
    `Relationship Status: ${RELATIONSHIP_STATUS_LABELS[supplier.relationship_status]}`,
    `Company Name: ${supplier.company_name}`,
    supplier.services_offered
      ? `Services Offered: ${supplier.services_offered}`
      : null,
    supplier.contact_person
      ? `Point of Contact Name: ${supplier.contact_person}`
      : null,
    supplier.email_address ? `Email Address: ${supplier.email_address}` : null,
    supplier.contact_number ? `Contact Number: ${supplier.contact_number}` : null,
    supplier.website ? `Website: ${supplier.website}` : null,
    supplier.notes ? `Notes: ${supplier.notes}` : null,
    supplier.problems_with_services
      ? `Problems with Services: ${supplier.problems_with_services}`
      : null,
    supplier.relationship_owner
      ? `Relationship Owner: ${supplier.relationship_owner}`
      : null,
  ].filter(Boolean);

  return parts.join("\n");
}
