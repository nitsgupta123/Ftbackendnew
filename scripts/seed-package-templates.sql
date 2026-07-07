-- Seed default package templates (idempotent via INSERT IGNORE)
USE fz;

INSERT IGNORE INTO package_templates (
  name, slug, description, template_type, included_steps,
  package_basics, inclusions, booking_policy, consultant_view, frontend_faqs, seo,
  status, is_default, display_order, created_by, updated_by
) VALUES (
  'International Group Tour',
  'international-group-tour',
  'Full skeleton for multi-day international group departures with standard inclusions and policies.',
  'full',
  JSON_ARRAY(2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13),
  JSON_OBJECT(
    'packageTitle', '',
    'slug', '',
    'shortIntro', 'Join a guided group tour with fixed departures and curated experiences.',
    'packageMode', 'Group Tour',
    'tourType', 'International',
    'runs', 'Fixed Departures',
    'countriesCovered', '',
    'citiesOrRegions', '',
    'startingPoint', '',
    'endingPoint', '',
    'days', '7',
    'nights', '6',
    'categories', JSON_ARRAY(),
    'categoryIds', JSON_ARRAY(),
    'landingPages', JSON_ARRAY(),
    'domesticFlightsIncluded', false,
    'trainIncluded', false,
    'transfersIncluded', true,
    'isSeasonalPackage', false
  ),
  JSON_OBJECT(
    'inclusionsList', 'Return airport transfers\nDaily breakfast\nEnglish-speaking guide\nSightseeing as per itinerary\nHotel accommodation on twin sharing',
    'exclusionsList', 'International flights\nVisa fees\nPersonal expenses\nTravel insurance\nMeals not mentioned',
    'optionalTours', '',
    'internalNotes', 'Verify visa requirements per destination before publishing.'
  ),
  JSON_OBJECT(
    'bookingDeadline', '14 days before departure',
    'depositRequired', '30% at booking',
    'balanceDue', '21 days before departure',
    'cancellationPolicy', 'Standard tiered cancellation policy applies.',
    'childPolicy', 'Child rates apply for ages 2-11 sharing bed with parents.',
    'passportValidity', 'Minimum 6 months validity from return date required.'
  ),
  JSON_OBJECT(
    'sellingPoints', 'Fixed departures\nExperienced tour leader\nCurated sightseeing',
    'idealFor', 'First-time travellers, families, small groups',
    'consultantNotes', 'Highlight visa support and group leader experience.'
  ),
  JSON_ARRAY(
    JSON_OBJECT('question', 'What is included in the package?', 'answer', 'Accommodation, daily breakfast, transfers, and sightseeing as listed in the itinerary.', 'visibility', 'public'),
    JSON_OBJECT('question', 'Are flights included?', 'answer', 'International flights are not included unless stated otherwise.', 'visibility', 'public')
  ),
  JSON_OBJECT(
    'metaTitle', '',
    'metaDescription', '',
    'focusKeyword', 'international group tour',
    'indexStatus', 'index'
  ),
  'active', 1, 1, 'System', 'System'
);

INSERT IGNORE INTO package_templates (
  name, slug, description, template_type, included_steps,
  package_basics, inclusions, booking_policy, pricing,
  status, is_default, display_order, created_by, updated_by
) VALUES (
  'Domestic Weekend Getaway',
  'domestic-weekend-getaway',
  'Quick 2-3 day domestic break skeleton with basics, pricing structure, and booking policy.',
  'partial',
  JSON_ARRAY(2, 4, 7, 8),
  JSON_OBJECT(
    'packageTitle', '',
    'slug', '',
    'shortIntro', 'Short domestic escape for weekend travellers.',
    'packageMode', 'FIT',
    'tourType', 'Domestic',
    'runs', 'Daily',
    'days', '3',
    'nights', '2',
    'categories', JSON_ARRAY(),
    'categoryIds', JSON_ARRAY(),
    'landingPages', JSON_ARRAY(),
    'domesticFlightsIncluded', false,
    'trainIncluded', false,
    'transfersIncluded', true,
    'isSeasonalPackage', true
  ),
  JSON_OBJECT(
    'inclusionsList', '2 nights hotel stay\nDaily breakfast\nAirport/station transfers',
    'exclusionsList', 'Lunch and dinner\nEntry tickets\nPersonal expenses'
  ),
  JSON_OBJECT(
    'bookingDeadline', '3 days before travel',
    'depositRequired', 'Full payment at booking',
    'cancellationPolicy', 'Non-refundable within 72 hours of travel date.'
  ),
  JSON_OBJECT(
    'supplierCurrency', 'INR',
    'displayCurrency', 'INR',
    'pricingCalculation', 'per_person',
    'markupType', 'percentage',
    'markupValue', '15'
  ),
  'active', 0, 2, 'System', 'System'
);

