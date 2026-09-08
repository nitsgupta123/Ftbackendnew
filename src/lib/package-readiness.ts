import type {
  InclusionsData,
  ItineraryData,
  MediaFrontendData,
  PackageMediaAsset,
  PackageRecord,
  PricingData,
  PricingDetailsBlock,
  SalesAdsAssetsData,
  SeoData,
} from "./package-types";
import {
  normalizeSupplierFormValues,
  type PackageBasicsValues,
  type SupplierFormValues,
} from "./validation";

export type ReadinessStatus = "complete" | "warning";

export interface ReadinessHealthCheck {
  title: string;
  description: string;
  status: ReadinessStatus;
}

export interface ReadinessSectionCard {
  title: string;
  owner?: string;
  lastEdited?: string;
  description?: string;
  status: ReadinessStatus;
}

export interface ReadinessSignOffItem {
  stage: string;
  responsible: string;
  lastAction: string;
  badge: string;
  badgeStyle: "ready" | "needs" | "draft" | "blocked";
}

export interface PackageReadiness {
  healthChecks: ReadinessHealthCheck[];
  sectionCards: ReadinessSectionCard[];
  readinessPercent: number;
  signOffTrail: ReadinessSignOffItem[];
}

const GALLERY_ASSET_KEYS = [
  "highlightImages",
  "marketingBanners",
  "promotionalAssets",
  "highlightGraphics",
] as const;

function filled(value?: string | number | null): boolean {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

const IGNORED_DEFAULT_TEXT = new Set(
  [
    "internal only",
    "from price",
    "book now",
    "speak to a travel consultant",
    "index",
    "noindex",
    "not started",
    "draft",
    "auto suggest by destination and category",
    "auto-assigned from logged-in seo user",
    "6594314389",
  ].map((value) => value.toLowerCase())
);

const SKIP_KEYS = new Set(["id", "dayNumber", "category"]);

const TOGGLE_CONTENT_KEYS = new Set([
  "breakfast",
  "lunch",
  "dinner",
  "guideIncluded",
]);

function coerceJson<T>(value: T | string | null | undefined): T | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as T;
      return parsed == null ? null : parsed;
    } catch {
      return null;
    }
  }
  return value;
}

function isMeaningfulText(value: string): boolean {
  const text = value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").trim();
  if (!text) return false;
  if (IGNORED_DEFAULT_TEXT.has(text.toLowerCase())) return false;
  if (/^https?:\/\/wa\.me\/6594314389/i.test(text)) return false;
  return true;
}

/** True when saved JSON has user-entered details, ignoring empty shells and form defaults. */
function valueHasDetails(value: unknown, key?: string): boolean {
  if (value == null) return false;
  if (typeof value === "boolean") {
    return Boolean(key && TOGGLE_CONTENT_KEYS.has(key) && value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value !== 0;
  }
  if (typeof value === "string") {
    return isMeaningfulText(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueHasDetails(item, key));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([childKey, child]) => {
      if (SKIP_KEYS.has(childKey)) return false;
      return valueHasDetails(child, childKey);
    });
  }
  return false;
}

function asList(value: unknown, wrappedKeys: string[] = []): unknown[] {
  const data = coerceJson(value);
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const wrapped of wrappedKeys) {
      if (Array.isArray(record[wrapped])) return record[wrapped] as unknown[];
    }
  }
  return [];
}

function editorLabel(pkg: PackageRecord | null | undefined): string {
  return pkg?.updated_by?.trim() || pkg?.created_by?.trim() || "Current user";
}

function lastEditedCopy(
  pkg: PackageRecord | null | undefined,
  hasContent: boolean
): string {
  return hasContent ? editorLabel(pkg) : "Not started";
}

function lastActionCopy(
  pkg: PackageRecord | null | undefined,
  hasContent: boolean
): string {
  return hasContent ? `Last edited by ${editorLabel(pkg)}` : "Not started";
}

