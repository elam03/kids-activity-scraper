import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap, { revalidate, buildDynamicSitemapEntries } from '../app/sitemap';
import robots from '../app/robots';
import { SITE_URL } from './seo-utils';

test('sitemap exports 1-hour ISR revalidation constant', () => {
  assert.equal(revalidate, 3600, 'revalidate should be 3600 seconds (1 hour)');
});

test('buildDynamicSitemapEntries generates static, category, and age facet URLs', () => {
  const mockEvents = [
    { id: 'evt-1', updatedAt: new Date('2026-10-01T12:00:00Z'), startDate: '2026-10-15' },
    { id: 'evt-2', updatedAt: new Date('2026-10-02T12:00:00Z'), startDate: '2026-10-20' },
  ];

  const entries = buildDynamicSitemapEntries(mockEvents, SITE_URL);
  assert.ok(Array.isArray(entries));

  // Root URL
  const root = entries.find((e) => e.url === SITE_URL);
  assert.ok(root, 'Root URL must exist');
  assert.equal(root.priority, 1.0);
  assert.equal(root.changeFrequency, 'daily');

  // Category facets
  const festivalCategory = entries.find((e) => e.url === `${SITE_URL}/?category=festival`);
  assert.ok(festivalCategory, 'Category facet must exist');
  assert.equal(festivalCategory.changeFrequency, 'daily');
  assert.equal(festivalCategory.priority, 0.8);

  // Age group facets
  const toddlerAgeGroup = entries.find((e) => e.url === `${SITE_URL}/?ageGroup=toddlers`);
  assert.ok(toddlerAgeGroup, 'Age group facet must exist');
  assert.equal(toddlerAgeGroup.changeFrequency, 'daily');
  assert.equal(toddlerAgeGroup.priority, 0.8);

  // Dynamic Event URLs
  const evt1 = entries.find((e) => e.url === `${SITE_URL}/?event=evt-1`);
  assert.ok(evt1, 'Event 1 must exist in sitemap');
  assert.equal(evt1.changeFrequency, 'weekly');
  assert.equal(evt1.priority, 0.7);
  assert.deepEqual(evt1.lastModified, new Date('2026-10-01T12:00:00Z'));
});

test('robots produces disallowed rules for /admin and /api routes', () => {
  const config = robots();
  assert.ok(config.rules);
  const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
  assert.ok(rule.disallow);
  const disallows = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
  assert.ok(disallows.includes('/admin') || disallows.includes('/admin/*'));
  assert.ok(disallows.includes('/api/'));
  assert.equal(config.sitemap, `${SITE_URL}/sitemap.xml`);
});
