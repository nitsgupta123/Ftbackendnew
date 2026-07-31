import type { PackageBasicsValues, SupplierFormValues } from "./validation";

export type PackageStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "archived"
  | "deleted";

export type PackageStatusFilter = "all" | PackageStatus;

export const PACKAGE_STATUS_FILTER_OPTIONS: {
  value: PackageStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "archived", label: "Archived" },
  { value: "deleted", label: "Deleted" },
];

const PACKAGE_STATUS_FILTER_VALUES = new Set<PackageStatusFilter>(
  PACKAGE_STATUS_FILTER_OPTIONS.map((option) => option.value)
);

export function parsePackageStatusFilter(value: string | null): PackageStatusFilter {
  if (!value || value === "all") return "all";
  return PACKAGE_STATUS_FILTER_VALUES.has(value as PackageStatusFilter)
    ? (value as PackageStatusFilter)
    : "all";
}

export function packageAllPackagesHref(status: PackageStatusFilter = "all"): string {
  if (status === "all") return "/packages/all";
  return `/packages/all?status=${encodeURIComponent(status)}`;
}

/** Marketing / frontend asset attached under Package Highlights */
export interface PackageMediaAsset {
  id: string;
  url: string;
  altText?: string;
  sourceUrl?: string;
  filename?: string;
}

export interface MediaFrontendData {
  desktopHeroImage?: string | null;
  mobileHeroImage?: string | null;
  packageCardImage?: string | null;
  videoLink?: string;
  priceDisplayType?: string;
  primaryCta?: string;
  secondaryCta?: string;
  whatsappNumber?: string;
  whatsappLink?: string;
  /** Package highlight images for frontend marketing */
  highlightImages?: PackageMediaAsset[];
  /** Marketing banners for package pages */
  marketingBanners?: PackageMediaAsset[];
  /** Promotional assets (campaign creatives, overlays, etc.) */
  promotionalAssets?: PackageMediaAsset[];
  /** Package highlight graphics / icons */
  highlightGraphics?: PackageMediaAsset[];
  /** @deprecated Moved to Package Basics (`frontendNotes`) */
  frontEndSummary?: string;
  whyChooseThisPackage?: string;
  /** @deprecated Moved to Package Basics (`importantInfo`) */
  clientFacingNotes?: string;
}

export interface PricingPaxRow {
  id: string;
  tier: string;
  adultNet: string;
  adultSelling: string;
  childWithBedNet: string;
}

export interface BlackoutRow {
  id: string;
  startDate: string;
  endDate: string;
  appliesTo: string;
}

export interface PricingData {
  supplierCurrency?: string;
  displayCurrency?: string;
  pricingCalculation?: string;
  exchangeRateType?: string;
  exchangeRate?: string;
  rateLockedUntil?: string;
  markupType?: string;
  markupValue?: string;
  minimumMarginAlert?: string;
  showSlashedRate?: boolean;
  originalPriceLabel?: string;
  discountedPriceLabel?: string;
  promotionStart?: string;
  promotionEnd?: string;
  promoDisplayNote?: string;
  hotelCategory?: string;
  defaultRoomBasis?: string;
  hotelPricingNotes?: string;
  childPricingRules?: string;
  paxRows?: PricingPaxRow[];
  blackoutDates?: BlackoutRow[];
}

export interface ItineraryDay {
  dayNumber: number;
  title?: string;
  description?: string;
  activitiesIncluded?: string;
  highlights?: string;
  internalNotes?: string;
  mobilityWarning?: string;
  supplierNotes?: string;
  dietaryNotes?: string;
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
  /** @deprecated Legacy fields retained for existing package JSON */
  city?: string;
  optionalActivities?: string;
  transport?: string;
  hotelThatNight?: string;
  halalFoodNote?: string;
  guideIncluded?: boolean;
  imageUrl?: string | null;
}

export interface ItineraryData {
  days?: ItineraryDay[];
}

export interface HotelEntry {
  hotelName?: string;
  city?: string;
  starRating?: string;
  roomType?: string;
  nights?: string;
  childPolicy?: string;
  maxOccupancy?: string;
  address?: string;
  googleMapsLink?: string;
  visibility?: string;
  internalNotes?: string;
  breakfastIncluded?: boolean;
  halalBreakfast?: boolean;
  connectingRooms?: boolean;
  extraBed?: boolean;
}

