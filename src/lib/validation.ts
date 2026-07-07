import { z } from "zod";

export const supplierFormSchema = z.object({
  supplierName: z.string().min(1, "Supplier name is required"),
  supplierPackageName: z.string().min(1, "Supplier package name is required"),
  supplierCountry: z.string().optional(),
  supplierCurrency: z.string().optional(),
  contactPerson: z.string().optional(),
  supplierEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  supplierWhatsapp: z.string().optional(),
  supplierQuotedNetPrice: z.string().optional(),
  validityFrom: z.string().optional(),
  validityTo: z.string().optional(),
  supplierBookingDeadline: z.string().optional(),
  paymentTerms: z.string().optional(),
  cancellationTerms: z.string().optional(),
  internalSupplierNotes: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export const packageBasicsSchema = z.object({
  packageTitle: z.string().min(1, "Package title is required"),
  slug: z.string().min(1, "Slug is required"),
  shortIntro: z.string().optional(),
  packageMode: z.string().min(1, "Package mode is required"),
  tourType: z.string().min(1, "Tour type is required"),
  runs: z.string().min(1, "Runs is required"),
  countriesCovered: z.string().optional(),
  citiesOrRegions: z.string().optional(),
  startingPoint: z.string().optional(),
  endingPoint: z.string().optional(),
  days: z.string().optional(),
  nights: z.string().optional(),
  categories: z.array(z.string()).optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  landingPages: z.array(z.string()).optional(),
  domesticFlightsIncluded: z.boolean(),
  trainIncluded: z.boolean(),
  transfersIncluded: z.boolean(),
  isSeasonalPackage: z.boolean(),
});

export type PackageBasicsValues = z.infer<typeof packageBasicsSchema>;

export const categoryStatusSchema = z.enum(["active", "inactive"]);

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z
    .string()
    .transform((s) => (s.trim() === "" ? undefined : s))
    .pipe(
      z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only")
        .optional()
    )
    .optional(),
  description: z.string().optional().nullable(),
  icon_path: z.string().optional().nullable(),
  image_path: z.string().optional().nullable(),
  display_order: z.number().int().min(0, "Display order must be a non-negative number").optional(),
  status: categoryStatusSchema.optional(),
  is_featured: z.boolean().optional(),
  seo_meta_title: z.string().optional().nullable(),
  seo_meta_description: z.string().optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;
export type UpdateCategoryFormValues = z.infer<typeof updateCategorySchema>;

const tieredMarkupBandSchema = z.object({
  min_pax: z.number().int().min(0).optional(),
  max_pax: z.number().int().min(0).optional(),
  markup_value: z.string().min(1, "Markup value is required"),
});

export const pricingRuleStatusSchema = z.enum(["active", "inactive"]);
export const pricingRuleScopeSchema = z.enum([
  "global",
  "destination",
  "currency",
  "supplier_country",
]);
export const exchangeRateTypeSchema = z.enum(["manual", "auto", "fixed"]);
export const markupTypeSchema = z.enum(["percentage", "fixed", "tiered"]);

export const createPricingRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional().nullable(),
  scope_type: pricingRuleScopeSchema.optional(),
  scope_value: z.string().optional().nullable(),
  supplier_currency: z.string().optional().nullable(),
  display_currency: z.string().optional().nullable(),
  exchange_rate_type: exchangeRateTypeSchema.optional(),
  default_exchange_rate: z.number().min(0).optional().nullable(),
  rate_lock_days: z.number().int().min(0).optional().nullable(),
  markup_type: markupTypeSchema.optional(),
  default_markup_value: z.string().optional().nullable(),
  tiered_markup_json: z.array(tieredMarkupBandSchema).optional().nullable(),
  minimum_margin_percent: z.number().min(0).max(100).optional().nullable(),
  finance_approval_threshold: z.number().min(0).max(100).optional().nullable(),
  requires_finance_approval: z.boolean().optional(),
  status: pricingRuleStatusSchema.optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

export const updatePricingRuleSchema = createPricingRuleSchema.partial();

export type CreatePricingRuleFormValues = z.infer<typeof createPricingRuleSchema>;
export type UpdatePricingRuleFormValues = z.infer<typeof updatePricingRuleSchema>;

export const templateStatusSchema = z.enum(["active", "inactive"]);
export const templateTypeSchema = z.enum(["full", "partial"]);

export const createPackageTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  slug: z
    .string()
    .transform((s) => (s.trim() === "" ? undefined : s))
    .pipe(
      z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only")
        .optional()
    )
    .optional(),
  description: z.string().optional().nullable(),
  template_type: templateTypeSchema.optional(),
  included_steps: z
    .array(z.number().int().min(1).max(13))
    .min(1, "Select at least one wizard step")
    .optional(),
  status: templateStatusSchema.optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

export const updatePackageTemplateSchema = createPackageTemplateSchema.partial();

export type CreatePackageTemplateFormValues = z.infer<typeof createPackageTemplateSchema>;
export type UpdatePackageTemplateFormValues = z.infer<typeof updatePackageTemplateSchema>;

const slugFieldSchema = z
  .string()
  .transform((s) => (s.trim() === "" ? undefined : s))
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only")
      .optional()
  )
  .optional();

export const blogPostStatusSchema = z.enum(["draft", "published", "archived"]);

export const createBlogPostSchema = z.object({
  title: z.string().min(1, "Blog title is required"),
  slug: slugFieldSchema,
  excerpt: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  featured_image_path: z.string().optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  author_name: z.string().optional().nullable(),
  status: blogPostStatusSchema.optional(),
  is_featured: z.boolean().optional(),
  published_at: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  seo_meta_title: z.string().optional().nullable(),
  seo_meta_description: z.string().optional().nullable(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export type CreateBlogPostFormValues = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostFormValues = z.infer<typeof updateBlogPostSchema>;

export const blogCategoryStatusSchema = z.enum(["active", "inactive"]);

export const createBlogCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: slugFieldSchema,
  description: z.string().optional().nullable(),
  display_order: z.number().int().min(0, "Display order must be a non-negative number").optional(),
  status: blogCategoryStatusSchema.optional(),
  seo_meta_title: z.string().optional().nullable(),
  seo_meta_description: z.string().optional().nullable(),
});

export const updateBlogCategorySchema = createBlogCategorySchema.partial();

export type CreateBlogCategoryFormValues = z.infer<typeof createBlogCategorySchema>;
export type UpdateBlogCategoryFormValues = z.infer<typeof updateBlogCategorySchema>;

export const pageStatusSchema = z.enum(["draft", "published", "archived"]);

export const createPageSchema = z.object({
  title: z.string().min(1, "Page title is required"),
  slug: slugFieldSchema,
  excerpt: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  featured_image_path: z.string().optional().nullable(),
  page_type: z.string().optional().nullable(),
  status: pageStatusSchema.optional(),
  show_in_nav: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
  published_at: z.string().optional().nullable(),
  seo_meta_title: z.string().optional().nullable(),
  seo_meta_description: z.string().optional().nullable(),
});

export const updatePageSchema = createPageSchema.partial();

export type CreatePageFormValues = z.infer<typeof createPageSchema>;
export type UpdatePageFormValues = z.infer<typeof updatePageSchema>;