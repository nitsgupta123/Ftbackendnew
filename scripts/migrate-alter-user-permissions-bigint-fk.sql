-- Align user_permissions.user_id with admin_users.id (BIGINT) and add FK.

USE fz;

-- Drop legacy FK if a previous partial migration added one under another name.
SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_permissions'
    AND CONSTRAINT_NAME = 'fk_user_permissions_admin_user'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @drop_fk_sql := IF(
  @fk_exists > 0,
  'ALTER TABLE user_permissions DROP FOREIGN KEY fk_user_permissions_admin_user',
  'SELECT 1'
);
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE user_permissions
  MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL;

-- Remove orphan overrides that would block the FK.
DELETE up
FROM user_permissions up
LEFT JOIN admin_users au ON au.id = up.user_id
WHERE au.id IS NULL;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_permissions'
    AND CONSTRAINT_NAME = 'fk_user_permissions_admin_user'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_fk_sql := IF(
  @fk_exists = 0,
  'ALTER TABLE user_permissions
     ADD CONSTRAINT fk_user_permissions_admin_user
     FOREIGN KEY (user_id) REFERENCES admin_users (id)
     ON DELETE CASCADE
     ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @add_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
