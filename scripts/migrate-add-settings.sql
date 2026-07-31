CREATE DATABASE IF NOT EXISTS fz
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fz;

CREATE TABLE IF NOT EXISTS admin_settings (
  id TINYINT UNSIGNED NOT NULL,
  site_name VARCHAR(150) NOT NULL DEFAULT 'Fayyaz Travels Admin',
  company_name VARCHAR(150) NOT NULL DEFAULT 'Fayyaz Travels',
  support_email VARCHAR(190) NOT NULL DEFAULT '',
  support_phone VARCHAR(60) NOT NULL DEFAULT '',
  office_address VARCHAR(300) NOT NULL DEFAULT '',
  timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata',
  homepage_title VARCHAR(190) NOT NULL DEFAULT 'Welcome to Fayyaz Travels',
  homepage_description VARCHAR(600) NOT NULL DEFAULT '',
  maintenance_mode TINYINT(1) NOT NULL DEFAULT 0,
  quote_cc_emails VARCHAR(1000) NOT NULL DEFAULT '',
  quote_bcc_emails VARCHAR(1000) NOT NULL DEFAULT '',
  updated_by VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_settings (
  id,
  site_name,
  company_name,
  timezone
)
VALUES (
  1,
  'Fayyaz Travels Admin',
  'Fayyaz Travels',
  'Asia/Kolkata'
)
ON DUPLICATE KEY UPDATE id = id;
