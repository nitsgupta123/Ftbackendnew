# Fayyaz Travels Admin Panel — Database Mapping Guide

**What this document covers:** Every admin panel section, which database table it uses, and which columns store what — in sidebar order.

**Database:** `fz` (plus legacy tables where noted)

**Total tables used:** 14 admin-owned + several (`tbl_packages`, `tbl_message`, etc.)

---

## 1. Dashboard (`/`)

**Purpose:** Overview metrics, enquiry chart, recent activity (read-only).

| Data | Table | Columns / notes |
|------|--------|-----------------|
| Packages count | `add_package` | `status`, `created_at` |
| Blogs count | `blog_posts` | `status`, `created_at` |
| Pages count | `cms_pages` | `status`, `created_at` / `published_at` |
| Enquiry chart | legacy `tbl_message` | `message_type`, `insert_date` |
| Extra metrics | legacy `tbl_destinations`, `tbl_testimonials`, `tbl_products` | status + dates |
| Package titles | `tbl_packages` | `p_name` (join on `package_id`) |

**Note:** No dedicated audit table. Activity labels use `created_by` / `updated_by` on content tables.

---

## 2. Settings → General (`/settings/general`)

**Purpose:** Site / company config + quote email CC/BCC.

**Table:** `admin_settings` (singleton row, `id = 1`)

| Column | Use |
|--------|-----|
| `site_name`, `company_name` | Branding |
| `support_email`, `support_phone`, `office_address` | Contact |
| `timezone` | Time zone |
| `homepage_title`, `homepage_description` | Homepage SEO/text |
| `maintenance_mode` | Site on/off |
| `quote_cc_emails`, `quote_bcc_emails` | Supplier quote email CC/BCC |
| `updated_by`, `updated_at` | Who changed last |

---

## 3. Settings → User Management (`/user-management`)

**Purpose:** Staff admin accounts.

**Table:** `admin_users`

| Column | Use |
|--------|-----|
| `email`, `password_hash` | Login |
| `full_name`, `role` | Name + role |
| `is_active` | Enable/disable |
| `last_login_at` | Last login |
| `created_at`, `updated_at` | Audit |

**Secondary table:** `user_permissions`

| Column | Use |
|--------|-----|
| `user_id` | Links to `admin_users.id` |
| `module_key` | Which module |
| `can_view` / `can_edit` / `can_delete` | Per-user permission overrides |

---

## 4. Settings → Role Management (`/settings/role-management`)

**Purpose:** Rename / manage role strings used by staff.

**Tables:** `role_permissions` + updates `admin_users.role`

| Column | Use |
|--------|-----|
| `role` | Role name |
| `module_key` | Which module |
| `can_view` / `can_edit` / `can_delete` | Permissions |
| `updated_at` | Last change |

---

## 5. Settings → Access Control (`/settings/roles`)

**Purpose:** Permission matrix by role × module.

**Table:** `role_permissions` (same columns as above)

**Effective access** = role permissions + optional `user_permissions` overrides.

Module catalog is defined in code (`permission-types.ts`), not in DB.

---

## 6. Blogs Management

**Routes:** `/blogs/all`, `/blogs/new`, `/blogs/drafts`, `/blogs/pending-review`, `/blogs/scheduled`, `/blogs/published`, `/blogs/categories`, `/blogs/edit/[id]`

**Main table:** `blog_posts`  
**Category table:** `blog_categories`

### `blog_posts` columns

| Column | Use |
|--------|-----|
| `title`, `slug`, `excerpt`, `content` | Post content |
| `featured_image_path` | Cover image |
| `category_id` | FK → `blog_categories.id` |
| `author_name` | Author |
| `status` | `draft` / `pending_review` / `scheduled` / `published` / `archived` |
| `is_featured`, `published_at` | Featured flag + publish date |
| `tags` (JSON) | Tags |
| `related_package_ids` (JSON) | Linked packages (`add_package.id` — soft link, not FK) |
| SEO fields | Meta title / description etc. |
| `created_by` / `updated_by` | Who edited |

### `blog_categories` columns

| Column | Use |
|--------|-----|
| `name`, `slug`, `description` | Category identity |
| `display_order`, `status` | Order + active/inactive |
| SEO fields | Category SEO |
| Audit fields | `created_by` / `updated_by`, timestamps |

---

## 7. Page Management (CMS)

**Routes:** `/pages/all`, `/pages/new`, `/pages/drafts`, `/pages/published`, `/pages/edit/[id]`

**Table:** `cms_pages`