export interface InclusionsData {
  included?: string[];
  excluded?: string[];
  optionalAddons?: string[];
  localFees?: string;
  nonRefundable?: string;
  consultantMustExplain?: boolean;
  flightsIncluded?: boolean;
  trainIncluded?: boolean;
  transfersIncluded?: boolean;
}

export interface CancellationRow {
  id: string;
  from: string;
  to: string;
  clientCharge: string;
}

export interface BookingPolicyData {
  paymentMode?: string;
  depositAmount?: string;
  balanceDue?: string;
  confirmationRule?: string;
  cancellationRows?: CancellationRow[];
  amendmentPolicy?: string;
  exceptionApproval?: string;
  refundableComponents?: string;
  nonRefundableComponents?: string;
}

export interface ConsultantViewData {
  internalSummary?: string;
  howToSell?: string;
  bestClientProfile?: string;
  commonObjections?: string;
  suggestedResponse?: string;
  upsellIdeas?: string;
  doNotPromise?: string;
  knownRisks?: string;
  visaPassportReminders?: string;
  halalDietaryPositioning?: string;
  clientSuitabilityNotes?: string;
  urgencyFollowUpGuidance?: string;
}

export interface SupplierQuoteToolData {
  quoteRequestType?: string;
  supplierToSendTo?: string;
  basedOnPackage?: string;
  replyDeadline?: string;
  clientTravelDates?: string;
  adults?: string;
  children?: string;
  childrenAges?: string;
  hotelPreference?: string;
  rooming?: string;
  mealRequirements?: string;
  requestedChanges?: string;
  negotiationNote?: string;
  includeDayByDayItinerary?: boolean;
  includeClientBudget?: boolean;
  /** Supplier emails selected as To recipients */
  toEmails?: string[];
  /** Extra To recipients added manually */
  additionalEmails?: string[];
  emailSubject?: string;
  emailBody?: string;
  lastSentAt?: string;
  lastSentBy?: string | null;
  lastSentTo?: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  visibility?: string;
}

export interface SalesAdsAssetsData {
  googleAdHeadlines?: string;
  socialAdCaptions?: string;
  consultantShareMessage?: string;
  whatsappLink?: string;
}

export interface SeoData {
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  secondaryKeywords?: string;
  relatedPackages?: string;
  manualRelatedPackages?: string;
  internalLinks?: string;
  indexStatus?: string;
  seoReviewer?: string;
  seoStatus?: string;
}

export interface ReviewPublishData {
  productReviewer?: string;
  seoReviewer?: string;
  opsReviewer?: string;
  finalApprover?: string;
  reviewNotes?: string;
  publishedAt?: string | null;
  submitAction?: "save" | "submit_for_review" | "publish";
}

export type PackageListSource = "wizard" | "legacy";

export interface PackageStats {
  total: number;
  draft: number;
  pending_review: number;
  published: number;
  archived: number;
  expiring_rates: number;
  supplier_quotes: number;
  legacy_total?: number;
  wizard_total?: number;
}

export interface PackageRecord {
  id: number;
  package_id: number;
  status: PackageStatus;
  current_step: number;
  package_title: string | null;
  slug: string | null;
  supplier_name: string | null;
  source?: PackageListSource;
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
  review_publish: ReviewPublishData | null;
  image_url?: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PackageSectionKey =
  | "supplier_source"
  | "package_basics"
  | "media_frontend"
  | "pricing"
  | "itinerary"
  | "hotels"
  | "inclusions"
  | "booking_policy"
  | "consultant_view"
  | "supplier_quote_tool"
  | "frontend_faqs"
  | "sales_ads_assets"
  | "seo"
  | "review_publish";

export interface CreatePackageInput {
  package_id?: number;
  supplier_source?: SupplierFormValues;
  current_step?: number;
}

export interface UpdatePackageInput {
  status?: PackageStatus;
  current_step?: number;
  package_title?: string | null;
  slug?: string | null;
  supplier_name?: string | null;
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
  review_publish?: ReviewPublishData | null;
}

export const PACKAGE_STEP_FIELDS: Record<number, PackageSectionKey> = {
  1: "supplier_source",
  2: "package_basics",
  3: "media_frontend",
  4: "pricing",
  5: "itinerary",
  6: "hotels",
  7: "inclusions",
  8: "booking_policy",
  9: "consultant_view",
  10: "supplier_quote_tool",
  11: "frontend_faqs",
  12: "sales_ads_assets",
  13: "seo",
  14: "review_publish",
};
