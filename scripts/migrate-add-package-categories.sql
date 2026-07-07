-- Package Categories module — categories table + package mapping
-- Idempotent: safe to run multiple times

USE fz;

CREATE TABLE IF NOT EXISTS package_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT 'Display name',
  slug VARCHAR(255) NOT NULL COMMENT 'URL-friendly identifier',
  description TEXT NULL,
  icon_path VARCHAR(512) NULL COMMENT 'Icon image path or URL',
  image_path VARCHAR(512) NULL COMMENT 'Category hero/card image path or URL',
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  seo_meta_title VARCHAR(255) NULL,
  seo_meta_description TEXT NULL,
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_package_categories_name (name),
  UNIQUE KEY uq_package_categories_slug (slug),
  KEY idx_package_categories_status (status),
  KEY idx_package_categories_display_order (display_order),
  KEY idx_package_categories_is_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS package_category_map (
  package_id BIGINT UNSIGNED NOT NULL COMMENT 'FK -> add_package.id',
  category_id BIGINT UNSIGNED NOT NULL COMMENT 'FK -> package_categories.id',
  PRIMARY KEY (package_id, category_id),
  KEY idx_pcm_category_id (category_id),
  CONSTRAINT fk_pcm_package
    FOREIGN KEY (package_id) REFERENCES add_package (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_pcm_category
    FOREIGN KEY (category_id) REFERENCES package_categories (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
