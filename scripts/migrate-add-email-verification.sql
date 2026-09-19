-- Email verification for admin_users
-- Unverified signups stay out of User Management until they confirm email.

USE fz;

ALTER TABLE admin_users
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active,
  ADD COLUMN email_verification_token VARCHAR(64) NULL AFTER email_verified,
  ADD COLUMN email_verification_expires_at TIMESTAMP NULL AFTER email_verification_token;

-- Existing accounts are treated as already verified.
UPDATE admin_users
SET email_verified = 1
WHERE email_verified = 0
  AND email_verification_token IS NULL;

CREATE INDEX idx_admin_users_email_verified ON admin_users (email_verified);
CREATE INDEX idx_admin_users_verification_token ON admin_users (email_verification_token);
