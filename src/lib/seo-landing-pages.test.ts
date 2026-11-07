import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LANDING_PAGES,
  getLandingPageConfig,
  generateLandingPageMetadata,
  filterEventsForLandingPage,
  LOCATION_REGIONS,
  type LandingPageSlug,
} from './seo-landing-pages';
import type { CalendarEvent } from './calendar-query';

const mockEvents: CalendarEvent[] = [
  {
    id: 'evt-free-toddler',
    sourceId: 'src-1',
    source: { handle: 'bayarea_moms', name: 'Bay Area Moms' },
    rawPostUrl: 'https://instagram.com/p/1',
    title: 'Free Toddler Music in Golden Gate Park',
    startDate: '2026-11-14',
    endDate: null,
    startTime: '10:00',
    endTime: '11:00',
    location: 'San Francisco, CA',
    ageRange: '1-3 years',
    ageGroup: 'toddlers',
    category: 'music',
    cost: 'Free',
    isFree: true,
    registrationUrl: 'https://example.com/register',
    description: 'Free interactive music class for toddlers in SF',
  },
  {
    id: 'evt-paid-kids-art',
    sourceId: 'src-2',
    source: { handle: 'sj_art_kids', name: 'SJ Art Kids' },
    rawPostUrl: 'https://instagram.com/p/2',
    title: 'Kids Clay & Pottery Workshop',
    startDate: '2026-11-14',
    endDate: null,
    startTime: '14:00',
    endTime: '16:00',
    location: 'San Jose, CA',
    ageRange: '7-12 years',
    ageGroup: 'kids',
    category: 'arts',
    cost: '$25',
    isFree: false,
    registrationUrl: 'https://eventbrite.com/e/12345',
    description: 'Hands on clay making in South Bay',
  },
  {
    id: 'evt-free-indoor-peninsula',
    sourceId: 'src-3',
    source: { handle: 'peninsula_family', name: 'Peninsula Family' },
    rawPostUrl: 'https://instagram.com/p/3',
    title: 'Rainy Day Science Lab Discovery',
    startDate: '2026-11-15',
    endDate: null,
    startTime: '11:00',
    endTime: '13:00',
    location: 'San Mateo, CA',
    ageRange: '4-8 years',
    ageGroup: 'preschoolers',
    category: 'education',
    cost: 'Free',
    isFree: true,
    registrationUrl: null,
    description: 'Indoor hands-on STEM experiments for young kids',
  },
];

test('getLandingPageConfig returns correct configuration for known landing pages', () => {
  const freeConfig = getLandingPageConfig('free-this-weekend');
  assert.ok(freeConfig);
  assert.equal(freeConfig.slug, 'free-this-weekend');
  assert.equal(freeConfig.freeOnly, true);
  assert.ok(freeConfig.title.includes('Free Kids Activities'));

  const toddlerConfig = getLandingPageConfig('toddlers');
  assert.ok(toddlerConfig);
  assert.equal(toddlerConfig.slug, 'toddlers');
  assert.deepEqual(toddlerConfig.ageGroups, ['toddlers']);
  assert.ok(toddlerConfig.title.includes('Toddler'));

  const indoorConfig = getLandingPageConfig('indoor-activities');
  assert.ok(indoorConfig);
  assert.equal(indoorConfig.slug, 'indoor-activities');
  assert.deepEqual(indoorConfig.categories, ['arts', 'education', 'music']);
});

test('getLandingPageConfig returns undefined for invalid slugs', () => {
  const invalid = getLandingPageConfig('nonexistent-page' as LandingPageSlug);
  assert.equal(invalid, undefined);
});

test('generateLandingPageMetadata formats titles, descriptions, and canonical URLs', () => {
  const meta = generateLandingPageMetadata('free-this-weekend');
  assert.ok(meta.title.includes('Free Kids Activities'));
  assert.ok(meta.description.length > 50);
  assert.equal(meta.canonical, 'https://www.littledaysout.com/free-this-weekend');
  assert.ok(meta.openGraph);
  assert.equal(meta.openGraph.url, 'https://www.littledaysout.com/free-this-weekend');
});

test('filterEventsForLandingPage filters free-only events accurately', () => {
  const filtered = filterEventsForLandingPage(mockEvents, 'free-this-weekend');
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every((e) => e.isFree === true));
});

test('filterEventsForLandingPage filters toddler age group accurately', () => {
  const filtered = filterEventsForLandingPage(mockEvents, 'toddlers');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'evt-free-toddler');
});

test('filterEventsForLandingPage filters indoor categories accurately', () => {
  const filtered = filterEventsForLandingPage(mockEvents, 'indoor-activities');
  assert.equal(filtered.length, 3); // music, arts, education
});

test('filterEventsForLandingPage filters location regions accurately', () => {
  const sfEvents = filterEventsForLandingPage(mockEvents, 'location-san-francisco');
  assert.equal(sfEvents.length, 1);
  assert.equal(sfEvents[0].id, 'evt-free-toddler');

  const southBayEvents = filterEventsForLandingPage(mockEvents, 'location-south-bay');
  assert.equal(southBayEvents.length, 1);
  assert.equal(southBayEvents[0].id, 'evt-paid-kids-art');

  const peninsulaEvents = filterEventsForLandingPage(mockEvents, 'location-peninsula');
  assert.equal(peninsulaEvents.length, 1);
  assert.equal(peninsulaEvents[0].id, 'evt-free-indoor-peninsula');
});

test('LOCATION_REGIONS provides all Bay Area sub-regions with search keywords', () => {
  assert.ok(LOCATION_REGIONS['san-francisco']);
  assert.ok(LOCATION_REGIONS['south-bay']);
  assert.ok(LOCATION_REGIONS['peninsula']);
  assert.ok(LOCATION_REGIONS['east-bay']);

  assert.ok(LOCATION_REGIONS['south-bay'].keywords.includes('san jose'));
  assert.ok(LOCATION_REGIONS['peninsula'].keywords.includes('san mateo'));
  assert.ok(LOCATION_REGIONS['east-bay'].keywords.includes('oakland'));
});
