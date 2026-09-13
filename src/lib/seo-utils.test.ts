import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE_URL,
  SITE_NAME,
  getSiteUrl,
  buildWebSiteJsonLd,
  buildEventJsonLd,
  type SeoEvent,
} from './seo-utils';

test('getSiteUrl returns canonical production domain https://www.littledaysout.com', () => {
  assert.equal(getSiteUrl(), 'https://www.littledaysout.com');
  assert.equal(SITE_URL, 'https://www.littledaysout.com');
  assert.equal(SITE_NAME, 'Little Days Out');
});

test('buildWebSiteJsonLd generates valid Schema.org WebSite structure', () => {
  const jsonLd = buildWebSiteJsonLd();

  assert.equal(jsonLd['@context'], 'https://schema.org');
  assert.equal(jsonLd['@type'], 'WebSite');
  assert.equal(jsonLd.name, 'Little Days Out');
  assert.equal(jsonLd.url, 'https://www.littledaysout.com');
  assert.match(jsonLd.description, /kids activities/i);
});

test('buildEventJsonLd generates valid Schema.org Event structure', () => {
  const sampleEvent: SeoEvent = {
    id: 'ev-123',
    title: 'Sunnyvale Storytime',
    description: 'Weekly library story hour for preschoolers.',
    startDate: '2026-10-01',
    endDate: '2026-10-01',
    startTime: '10:30',
    endTime: '11:30',
    location: 'Sunnyvale Public Library',
    cost: 'Free',
    isFree: true,
    registrationUrl: 'https://library.sunnyvale.ca.gov',
  };

  const jsonLd = buildEventJsonLd(sampleEvent);

  assert.equal(jsonLd['@context'], 'https://schema.org');
  assert.equal(jsonLd['@type'], 'Event');
  assert.equal(jsonLd.name, 'Sunnyvale Storytime');
  assert.equal(jsonLd.description, 'Weekly library story hour for preschoolers.');
  assert.equal(jsonLd.startDate, '2026-10-01T10:30:00');
  assert.equal(jsonLd.endDate, '2026-10-01T11:30:00');
  assert.equal(jsonLd.isAccessibleForFree, true);
  assert.equal(jsonLd.location?.['@type'], 'Place');
  assert.equal(jsonLd.location?.name, 'Sunnyvale Public Library');
});

test('buildEventJsonLd handles all-day or missing time gracefully', () => {
  const allDayEvent: SeoEvent = {
    id: 'ev-456',
    title: 'Pumpkin Patch Festival',
    description: 'Fall weekend festival.',
    startDate: '2026-10-10',
    endDate: '2026-10-11',
    location: null,
    isFree: false,
    cost: '$15',
  };

  const jsonLd = buildEventJsonLd(allDayEvent);

  assert.equal(jsonLd['@type'], 'Event');
  assert.equal(jsonLd.startDate, '2026-10-10');
  assert.equal(jsonLd.endDate, '2026-10-11');
  assert.equal(jsonLd.isAccessibleForFree, false);
  assert.equal(jsonLd.location?.name, 'San Francisco Bay Area');
});
