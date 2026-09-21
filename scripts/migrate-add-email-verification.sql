-- Email verification for legacy admin accounts in tbl_user.
-- Prefer: npm run db:migrate:email-verification (idempotent, uses DB_NAME).
-- Unverified signups stay out of User Management until they confirm email.

USE fayyaz_new;

ALTER TABLE tbl_user
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN email_verification_token VARCHAR(64) NULL,
  ADD COLUMN email_verification_expires_at DATETIME NULL;

UPDATE tbl_user
SET email_verified = 1
WHERE email_verified = 0
  AND email_verification_token IS NULL;

CREATE INDEX idx_tbl_user_email_verified ON tbl_user (email_verified);
CREATE INDEX idx_tbl_user_verification_token ON tbl_user (email_verification_token);
