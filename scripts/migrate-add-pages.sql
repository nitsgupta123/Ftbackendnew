-- Page Management module — CMS pages
-- Idempotent: safe to run multiple times

USE fz;

CREATE TABLE IF NOT EXISTS cms_pages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  content LONGTEXT NULL,
  featured_image_path VARCHAR(512) NULL,
  page_type VARCHAR(64) NULL COMMENT 'e.g. about, contact, legal, landing',
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  show_in_nav TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  published_at TIMESTAMP NULL,
  seo_meta_title VARCHAR(255) NULL,
  seo_meta_description TEXT NULL,
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cms_pages_slug (slug),
  KEY idx_cms_pages_status (status),
  KEY idx_cms_pages_published_at (published_at),
  KEY idx_cms_pages_page_type (page_type),
  KEY idx_cms_pages_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
