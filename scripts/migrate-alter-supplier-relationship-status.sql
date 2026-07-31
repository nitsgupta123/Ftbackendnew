-- Expand supplier relationship_status ENUM to match product badges
-- Idempotent for MySQL 8+: re-applying with the same ENUM definition is safe

USE fz;

ALTER TABLE suppliers
  MODIFY COLUMN relationship_status ENUM(
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
  ) NOT NULL DEFAULT 'new';