| Column | Use |
|--------|-----|
| `title`, `slug`, `excerpt`, `content` | Page content |
| `featured_image_path` | Image |
| `page_type` | Page type |
| `status` | `draft` / `published` / `archived` |
| `show_in_nav`, `display_order` | Nav visibility + order |
| `published_at` | Publish date |
| SEO fields | Meta SEO |
| `created_by` / `updated_by` | Audit |

---

## 8. Packages

### 8.1 Package lists

**Routes:** `/packages`, `/packages/all`, `/packages/drafts`, `/packages/pending-review`, `/packages/archived`

**Tables:** `add_package` ⋈ `tbl_packages` (`ap.package_id = tp.id`)

#### `add_package` key columns

| Column | Use |
|--------|-----|
| `id` | Wizard package ID |
| `package_id` | FK → legacy `tbl_packages.id` |
| `status` | `draft` / `pending_review` / `published` / `archived` / `deleted` |
| `current_step` | Wizard progress (1–14) |
| 14 JSON step columns | See section 8.4 below |
| `created_by` / `updated_by` | Audit |
| `created_at` / `updated_at` | Timestamps |

#### `tbl_packages` key columns (legacy)

| Column | Use |
|--------|-----|
| `id`, `p_name`, `p_slug` | Package identity |
| `feature_img`, `desti_image`, `day_night` | Display fields |
| `is_publish`, `is_archive`, `status` | Publish state |
| Meta SEO fields | Synced from wizard SEO step |

### 8.2 Expiring rates (`/packages/expiring-rates`)

**Source:** `add_package.supplier_source` JSON → `validityTo` (next 30 days)  
**Titles from:** `tbl_packages`

### 8.3 Supplier quote requests (`/packages/supplier-quotes`)

**Source:** `add_package` where `supplier_quote_tool IS NOT NULL`  
Stores recipients, email body, last sent info, travel party, etc.

### 8.4 Add Package wizard — 14 steps (`/add-package`)

**Primary table:** `add_package` (+ stub/sync row in `tbl_packages`)

| Step | Title | JSON column | What is stored |
|------|-------|-------------|----------------|
| 1 | Supplier Source | `supplier_source` | Supplier name, package name, country, contact, emails, WhatsApp, quotation files, notes, `validityTo` |
| 2 | Package Basics | `package_basics` | Title/slug, intro/overview, tour type, countries/cities, days/nights, categoryIds, landing pages, seasonal info |
| 3 | Media & Front-End | `media_frontend` | Hero/card images, video, CTAs/WhatsApp, highlight images, banners, why-choose |
| 4 | Pricing | `pricing` | Pricing type; hotel categories → booking ranges / departure months; adult/child tiers; promotions; blackouts; markup/margins |
| 5 | Itinerary | `itinerary` | `days[]` — title, HTML description, meals, notes, highlights |
| 6 | Hotels | `hotels` | Hotel entries (name, city, stars, room, nights, policies, maps) |
| 7 | Inclusions | `inclusions` | Included / excluded / optional addons, local fees, flight/train/transfer flags |
| 8 | Booking Policy | `booking_policy` | Payment/deposit/balance, confirmation, cancellation rows, amendment/refund rules |
| 9 | Consultant View | `consultant_view` | Sell tips, objections, upsells, risks, visa/halal notes |
| 10 | Supplier Quote Tool | `supplier_quote_tool` | Request meta, party, hotel/rooming, email To/subject/body/signature, lastSent* |
| 11 | Front-End FAQs | `frontend_faqs` | FAQ array (`question`, `answer`, visibility) |
| 12 | Sales & Ads Assets | `sales_ads_assets` | Ad copy, WhatsApp share, sales card preview fields |
| 13 | SEO | `seo` | Meta title/description, keywords, related packages, index/review status |
| 14 | Review & Publish | `review_publish` | Reviewers, notes, publishedAt, submitAction |

**Related tables while saving packages:**

| Table | Role |
|-------|------|
| `package_category_map` | Links `add_package.id` ↔ `package_categories.id` |
| `package_categories` | Category master |
| `package_templates` | Apply template into step JSON |
| `pricing_rules` | Defaults/guidance for pricing UI |
| `suppliers` | Directory (Step 1 stores snapshot in JSON, not hard FK) |
| `admin_settings` | Quote CC/BCC emails for Step 10 send |
| Filesystem `uploads/` | Media files (no media DB table) |

### 8.5 Package Categories (`/packages/categories`)

**Tables:** `package_categories` + `package_category_map`

| Column | Use |
|--------|-----|
| `name`, `slug`, `description` | Category identity |
| `icon_path`, `image_path` | Visuals |
| `display_order`, `status`, `is_featured` | Order / status / featured |
| SEO + audit | Meta + who edited |

