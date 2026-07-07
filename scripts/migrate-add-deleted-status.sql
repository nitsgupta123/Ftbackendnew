-- Add soft-delete status to add_package (run once on existing databases)
USE fz;

ALTER TABLE add_package
  MODIFY COLUMN status ENUM('draft', 'pending_review', 'published', 'archived', 'deleted')
  NOT NULL DEFAULT 'draft';
