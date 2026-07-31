-- Add management CC/BCC fields for supplier quote emails
USE fz;

ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS quote_cc_emails VARCHAR(1000) NOT NULL DEFAULT '' AFTER maintenance_mode,
  ADD COLUMN IF NOT EXISTS quote_bcc_emails VARCHAR(1000) NOT NULL DEFAULT '' AFTER quote_cc_emails;