`package_category_map`: `package_id` (= `add_package.id`), `category_id`

### 8.6 Pricing Rules (`/packages/pricing-rules`)

**Table:** `pricing_rules`

| Column | Use |
|--------|-----|
| `name`, `description` | Rule identity |
| `scope_type` / `scope_value` | Where rule applies |
| Currency + `exchange_rate_type`, `default_exchange_rate`, `rate_lock_days` | FX settings |
| `markup_type`, `default_markup_value`, `tiered_markup_json` | Markup |
| Margin thresholds, `requires_finance_approval` | Control |
| `status`, `is_default`, `display_order` | Active / default / order |
| Audit fields | Who changed |

### 8.7 Package Templates (`/packages/templates`)

**Table:** `package_templates`  
*(Route exists; not always in sidebar `NAV_ITEMS`.)*

| Column | Use |
|--------|-----|
| `name`, `slug`, `description`, `template_type` | Template identity |
| `included_steps` (JSON) | Which step numbers are included |
| Same step JSON cols as wizard (1–13) | Prefill data (no `review_publish`) |
| `status`, `is_default`, `display_order`, `usage_count` | Status + usage |
| Audit fields | Who changed |

---

## 9. Suppliers (`/suppliers`)

**Purpose:** Vendor directory.

**Table:** `suppliers`

| Column | Use |
|--------|-----|
| `company_name`, `country`, `city_tour_area` | Identity / location |
| `status` | `active` / `inactive` / `do_not_use` |
| `relationship_status` | Relationship quality |
| `services_offered` | What they provide |
| `contact_person`, `email_address`, `contact_number`, `website` | Contact |
| `notes`, `problems_with_services`, `account_details` | Extra info |
| `tc_poc_fixed_departure`, `relationship_owner` | Ownership / POC |
| `date_added_updated` | Date |
| Audit timestamps | Created / updated |

**Note:** Package Step 1 stores a supplier snapshot inside `supplier_source` JSON — no hard foreign key.

---

## 10. Promotions (`/promotions`)

**Purpose:** UI for global promo offers linked to packages.

**Dedicated DB table:** none (sample / in-memory UI)

**Reads:** package list API (`add_package` / `tbl_packages`) for package picker  
**Package-level promos:** also live inside `add_package.pricing` JSON

---

## 11. Enquiry (`/enquiry`)

**Purpose:** Lead / enquiry inbox from legacy site forms.

**Table:** legacy `{LEGACY_DB}.tbl_message`

| Columns | Use |
|---------|-----|
| `first_name`, `last_name`, `email`, `phone`, `c_code`, `company` | Contact |
| `origin`, `destination`, dates, pax, `budget` | Trip details |
| `message`, `message_type`, `status` | Enquiry body + type |
| `page_url`, `insert_date` / `edit_date` | Source page + when received |

**Join:** `tbl_destinations` for origin/destination names.

---

## Quick summary — section → table

| # | Section | Main table(s) |
|---|---------|----------------|
| 1 | Dashboard | Multiple (read-only aggregates) |
| 2 | Settings → General | `admin_settings` |
| 3 | User Management | `admin_users` + `user_permissions` |
| 4 | Role Management | `role_permissions` (+ `admin_users.role`) |
| 5 | Access Control | `role_permissions` |
| 6 | Blogs | `blog_posts` + `blog_categories` |
| 7 | Pages (CMS) | `cms_pages` |
| 8 | Packages | `add_package` + `tbl_packages` |
| 8a | Package Categories | `package_categories` + `package_category_map` |
| 8b | Pricing Rules | `pricing_rules` |
| 8c | Templates | `package_templates` |
| 9 | Suppliers | `suppliers` |
| 10 | Promotions | No dedicated table |
| 11 | Enquiry | legacy `tbl_message` |

---

## All tables list (14 + legacy)

### Admin-owned (13)

1. `add_package`
2. `admin_users`
3. `admin_settings`
4. `role_permissions`
5. `user_permissions`
6. `suppliers`
7. `package_categories`
8. `package_category_map`
9. `package_templates`
10. `pricing_rules`
11. `cms_pages`
12. `blog_categories`
13. `blog_posts`

### Legacy / shared

14. `tbl_packages` (FK from `add_package`)  
Also read: `tbl_message`, `tbl_destinations`, `tbl_testimonials`, `tbl_products` (dashboard / enquiry)

---

## Cross-cutting notes

- **No dedicated audit/history table.** Pattern: `created_by` / `updated_by` VARCHAR on content tables.
- **Media:** files under `uploads/` via `/api/media` — no media DB table.
- **Package builder permissions:** module keys gate wizard steps; data still lives in `add_package` JSON columns.
