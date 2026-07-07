-- Pricing Rules module — global markup, exchange rate, finance approval
-- Idempotent: safe to run multiple times

USE fz;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT 'Rule display name',
  description TEXT NULL,
  scope_type ENUM('global', 'destination', 'currency', 'supplier_country') NOT NULL DEFAULT 'global',
  scope_value VARCHAR(255) NULL COMMENT 'Destination, currency code, or country when scoped',
  supplier_currency VARCHAR(10) NULL COMMENT 'Source currency e.g. ZAR',
  display_currency VARCHAR(10) NULL COMMENT 'Selling currency e.g. SGD',
  exchange_rate_type ENUM('manual', 'auto', 'fixed') NOT NULL DEFAULT 'manual',
  default_exchange_rate DECIMAL(18, 6) NULL,
  rate_lock_days INT UNSIGNED NULL COMMENT 'Days to lock exchange rate',
  markup_type ENUM('percentage', 'fixed', 'tiered') NOT NULL DEFAULT 'percentage',
  default_markup_value VARCHAR(64) NULL COMMENT 'e.g. 18% or fixed amount',
  tiered_markup_json JSON NULL COMMENT 'Tiered markup bands when markup_type = tiered',
  minimum_margin_percent DECIMAL(5, 2) NULL COMMENT 'Alert threshold for low margin',
  finance_approval_threshold DECIMAL(5, 2) NULL COMMENT 'Margin % below which finance must approve',
  requires_finance_approval TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pricing_rules_name (name),
  KEY idx_pricing_rules_status (status),
  KEY idx_pricing_rules_scope (scope_type, scope_value),
  KEY idx_pricing_rules_is_default (is_default),
  KEY idx_pricing_rules_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