function parsePricingData(
  pricing: PricingData | string | null | undefined
): PricingData | null {
  if (!pricing) return null;
  if (typeof pricing === "string") {
    try {
      const parsed = JSON.parse(pricing) as PricingData;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return pricing;
}

function blockHasRates(block: PricingDetailsBlock | undefined): boolean {
  if (!block) return false;
  const adultsReady = (block.adultTiers ?? []).some(
    (tier) =>
      filled(tier.netPrice) || filled(tier.retailPrice) || filled(tier.margin)
  );
  const childrenReady = (block.childRows ?? []).some(
    (row) => filled(row.netPrice) || filled(row.retailPrice) || filled(row.margin)
  );
  return adultsReady || childrenReady;
}

export interface PricingReadiness {
  complete: boolean;
  description: string;
}

export function getPricingReadiness(
  pricing: PricingData | string | null | undefined
): PricingReadiness {
  const data = parsePricingData(pricing);
  if (!data) {
    return { complete: false, description: "No pricing saved" };
  }

  const categoryReady = (data.hotelCategories ?? []).some((category) => {
    const rangeReady = (category.bookingRanges ?? []).some(
      (range) =>
        blockHasRates(range.pricing) ||
        filled(range.fromDate) ||
        filled(range.toDate)
    );
    const departureReady = (category.departureMonths ?? []).some((month) =>
      (month.dates ?? []).some(
        (entry) => blockHasRates(entry.pricing) || filled(entry.date)
      )
    );
    return rangeReady || departureReady;
  });

  const legacyPaxReady = (data.paxRows ?? []).some(
    (row) =>
      filled(row.adultNet) || filled(row.adultSelling) || filled(row.childWithBedNet)
  );
  const displayPriceReady =
    filled(data.originalPriceLabel) || filled(data.discountedPriceLabel);
  const markupReady = filled(data.markupValue);

  const complete = categoryReady || legacyPaxReady || displayPriceReady || markupReady;
  return {
    complete,
    description: complete
      ? "Hotel category pricing, booking dates or display rates are set"
      : "Add net/retail prices or booking dates to a hotel category, or a display/from price",
  };
}

export function isPricingComplete(
  pricing: PricingData | string | null | undefined
): boolean {
  return getPricingReadiness(pricing).complete;
}

function galleryAssets(media: MediaFrontendData | null | undefined): PackageMediaAsset[] {
  if (!media) return [];
  return GALLERY_ASSET_KEYS.flatMap((key) => media[key] ?? []);
}

export interface ImageReadiness {
  complete: boolean;
  missingHeroes: string[];
  missingAltCount: number;
  description: string;
}

export function getImageReadiness(
  media: MediaFrontendData | null | undefined
): ImageReadiness {
  const heroes = [
    media?.desktopHeroImage,
    media?.mobileHeroImage,
    media?.packageCardImage,
  ].filter((value) => filled(value));
  const gallery = galleryAssets(media).filter((asset) => filled(asset.url));
  const missingAltCount = gallery.filter((asset) => !filled(asset.altText)).length;

  const parts: string[] = [];
  if (heroes.length === 0 && gallery.length === 0) {
    parts.push("Upload a desktop, mobile or package card image");
  }
  if (missingAltCount > 0) {
    parts.push(
      `${missingAltCount} uploaded ${missingAltCount === 1 ? "image is" : "images are"} missing alt text`
    );
  }

  const complete = (heroes.length > 0 || gallery.length > 0) && missingAltCount === 0;
  return {
    complete,
    missingHeroes: heroes.length > 0 || gallery.length > 0 ? [] : ["a package image"],
    missingAltCount,
    description: complete
      ? "Package images are set"
      : parts.join(". ") || "Package images required",
  };
}

export function isSupplierContactsComplete(
  supplier: SupplierFormValues | null | undefined
): boolean {
  const normalized = normalizeSupplierFormValues(supplier);
  return (
    filled(normalized.supplierName) &&
    normalized.supplierEmails.some((email) => filled(email))
  );
}

function isSupplierSectionComplete(
  supplier: SupplierFormValues | null | undefined
): boolean {
  const normalized = normalizeSupplierFormValues(supplier);
  return (
    filled(normalized.supplierName) ||
    filled(normalized.supplierPackageName) ||
    normalized.supplierEmails.some((email) => filled(email)) ||
    valueHasDetails(supplier)
  );
}

function isBasicsComplete(basics: PackageBasicsValues | null | undefined): boolean {
  const data = coerceJson(basics);
  if (!data) return false;
  return (
    filled(data.packageTitle) ||
    filled(data.slug) ||
    filled(data.shortIntro) ||
    filled(data.packageOverview) ||
    filled(data.packageMode) ||
    filled(data.tourType) ||
    filled(data.runs) ||
    filled(data.countriesCovered) ||
    filled(data.citiesOrRegions) ||
    filled(data.days) ||
    filled(data.nights) ||
    valueHasDetails(data)
  );
}

function isItineraryComplete(itinerary: ItineraryData | null | undefined): boolean {
  const days = asList(itinerary, ["days", "itinerary"]);
  return days.some((day) => valueHasDetails(day));
}

function isHotelsComplete(hotels: PackageRecord["hotels"] | undefined): boolean {
  return asList(hotels, ["hotels", "entries"]).some((hotel) => {
    if (!hotel || typeof hotel !== "object") return false;
    const row = hotel as Record<string, unknown>;
    return (
      filled(row.hotelName as string | undefined) ||
      filled(row.name as string | undefined) ||
      filled(row.hotel as string | undefined) ||
      filled(row.city as string | undefined) ||
      filled(row.starRating as string | undefined) ||
      filled(row.roomType as string | undefined) ||
      filled(row.nights as string | number | undefined) ||
      valueHasDetails(hotel)
    );
  });
}

function isInclusionsComplete(inclusions: InclusionsData | null | undefined): boolean {
  const data = coerceJson(inclusions) as (InclusionsData & {
    inclusionsList?: unknown;
    exclusionsList?: unknown;
  }) | null;
  if (!data) return false;
  return (
    valueHasDetails(data.included) ||
    valueHasDetails(data.excluded) ||
    valueHasDetails(data.optionalAddons) ||
    valueHasDetails(data.localFees) ||
    valueHasDetails(data.nonRefundable) ||
    valueHasDetails(data.inclusionsList) ||
    valueHasDetails(data.exclusionsList) ||
    valueHasDetails(data)
  );
}

function isBookingPolicyComplete(pkg: PackageRecord | null | undefined): boolean {
  const policy = coerceJson(pkg?.booking_policy) as
    | (NonNullable<PackageRecord["booking_policy"]> & {
        bookingDeadline?: string;
        depositRequired?: string;
        cancellationPolicy?: string;
      })
    | null;
  if (!policy) return false;
  return (
    filled(policy.paymentMode) ||
    filled(policy.depositAmount) ||
    filled(policy.balanceDue) ||
    filled(policy.amendmentPolicy) ||
    filled(policy.bookingDeadline) ||
    filled(policy.depositRequired) ||
    filled(policy.cancellationPolicy) ||
    valueHasDetails(policy.cancellationRows) ||
    valueHasDetails(policy)
  );
}

function isConsultantViewComplete(pkg: PackageRecord | null | undefined): boolean {
  return valueHasDetails(coerceJson(pkg?.consultant_view));
}

function isQuoteToolComplete(pkg: PackageRecord | null | undefined): boolean {
  return valueHasDetails(coerceJson(pkg?.supplier_quote_tool));
}

function isFaqsComplete(pkg: PackageRecord | null | undefined): boolean {
  return asList(pkg?.frontend_faqs, ["faqs", "items"]).some((faq) => valueHasDetails(faq));
}

function isSalesAssetsComplete(assets: SalesAdsAssetsData | null | undefined): boolean {
  return valueHasDetails(coerceJson(assets));
}

function isMediaSectionComplete(media: MediaFrontendData | null | undefined): boolean {
  const data = coerceJson(media);
  if (!data) return false;
  return getImageReadiness(data).complete || valueHasDetails(data);
}

export function isSeoComplete(seo: SeoData | null | undefined): boolean {
  const data = coerceJson(seo);
  if (!data) return false;
  return (
    filled(data.metaTitle) ||
    filled(data.metaDescription) ||
    filled(data.focusKeyword) ||
    filled(data.secondaryKeywords) ||
    valueHasDetails(data)
  );
}

function isPromotionComplete(pricing: PricingData | null | undefined): boolean {
  if (!pricing) return false;
  if (!pricing.showSlashedRate) return true;
  return filled(pricing.promotionStart) && filled(pricing.promotionEnd);
}

function sectionCard(options: {
  title: string;
  owner: string;
  complete: boolean;
  pkg: PackageRecord | null | undefined;
  started?: boolean;
}): ReadinessSectionCard {
  const started = options.started ?? options.complete;
  return {
    title: options.title,
    owner: options.owner,
    lastEdited: lastEditedCopy(options.pkg, started),
    status: options.complete ? "complete" : "warning",
  };
}

function imagesSignOffBadge(images: ImageReadiness): {
  badge: string;
  badgeStyle: ReadinessSignOffItem["badgeStyle"];
} {
  if (images.complete) {
    return { badge: "Ready", badgeStyle: "ready" };
  }
  if (images.missingHeroes.length > 0) {
    return { badge: "Needs hero images", badgeStyle: "needs" };
  }
  return { badge: "Needs image alt text", badgeStyle: "needs" };
}

export function getPackageReadiness(
  pkg: PackageRecord | null | undefined
): PackageReadiness {
  const images = getImageReadiness(pkg?.media_frontend);
  const pricing = getPricingReadiness(pkg?.pricing);
  const pricingComplete = pricing.complete;
  const seoComplete = isSeoComplete(pkg?.seo);
  const supplierContactsComplete = isSupplierContactsComplete(pkg?.supplier_source);
  const supplierSectionComplete = isSupplierSectionComplete(pkg?.supplier_source);
  const basicsComplete = isBasicsComplete(pkg?.package_basics);
  const itineraryComplete = isItineraryComplete(pkg?.itinerary);
  const hotelsComplete = isHotelsComplete(pkg?.hotels);
  const inclusionsComplete = isInclusionsComplete(pkg?.inclusions);
  const bookingComplete = isBookingPolicyComplete(pkg);
  const consultantComplete = isConsultantViewComplete(pkg);
  const quoteComplete = isQuoteToolComplete(pkg);
  const faqsComplete = isFaqsComplete(pkg);
  const salesComplete = isSalesAssetsComplete(pkg?.sales_ads_assets);
  const promotionComplete = isPromotionComplete(pkg?.pricing);

  const supplierMissing: string[] = [];
  const supplier = normalizeSupplierFormValues(pkg?.supplier_source);
  if (!filled(supplier.supplierName)) supplierMissing.push("supplier name");
  if (!supplier.supplierEmails.some((email) => filled(email))) {
    supplierMissing.push("contact email");
  }

  const healthChecks: ReadinessHealthCheck[] = [
    {
      title: "Images",
      description: images.description,
      status: images.complete ? "complete" : "warning",
    },
    {
      title: "Pricing",
      description: pricing.description,
      status: pricingComplete ? "complete" : "warning",
    },
    {
      title: "SEO",
      description: seoComplete
        ? "SEO details are set"
        : "Add a meta title, description or focus keyword",
      status: seoComplete ? "complete" : "warning",
    },
    {
      title: "Supplier contacts",
      description: supplierContactsComplete
        ? "Supplier name and contact emails recorded"
        : `Missing ${supplierMissing.join(" and ")}`,
      status: supplierContactsComplete ? "complete" : "warning",
    },
  ];

  const sectionCards: ReadinessSectionCard[] = [
    {
      title: "Permissions",
      description: "SEO approval limited to users with SEO access",
      status: "complete",
    },
    {
      title: "Promotion",
      description: promotionComplete
        ? pkg?.pricing?.showSlashedRate
          ? "Promo start and end dates are set"
          : "No slashed rate on this package"
        : "Slashed rates require promo start, end and approval",
      status: promotionComplete ? "complete" : "warning",
    },
    sectionCard({
      title: "Supplier Source",
      owner: "Product",
      complete: supplierSectionComplete,
      pkg,
      started: Boolean(pkg?.supplier_source),
    }),
    sectionCard({
      title: "Package Basics",
      owner: "Product",
      complete: basicsComplete,
      pkg,
      started: Boolean(pkg?.package_basics),
    }),
    sectionCard({
      title: "Media & Front-End",
      owner: "Product + Marketing",
      complete: isMediaSectionComplete(pkg?.media_frontend),
      pkg,
      started: Boolean(pkg?.media_frontend),
    }),
    sectionCard({
      title: "Pricing",
      owner: "Product + Finance",
      complete: pricingComplete,
      pkg,
      started: Boolean(pkg?.pricing),
    }),
    sectionCard({
      title: "Itinerary",
      owner: "Product",
      complete: itineraryComplete,
      pkg,
      started: Boolean(pkg?.itinerary),
    }),
    sectionCard({
      title: "Hotels",
      owner: "Product + Ops",
      complete: hotelsComplete,
      pkg,
      started: Boolean(pkg?.hotels?.length),
    }),
    sectionCard({
      title: "Inclusions",
      owner: "Product",
      complete: inclusionsComplete,
      pkg,
      started: Boolean(pkg?.inclusions),
    }),
    sectionCard({
      title: "Booking Policy",
      owner: "Ops + Finance",
      complete: bookingComplete,
      pkg,
      started: Boolean(pkg?.booking_policy),
    }),
    sectionCard({
      title: "Consultant View",
      owner: "Sales Lead",
      complete: consultantComplete,
      pkg,
      started: Boolean(pkg?.consultant_view),
    }),
    sectionCard({
      title: "Supplier Quote Tool",
      owner: "Consultants",
      complete: quoteComplete,
      pkg,
      started: Boolean(pkg?.supplier_quote_tool),
    }),
    sectionCard({
      title: "Front-End FAQs",
      owner: "Product + SEO",
      complete: faqsComplete,
      pkg,
      started: Boolean(pkg?.frontend_faqs?.length),
    }),
    sectionCard({
      title: "Sales & Ads Assets",
      owner: "Marketing + Sales",
      complete: salesComplete,
      pkg,
      started: Boolean(pkg?.sales_ads_assets),
    }),
    sectionCard({
      title: "SEO",
      owner: "SEO Team",
      complete: seoComplete,
      pkg,
      started: Boolean(pkg?.seo),
    }),
  ];

  const completeCount = sectionCards.filter((card) => card.status === "complete").length;
  const readinessPercent =
    sectionCards.length === 0
      ? 0
      : Math.round((completeCount / sectionCards.length) * 100);

  const mediaBadge = imagesSignOffBadge(images);
  const seoStatus = pkg?.seo?.seoStatus?.trim().toLowerCase() ?? "";
  const seoApproved = seoStatus === "approved" || seoStatus === "locked";
  const published = pkg?.status === "published" || filled(pkg?.review_publish?.publishedAt);
  const keyChecksReady =
    images.complete && pricingComplete && seoComplete && supplierContactsComplete;

  const signOffTrail: ReadinessSignOffItem[] = [
    {
      stage: "Supplier Source",
      responsible: "Product",
      lastAction: lastActionCopy(pkg, Boolean(pkg?.supplier_source)),
      badge: supplierSectionComplete ? "Ready" : "Needs supplier details",
      badgeStyle: supplierSectionComplete ? "ready" : "needs",
    },
    {
      stage: "Media & Front-End",
      responsible: "Product + Marketing",
      lastAction: lastActionCopy(pkg, Boolean(pkg?.media_frontend)),
      badge: mediaBadge.badge,
      badgeStyle: mediaBadge.badgeStyle,
    },
    {
      stage: "SEO",
      responsible: "SEO Team",
      lastAction: seoComplete
        ? lastActionCopy(pkg, true)
        : pkg?.seo
          ? "Not reviewed"
          : "Not started",
      badge: seoApproved ? "Ready" : seoComplete ? "Draft" : "Needs meta",
      badgeStyle: seoApproved ? "ready" : seoComplete ? "draft" : "needs",
    },
    {
      stage: "Final Approval",
      responsible: "Admin",
      lastAction: published ? `Published${pkg?.updated_by ? ` by ${editorLabel(pkg)}` : ""}` : "Pending",
      badge: published ? "Ready" : keyChecksReady ? "Pending" : "Blocked",
      badgeStyle: published ? "ready" : keyChecksReady ? "needs" : "blocked",
    },
  ];

  return {
    healthChecks,
    sectionCards,
    readinessPercent,
    signOffTrail,
  };
}
