import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE_URL,
  SITE_NAME,
  getSiteUrl,
  buildWebSiteJsonLd,
  buildEventJsonLd,
  buildEventListJsonLd,
  getSiteIcons,
  getSocialImageConfig,
  getGoogleVerificationCode,
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

test('getSiteIcons returns standard favicon, svg, and apple touch icons', () => {
  const icons = getSiteIcons();
  assert.ok(Array.isArray(icons.icon));
  assert.ok(icons.icon.some((i) => i.url === '/favicon.ico'));
  assert.ok(icons.icon.some((i) => i.url === '/icon.svg' && i.type === 'image/svg+xml'));
  assert.ok(icons.icon.some((i) => i.url === '/icon.png'));
  assert.ok(Array.isArray(icons.apple));
  assert.ok(icons.apple.some((i) => i.url === '/apple-icon.png'));
});

test('buildEventJsonLd includes organizer from source and offers for free events without cost text', () => {
  const event: SeoEvent = {
    id: 'ev-free',
    title: 'Free Science Fair',
    startDate: '2026-10-15',
    isFree: true,
    cost: null,
    rawCaption: 'Awesome hands-on science activities for children of all ages!',
    source: {
      name: 'Bay Area Discovery Museum',
      handle: '@badm_kids',
    },
  };

  const jsonLd = buildEventJsonLd(event);

  assert.equal(jsonLd.name, 'Free Science Fair');
  assert.equal(jsonLd.description, 'Awesome hands-on science activities for children of all ages!');
  assert.ok(jsonLd.organizer);
  assert.equal(jsonLd.organizer['@type'], 'Organization');
  assert.equal(jsonLd.organizer.name, 'Bay Area Discovery Museum');
  assert.equal(jsonLd.organizer.url, 'https://instagram.com/badm_kids');
  assert.ok(jsonLd.offers);
  assert.equal(jsonLd.offers.price, '0');
  assert.equal(jsonLd.offers.priceCurrency, 'USD');
});

test('buildEventListJsonLd wraps multiple events in Schema.org ItemList with 1-based ListItem positions', () => {
  const events: SeoEvent[] = [
    {
      id: '1',
      title: 'Event One',
      startDate: '2026-10-01',
    },
    {
      id: '2',
      title: 'Event Two',
      startDate: '2026-10-02',
    },
  ];

  const listJsonLd = buildEventListJsonLd(events);

  assert.equal(listJsonLd['@context'], 'https://schema.org');
  assert.equal(listJsonLd['@type'], 'ItemList');
  assert.equal(listJsonLd.itemListElement.length, 2);
  assert.equal(listJsonLd.itemListElement[0]['@type'], 'ListItem');
  assert.equal(listJsonLd.itemListElement[0].position, 1);
  assert.equal(listJsonLd.itemListElement[0].item.name, 'Event One');
  assert.equal(listJsonLd.itemListElement[1].position, 2);
  assert.equal(listJsonLd.itemListElement[1].item.name, 'Event Two');
});

test('getSocialImageConfig produces 1200x630 OpenGraph image metadata', () => {
  const social = getSocialImageConfig();
  assert.equal(social.url, 'https://www.littledaysout.com/og-image.png');
  assert.equal(social.width, 1200);
  assert.equal(social.height, 630);
  assert.equal(social.type, 'image/png');
  assert.match(social.alt, /Little Days Out/i);
});

test('getGoogleVerificationCode reads env variable when present and returns undefined when absent', () => {
  const orig = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  try {
    delete process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
    assert.equal(getGoogleVerificationCode(), undefined);

    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION = 'abc123token';
    assert.equal(getGoogleVerificationCode(), 'abc123token');

    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION = '   ';
    assert.equal(getGoogleVerificationCode(), undefined);
  } finally {
    if (orig !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION = orig;
    } else {
      delete process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
    }
  }
});



