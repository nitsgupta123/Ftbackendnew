-- Fayyaz Travels Admin — add_package wizard table linked to legacy tbl_packages
-- Database: fz

CREATE DATABASE IF NOT EXISTS fz
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fz;

DROP TABLE IF EXISTS add_package;

CREATE TABLE add_package (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  package_id INT NOT NULL COMMENT 'FK -> tbl_packages.id',

  -- Workflow
  status ENUM('draft', 'pending_review', 'published', 'archived', 'deleted') NOT NULL DEFAULT 'draft',
  current_step TINYINT UNSIGNED NOT NULL DEFAULT 1,

  -- 14 package module columns (NULL = incomplete, JSON = module reference / saved data)
  supplier_source JSON NULL COMMENT 'Step 1: Supplier Source',
  package_basics JSON NULL COMMENT 'Step 2: Package Basics',
  media_frontend JSON NULL COMMENT 'Step 3: Media & Front-End',
  pricing JSON NULL COMMENT 'Step 4: Pricing',
  itinerary JSON NULL COMMENT 'Step 5: Itinerary',
  hotels JSON NULL COMMENT 'Step 6: Hotels',
  inclusions JSON NULL COMMENT 'Step 7: Inclusions',
  booking_policy JSON NULL COMMENT 'Step 8: Booking Policy',
  consultant_view JSON NULL COMMENT 'Step 9: Consultant View',
  supplier_quote_tool JSON NULL COMMENT 'Step 10: Supplier Quote Tool',
  frontend_faqs JSON NULL COMMENT 'Step 11: Front-End FAQs',
  sales_ads_assets JSON NULL COMMENT 'Step 12: Sales & Ads Assets',
  seo JSON NULL COMMENT 'Step 13: SEO',
  review_publish JSON NULL COMMENT 'Step 14: Review & Publish',

  created_by VARCHAR(255) NULL COMMENT 'User who created the package',
  updated_by VARCHAR(255) NULL COMMENT 'User who last modified the package',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_add_package_package_id (package_id),
  KEY idx_add_package_status (status),
  KEY idx_add_package_current_step (current_step),
  KEY idx_add_package_created_at (created_at),
  KEY idx_add_package_created_by (created_by),
  KEY idx_add_package_updated_by (updated_by),
  CONSTRAINT fk_add_package_tbl_packages
    FOREIGN KEY (package_id) REFERENCES tbl_packages (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
