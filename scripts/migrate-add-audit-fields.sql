-- Add package audit metadata columns to add_package (idempotent for existing databases)
-- Run: node scripts/run-migrate-audit.mjs

USE fz;

SET @has_created_by := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'fz'
    AND TABLE_NAME = 'add_package'
    AND COLUMN_NAME = 'created_by'
);

SET @sql_created_by := IF(
  @has_created_by = 0,
  'ALTER TABLE add_package ADD COLUMN created_by VARCHAR(255) NULL COMMENT ''User who created the package'' AFTER review_publish',
  'SELECT ''created_by already exists'' AS message'
);
PREPARE stmt FROM @sql_created_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_updated_by := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'fz'
    AND TABLE_NAME = 'add_package'
    AND COLUMN_NAME = 'updated_by'
);

SET @sql_updated_by := IF(
  @has_updated_by = 0,
  'ALTER TABLE add_package ADD COLUMN updated_by VARCHAR(255) NULL COMMENT ''User who last modified the package'' AFTER created_by',
  'SELECT ''updated_by already exists'' AS message'
);
PREPARE stmt FROM @sql_updated_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_created_by := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'fz'
    AND TABLE_NAME = 'add_package'
    AND INDEX_NAME = 'idx_add_package_created_by'
);

SET @sql_idx_created_by := IF(
  @has_idx_created_by = 0,
  'CREATE INDEX idx_add_package_created_by ON add_package (created_by)',
  'SELECT ''idx_add_package_created_by already exists'' AS message'
);
PREPARE stmt FROM @sql_idx_created_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_updated_by := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'fz'
    AND TABLE_NAME = 'add_package'
    AND INDEX_NAME = 'idx_add_package_updated_by'
);

SET @sql_idx_updated_by := IF(
  @has_idx_updated_by = 0,
  'CREATE INDEX idx_add_package_updated_by ON add_package (updated_by)',
  'SELECT ''idx_add_package_updated_by already exists'' AS message'
);
PREPARE stmt FROM @sql_idx_updated_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
