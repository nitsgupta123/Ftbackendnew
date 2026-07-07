USE fz;

INSERT IGNORE INTO blog_categories (name, slug, description, display_order, status, seo_meta_title, created_by, updated_by)
VALUES
  ('Travel Tips', 'travel-tips', 'Practical advice for planning memorable trips.', 1, 'active', 'Travel Tips | Fayyaz Travels', 'System', 'System'),
  ('Destinations', 'destinations', 'Guides and highlights from popular destinations.', 2, 'active', 'Destinations | Fayyaz Travels', 'System', 'System'),
  ('News & Updates', 'news-updates', 'Company news, offers, and travel industry updates.', 3, 'active', 'News & Updates | Fayyaz Travels', 'System', 'System');

INSERT IGNORE INTO blog_posts (
  title, slug, excerpt, content, featured_image_path, category_id, author_name,
  status, is_featured, published_at, tags, seo_meta_title, created_by, updated_by
)
SELECT
  'Top 10 Packing Tips for International Travel',
  'top-10-packing-tips-international-travel',
  'Pack smarter and travel lighter with these essential tips from our travel experts.',
  '<p>International travel is exciting, but packing can be overwhelming. Start with a versatile capsule wardrobe, roll clothes to save space, and always keep essentials in your carry-on.</p><p>Remember to check airline baggage limits and pack a universal power adapter for your devices.</p>',
  '/images/blogs/packing-tips.jpg',
  c.id,
  'Fayyaz Travels Team',
  'published',
  1,
  NOW(),
  JSON_ARRAY('travel tips', 'packing', 'international'),
  'Top 10 Packing Tips for International Travel',
  'System',
  'System'
FROM blog_categories c
WHERE c.slug = 'travel-tips'
LIMIT 1;

INSERT IGNORE INTO blog_posts (
  title, slug, excerpt, content, category_id, author_name,
  status, is_featured, tags, seo_meta_title, created_by, updated_by
)
SELECT
  'Discover Dubai: A First-Timer''s Guide',
  'discover-dubai-first-timers-guide',
  'Everything you need to know before your first visit to Dubai.',
  '<p>Dubai blends modern luxury with rich heritage. Visit the Burj Khalifa, explore the souks, and enjoy world-class dining along the Marina.</p>',
  c.id,
  'Fayyaz Travels Team',
  'draft',
  0,
  JSON_ARRAY('dubai', 'destinations', 'guide'),
  'Discover Dubai: A First-Timer''s Guide',
  'System',
  'System'
FROM blog_categories c
WHERE c.slug = 'destinations'
LIMIT 1;
