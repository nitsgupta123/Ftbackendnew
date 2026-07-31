-- Add "do_not_use" to suppliers Active Status ENUM

USE fz;

ALTER TABLE suppliers
  MODIFY COLUMN status ENUM('active', 'inactive', 'do_not_use')
  NOT NULL DEFAULT 'active'
  COMMENT 'Active Status';
