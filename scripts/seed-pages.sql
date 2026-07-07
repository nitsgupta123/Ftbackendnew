-- Sample CMS pages (idempotent inserts)
USE fz;

INSERT INTO cms_pages (
  title, slug, excerpt, content, page_type, status, show_in_nav, display_order,
  published_at, seo_meta_title, seo_meta_description, created_by, updated_by
)
SELECT * FROM (
  SELECT
    'About Us' AS title,
    'about-us' AS slug,
    'Learn about Fayyaz Travels and our mission to deliver exceptional travel experiences.' AS excerpt,
    '<p>Welcome to Fayyaz Travels. We are passionate about creating memorable journeys for our customers.</p>' AS content,
    'about' AS page_type,
    'published' AS status,
    1 AS show_in_nav,
    10 AS display_order,
    NOW() AS published_at,
    'About Us | Fayyaz Travels' AS seo_meta_title,
    'Discover the story behind Fayyaz Travels and our commitment to quality travel services.' AS seo_meta_description,
    'system' AS created_by,
    'system' AS updated_by
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM cms_pages WHERE slug = 'about-us');

INSERT INTO cms_pages (
  title, slug, excerpt, content, page_type, status, show_in_nav, display_order,
  published_at, seo_meta_title, seo_meta_description, created_by, updated_by
)
SELECT * FROM (
  SELECT
    'Contact Us' AS title,
    'contact-us' AS slug,
    'Get in touch with our travel consultants for bookings and enquiries.' AS excerpt,
    '<p>Reach out to us via phone, email, or visit our office. We are here to help plan your next trip.</p>' AS content,
    'contact' AS page_type,
    'published' AS status,
    1 AS show_in_nav,
    20 AS display_order,
    NOW() AS published_at,
    'Contact Us | Fayyaz Travels' AS seo_meta_title,
    'Contact Fayyaz Travels for travel bookings, package enquiries, and customer support.' AS seo_meta_description,
    'system' AS created_by,
    'system' AS updated_by
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM cms_pages WHERE slug = 'contact-us');
