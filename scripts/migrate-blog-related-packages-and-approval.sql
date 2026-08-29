-- Blog related packages + approval workflow (pending_review)
-- Idempotent: safe to run multiple times

USE fz;

-- Expand status ENUM to include pending_review (approval workflow)
ALTER TABLE blog_posts
  MODIFY COLUMN status ENUM(
    'draft',
    'pending_review',
    'scheduled',
    'published',
    'archived'
  ) NOT NULL DEFAULT 'draft';

-- Related package IDs (JSON array of wizard package IDs), e.g. [12, 45, 78]
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'blog_posts'
    AND COLUMN_NAME = 'related_package_ids'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE blog_posts ADD COLUMN related_package_ids JSON NULL AFTER tags',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
