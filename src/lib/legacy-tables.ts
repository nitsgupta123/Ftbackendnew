/**
 * Allowed data tables in fayyaz_new (legacy site schema).
 * Application code must not CREATE tables at runtime.
 */
export const LEGACY_TABLES = {
  users: "tbl_user",
  roles: "tbl_roles",
  packages: "tbl_packages",
  packagePrices: "tbl_price",
  packageItinerary: "tbl_itinerary",
  categories: "tbl_categories",
  posts: "tbl_post",
  postDetails: "tbl_post_details",
  settings: "tbl_settings",
  partners: "tbl_partners",
  suppliers: "suppliers",
  promotions: "tbl_promotion",
  messages: "tbl_message",
  destinations: "tbl_destinations",
  cities: "tbl_citys",
  testimonials: "tbl_testimonials",
  products: "tbl_products",
  smtp: "tbl_smtp",
} as const;

/** @deprecated use LEGACY_TABLES */
export const LEGACY = LEGACY_TABLES;

/** setting_type values stored in tbl_settings for panel JSON blobs */
export const SETTINGS_BLOB = {
  adminPanel: "admin_panel",
  pricingRule: "pricing_rule",
  packageTemplate: "package_template",
  userPermissions: "user_permissions",
  rolePermissions: "role_permissions",
  packageCategories: "package_categories_map",
  promotion: "promotion",
  accessControl: "access_control",
  supplierCatalog: "supplier_catalog",
  packageWizard: "package_wizard",
  supplierExtras: "supplier_extras",
  postExtras: "post_extras",
  categoryExtras: "category_extras",
} as const;
