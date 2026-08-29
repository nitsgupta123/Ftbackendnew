-- Repair posts that were saved as "published" with a future publish time.
-- Those should be "scheduled" so they appear on Scheduled Posts and the cron can publish them.

UPDATE blog_posts
SET status = 'scheduled'
WHERE status = 'published'
  AND published_at IS NOT NULL
  AND published_at > NOW();
