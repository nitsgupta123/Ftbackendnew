-- Package Templates module — reusable package skeletons
-- Idempotent: safe to run multiple times

USE fz;

CREATE TABLE IF NOT EXISTS package_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT 'Template display name',
  slug VARCHAR(255) NOT NULL COMMENT 'URL-friendly identifier',
  description TEXT NULL,
  template_type ENUM('full', 'partial') NOT NULL DEFAULT 'partial',
  included_steps JSON NOT NULL COMMENT 'Array of wizard step numbers (1-13)',
  supplier_source JSON NULL,
  package_basics JSON NULL,
  media_frontend JSON NULL,
  pricing JSON NULL,
  itinerary JSON NULL,
  hotels JSON NULL,
  inclusions JSON NULL,
  booking_policy JSON NULL,
  consultant_view JSON NULL,
  supplier_quote_tool JSON NULL,
  frontend_faqs JSON NULL,
  sales_ads_assets JSON NULL,
  seo JSON NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  usage_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_package_templates_name (name),
  UNIQUE KEY uq_package_templates_slug (slug),
  KEY idx_package_templates_status (status),
  KEY idx_package_templates_type (template_type),
  KEY idx_package_templates_display_order (display_order),
  KEY idx_package_templates_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
