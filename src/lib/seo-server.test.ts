import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatEventsToItemListJsonLd,
  getUpcomingEventsStructuredData,
} from './seo-server';

test('formatEventsToItemListJsonLd formats raw Prisma events into ItemList JSON-LD', () => {
  const mockPrismaEvents = [
    {
      id: 'e1',
      title: 'Family Park Concert',
      rawCaption: 'Outdoor live music in the park for kids and families.',
      startDate: '2026-10-18',
      endDate: '2026-10-18',
      startTime: '14:00',
      endTime: '16:00',
      location: 'Golden Gate Park, San Francisco',
      cost: 'Free',
      isFree: true,
      registrationUrl: null,
      rawPostUrl: 'https://instagram.com/p/example1',
      source: {
        name: 'SF Rec & Parks',
        handle: 'sfrecpark',
        url: 'https://sfrecpark.org',
      },
    },
    {
      id: 'e2',
      title: 'Science Workshop',
      rawCaption: 'Robotics demo for older kids.',
      startDate: '2026-10-20',
      endDate: null,
      startTime: null,
      endTime: null,
      location: 'San Jose Tech Center',
      cost: '$10',
      isFree: false,
      registrationUrl: 'https://tech.example.com/tickets',
      rawPostUrl: null,
      source: null,
    },
  ];

  const result = formatEventsToItemListJsonLd(mockPrismaEvents as any);

  assert.equal(result['@context'], 'https://schema.org');
  assert.equal(result['@type'], 'ItemList');
  assert.equal(result.itemListElement.length, 2);

  const item1 = result.itemListElement[0];
  assert.equal(item1.position, 1);
  assert.equal(item1.item.name, 'Family Park Concert');
  assert.equal(item1.item.organizer?.name, 'SF Rec & Parks');
  assert.equal(item1.item.organizer?.url, 'https://sfrecpark.org');
  assert.equal(item1.item.offers?.price, '0');

  const item2 = result.itemListElement[1];
  assert.equal(item2.position, 2);
  assert.equal(item2.item.name, 'Science Workshop');
  assert.equal(item2.item.organizer, undefined);
  assert.equal(item2.item.offers?.price, '$10');
});

test('getUpcomingEventsStructuredData handles Prisma error or absence gracefully returning null', async () => {
  const mockFailingPrisma = {
    event: {
      findMany: async () => {
        throw new Error('Database connection failed');
      },
    },
  };

  const result = await getUpcomingEventsStructuredData(mockFailingPrisma as any);
  assert.equal(result, null);
});
