-- Seed default package categories (idempotent via INSERT IGNORE)
USE fz;

INSERT IGNORE INTO package_categories (name, slug, description, display_order, status, is_featured, created_by, updated_by)
VALUES
  ('Domestic Tours', 'domestic-tours', 'Explore destinations within your home country.', 1, 'active', 0, 'System', 'System'),
  ('International Tours', 'international-tours', 'Discover world-class destinations abroad.', 2, 'active', 1, 'System', 'System'),
  ('Honeymoon Packages', 'honeymoon-packages', 'Romantic getaways for newlyweds.', 3, 'active', 1, 'System', 'System'),
  ('Family Holidays', 'family-holidays', 'Fun-filled trips for the whole family.', 4, 'active', 0, 'System', 'System'),
  ('Adventure Tours', 'adventure-tours', 'Thrilling experiences for adventure seekers.', 5, 'active', 0, 'System', 'System'),
  ('Luxury Holidays', 'luxury-holidays', 'Premium travel with five-star comfort.', 6, 'active', 1, 'System', 'System'),
  ('Group Tours', 'group-tours', 'Organized tours for groups of travellers.', 7, 'active', 0, 'System', 'System'),
  ('Corporate Tours', 'corporate-tours', 'Business travel and incentive programmes.', 8, 'active', 0, 'System', 'System'),
  ('Weekend Getaways', 'weekend-getaways', 'Short breaks for a quick escape.', 9, 'active', 0, 'System', 'System'),
  ('Pilgrimage Tours', 'pilgrimage-tours', 'Spiritual journeys to sacred destinations.', 10, 'active', 0, 'System', 'System'),
  ('Wildlife Safaris', 'wildlife-safaris', 'Safari adventures and wildlife encounters.', 11, 'active', 0, 'System', 'System'),
  ('Beach Holidays', 'beach-holidays', 'Sun, sand, and sea vacations.', 12, 'active', 1, 'System', 'System'),
  ('Cruise Packages', 'cruise-packages', 'Ocean and river cruise experiences.', 13, 'active', 0, 'System', 'System');