INSERT IGNORE INTO package_templates (
  name, slug, description, template_type, included_steps,
  package_basics, media_frontend, inclusions, hotels, seo,
  status, is_default, display_order, created_by, updated_by
) VALUES (
  'Honeymoon Package',
  'honeymoon-package',
  'Romantic getaway skeleton with media placeholders, hotel structure, and SEO defaults.',
  'partial',
  JSON_ARRAY(2, 3, 6, 7, 8, 13),
  JSON_OBJECT(
    'packageTitle', '',
    'slug', '',
    'shortIntro', 'A romantic escape crafted for newlyweds.',
    'packageMode', 'FIT',
    'tourType', 'International',
    'runs', 'On Request',
    'days', '5',
    'nights', '4',
    'categories', JSON_ARRAY('Honeymoon Packages'),
    'categoryIds', JSON_ARRAY(),
    'landingPages', JSON_ARRAY(),
    'domesticFlightsIncluded', false,
    'trainIncluded', false,
    'transfersIncluded', true,
    'isSeasonalPackage', false
  ),
  JSON_OBJECT(
    'priceDisplayType', 'per_couple',
    'primaryCta', 'Plan Your Honeymoon',
    'secondaryCta', 'Talk to Expert',
    'frontEndSummary', 'Celebrate your new beginning with a curated romantic itinerary.',
    'whyChooseThisPackage', 'Private transfers, handpicked hotels, and special couple experiences.'
  ),
  JSON_OBJECT(
    'inclusionsList', 'Private airport transfers\n4 nights in a romantic hotel\nDaily breakfast\nOne special candlelight dinner\nCouple spa session',
    'exclusionsList', 'Flights\nVisa\nPersonal expenses'
  ),
  JSON_ARRAY(
    JSON_OBJECT('hotelName', '', 'city', '', 'starRating', '4', 'roomType', 'Honeymoon Suite', 'mealPlan', 'Breakfast')
  ),
  JSON_OBJECT(
    'focusKeyword', 'honeymoon package',
    'indexStatus', 'index'
  ),
  'active', 0, 3, 'System', 'System'
);

INSERT IGNORE INTO package_templates (
  name, slug, description, template_type, included_steps,
  supplier_source, package_basics, pricing, itinerary, inclusions,
  status, is_default, display_order, created_by, updated_by
) VALUES (
  'Luxury FIT Package',
  'luxury-fit-package',
  'Premium FIT skeleton with supplier defaults, pricing tiers, and day-by-day itinerary structure.',
  'full',
  JSON_ARRAY(1, 2, 4, 5, 7, 8, 9),
  JSON_OBJECT(
    'supplierName', '',
    'supplierPackageName', '',
    'supplierCountry', '',
    'supplierCurrency', 'USD',
    'paymentTerms', '50% advance, balance 30 days before travel',
    'cancellationTerms', 'As per supplier contract'
  ),
  JSON_OBJECT(
    'packageTitle', '',
    'slug', '',
    'shortIntro', 'Tailor-made luxury experience with premium accommodations.',
    'packageMode', 'FIT',
    'tourType', 'International',
    'runs', 'On Request',
    'days', '10',
    'nights', '9',
    'categories', JSON_ARRAY('Luxury Holidays'),
    'categoryIds', JSON_ARRAY(),
    'landingPages', JSON_ARRAY(),
    'domesticFlightsIncluded', false,
    'trainIncluded', false,
    'transfersIncluded', true,
    'isSeasonalPackage', false
  ),
  JSON_OBJECT(
    'supplierCurrency', 'USD',
    'displayCurrency', 'USD',
    'pricingCalculation', 'per_person',
    'markupType', 'percentage',
    'markupValue', '20',
    'hotelCategory', '5 Star',
    'defaultRoomBasis', 'Bed & Breakfast'
  ),
  JSON_OBJECT(
    'days', JSON_ARRAY(
      JSON_OBJECT('dayNumber', 1, 'title', 'Arrival', 'city', '', 'description', 'Arrive and transfer to hotel.', 'breakfast', false, 'lunch', false, 'dinner', false),
      JSON_OBJECT('dayNumber', 2, 'title', 'City Exploration', 'city', '', 'description', 'Full day guided city tour.', 'breakfast', true, 'lunch', false, 'dinner', false)
    )
  ),
  JSON_OBJECT(
    'inclusionsList', 'Private luxury transfers\n5-star accommodation\nDaily breakfast\nDedicated tour manager\nPriority support',
    'exclusionsList', 'International flights\nVisa\nTips and gratuities'
  ),
  'active', 0, 4, 'System', 'System'
);
