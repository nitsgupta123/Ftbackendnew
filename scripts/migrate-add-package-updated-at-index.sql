-- Speed up package list ORDER BY updated_at (idempotent for existing databases)

USE fz;

SET @has_idx_updated_at := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'fz'
    AND TABLE_NAME = 'add_package'
    AND INDEX_NAME = 'idx_add_package_updated_at'
);

SET @sql_idx_updated_at := IF(
  @has_idx_updated_at = 0,
  'CREATE INDEX idx_add_package_updated_at ON add_package (updated_at)',
  'SELECT ''idx_add_package_updated_at already exists'' AS message'
);
PREPARE stmt FROM @sql_idx_updated_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
