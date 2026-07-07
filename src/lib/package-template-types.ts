import type {
  BookingPolicyData,
  ConsultantViewData,
  FaqItem,
  HotelEntry,
  InclusionsData,
  ItineraryData,
  MediaFrontendData,
  PackageSectionKey,
  PricingData,
  SalesAdsAssetsData,
  SeoData,
  SupplierQuoteToolData,
  UpdatePackageInput,
} from "./package-types";
import type { PackageBasicsValues, SupplierFormValues } from "./validation";

export type TemplateStatus = "active" | "inactive";
export type TemplateType = "full" | "partial";

export const TEMPLATE_SECTION_KEYS: PackageSectionKey[] = [
  "supplier_source",
  "package_basics",
  "media_frontend",
  "pricing",
  "itinerary",
  "hotels",
  "inclusions",
  "booking_policy",
  "consultant_view",
  "supplier_quote_tool",
  "frontend_faqs",
  "sales_ads_assets",
  "seo",
];

export const TEMPLATE_STEP_OPTIONS = [
  { step: 1, key: "supplier_source" as const, label: "Supplier Source" },
  { step: 2, key: "package_basics" as const, label: "Package Basics" },
  { step: 3, key: "media_frontend" as const, label: "Media & Front-End" },
  { step: 4, key: "pricing" as const, label: "Pricing" },
  { step: 5, key: "itinerary" as const, label: "Itinerary" },
  { step: 6, key: "hotels" as const, label: "Hotels" },
  { step: 7, key: "inclusions" as const, label: "Inclusions" },
  { step: 8, key: "booking_policy" as const, label: "Booking Policy" },
  { step: 9, key: "consultant_view" as const, label: "Consultant View" },
  { step: 10, key: "supplier_quote_tool" as const, label: "Supplier Quote Tool" },
  { step: 11, key: "frontend_faqs" as const, label: "Front-End FAQs" },
  { step: 12, key: "sales_ads_assets" as const, label: "Sales & Ads Assets" },
  { step: 13, key: "seo" as const, label: "SEO" },
];

export interface PackageTemplateRecord {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  template_type: TemplateType;
  included_steps: number[];
  supplier_source: SupplierFormValues | null;
  package_basics: PackageBasicsValues | null;
  media_frontend: MediaFrontendData | null;
  pricing: PricingData | null;
  itinerary: ItineraryData | null;
  hotels: HotelEntry[] | null;
  inclusions: InclusionsData | null;
  booking_policy: BookingPolicyData | null;
  consultant_view: ConsultantViewData | null;
  supplier_quote_tool: SupplierQuoteToolData | null;
  frontend_faqs: FaqItem[] | null;
  sales_ads_assets: SalesAdsAssetsData | null;
  seo: SeoData | null;
  status: TemplateStatus;
  is_default: boolean;
  display_order: number;
  usage_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePackageTemplateInput {
  name: string;
  slug?: string;
  description?: string | null;
  template_type?: TemplateType;
  included_steps?: number[];
  supplier_source?: SupplierFormValues | null;
  package_basics?: PackageBasicsValues | null;
  media_frontend?: MediaFrontendData | null;
  pricing?: PricingData | null;
  itinerary?: ItineraryData | null;
  hotels?: HotelEntry[] | null;
  inclusions?: InclusionsData | null;
  booking_policy?: BookingPolicyData | null;
  consultant_view?: ConsultantViewData | null;
  supplier_quote_tool?: SupplierQuoteToolData | null;
  frontend_faqs?: FaqItem[] | null;
  sales_ads_assets?: SalesAdsAssetsData | null;
  seo?: SeoData | null;
  status?: TemplateStatus;
  is_default?: boolean;
  display_order?: number;
}

export interface UpdatePackageTemplateInput {
  name?: string;
  slug?: string;
  description?: string | null;
  template_type?: TemplateType;
  included_steps?: number[];
  supplier_source?: SupplierFormValues | null;
  package_basics?: PackageBasicsValues | null;
  media_frontend?: MediaFrontendData | null;
  pricing?: PricingData | null;
  itinerary?: ItineraryData | null;
  hotels?: HotelEntry[] | null;
  inclusions?: InclusionsData | null;
  booking_policy?: BookingPolicyData | null;
  consultant_view?: ConsultantViewData | null;
  supplier_quote_tool?: SupplierQuoteToolData | null;
  frontend_faqs?: FaqItem[] | null;
  sales_ads_assets?: SalesAdsAssetsData | null;
  seo?: SeoData | null;
  status?: TemplateStatus;
  is_default?: boolean;
  display_order?: number;
}

export interface ListPackageTemplatesParams {
  search?: string;
  status?: TemplateStatus | "all";
  template_type?: TemplateType | "all";
  sort?: "display_order" | "created_at" | "usage_count";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  activeOnly?: boolean;
}

export interface ListPackageTemplatesResult {
  templates: PackageTemplateRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PackageTemplatesStats {
  total: number;
  active: number;
  inactive: number;
  full: number;
  partial: number;
  default_template: Pick<PackageTemplateRecord, "id" | "name" | "slug"> | null;
}

export interface ApplyPackageTemplateResult {
  payload: UpdatePackageInput;
  current_step: number;
  template: PackageTemplateRecord;
}

export const TEMPLATE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export type TemplateStatusFilter = (typeof TEMPLATE_STATUS_FILTER_OPTIONS)[number]["value"];

export const TEMPLATE_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "full", label: "Full" },
  { value: "partial", label: "Partial" },
] as const;

export type TemplateTypeFilter = (typeof TEMPLATE_TYPE_FILTER_OPTIONS)[number]["value"];

export const TEMPLATE_SORT_OPTIONS = [
  { value: "display_order", label: "Display order" },
  { value: "created_at", label: "Created date" },
  { value: "usage_count", label: "Usage count" },
] as const;
