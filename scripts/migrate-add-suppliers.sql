-- Supplier Management module — vendor/supplier directory
-- Source of truth: FT Vendor/Supplier Google Sheet columns
-- Idempotent: safe to run multiple times

USE fz;

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_name VARCHAR(255) NOT NULL,
  country VARCHAR(120) NOT NULL,
  city_tour_area VARCHAR(500) NULL COMMENT 'City / Tour Area coverage',
  status ENUM('active', 'inactive', 'do_not_use') NOT NULL DEFAULT 'active' COMMENT 'Active Status',
  relationship_status ENUM(
    'new',
    'under_review',
    'with_issues',
    'on_probation',
    'inactive',
    'blacklisted',
    'poor',
    'average',
    'good',
    'excellent'
  ) NOT NULL DEFAULT 'new',
  services_offered TEXT NULL COMMENT 'Comma-separated services e.g. FIT, Bespoked, Private',
  contact_person VARCHAR(500) NULL COMMENT 'Point of Contact Name',
  email_address TEXT NULL COMMENT 'One or more email addresses',
  contact_number TEXT NULL COMMENT 'Phone / WhatsApp numbers',
  website VARCHAR(500) NULL,
  notes TEXT NULL,
  problems_with_services TEXT NULL,
  account_details TEXT NULL COMMENT 'Account details / Local Currency',
  tc_poc_fixed_departure VARCHAR(255) NULL COMMENT 'TC POC for Fixed Departure Package',
  relationship_owner VARCHAR(255) NULL,
  date_added_updated DATE NULL COMMENT 'Date Added/Updated from sheet',
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_suppliers_status (status),
  KEY idx_suppliers_country (country),
  KEY idx_suppliers_relationship (relationship_status),
  KEY idx_suppliers_company (company_name),
  KEY idx_suppliers_owner (relationship_owner),
  KEY idx_suppliers_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
