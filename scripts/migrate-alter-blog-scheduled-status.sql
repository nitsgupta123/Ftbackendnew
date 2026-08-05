-- Add scheduled status for upcoming blog posts

USE fz;

ALTER TABLE blog_posts
  MODIFY COLUMN status ENUM('draft', 'scheduled', 'published', 'archived')
  NOT NULL DEFAULT 'draft';
