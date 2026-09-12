import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestEvent, type IngestEventPayload, type IngestionResult } from './event-ingestion';
import type { LLMExtractor, ExtractionResult } from './llm-extractor';

// In-memory mock Prisma client for testing ingestion persistence without postgres
function createMockPrisma() {
  const events: any[] = [];

  return {
    events,
    event: {
      findFirst: async ({ where }: { where: { rawPostUrl: string } }) => {
        return events.find((e) => e.rawPostUrl === where.rawPostUrl) || null;
      },
      upsert: async ({ where, update, create }: any) => {
        const existingIndex = events.findIndex(
          (e) =>
            e.rawPostUrl === where.rawPostUrl_title.rawPostUrl &&
            e.title === where.rawPostUrl_title.title
        );
        if (existingIndex >= 0) {
          events[existingIndex] = { ...events[existingIndex], ...update };
          return events[existingIndex];
        } else {
          const newRecord = {
            id: `evt_${events.length + 1}`,
            ...create,
            sourceId: create.source?.connect?.id,
          };
          delete newRecord.source;
          events.push(newRecord);
          return newRecord;
        }
      },
    },
  };
}

test('ingestEvent skips already ingested posts (idempotency)', async () => {
  const mockDb = createMockPrisma();
  mockDb.events.push({
    id: 'evt_1',
    rawPostUrl: 'https://instagram.com/p/existing123',
    title: 'Existing Event',
  });

  let extractorCalled = false;
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => {
      extractorCalled = true;
      return { isEvent: true, confidence: 1.0, events: [] };
    },
  };

  const result = await ingestEvent(
    'source_1',
    { postUrl: 'https://instagram.com/p/existing123', caption: 'Post caption' },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, 'already_exists');
  assert.equal(extractorCalled, false, 'Extractor should not be called for duplicate posts');
});

test('ingestEvent processes valid scraped post and persists approved events with geocoding', async () => {
  const mockDb = createMockPrisma();
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: true,
      confidence: 0.95,
      events: [
        {
          title: 'Kids Science Fair',
          startDate: '2026-09-20',
          category: 'education',
          location: 'San Jose Convention Center',
          isFree: true,
          description: 'Fun science fair',
        },
      ],
    }),
  };

  const mockGeocoder = async (loc: string) => {
    if (loc.includes('San Jose')) {
      return { lat: 37.3387, lng: -121.8853 };
    }
    return null;
  };

  const result = await ingestEvent(
    'source_1',
    {
      postUrl: 'https://instagram.com/p/science123',
      caption: 'Join us at the science fair!',
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      geocode: mockGeocoder,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result.skipped, false);
  assert.equal(result.isEvent, true);
  assert.equal(result.savedCount, 1);
  assert.equal(mockDb.events.length, 1);

  const saved = mockDb.events[0];
  assert.equal(saved.title, 'Kids Science Fair');
  assert.equal(saved.status, 'approved'); // Scraped events default to approved
  assert.equal(saved.sourceId, 'source_1');
  assert.equal(saved.latitude, 37.3387);
  assert.equal(saved.longitude, -121.8853);
});

test('ingestEvent marks manual flyer upload as pending status', async () => {
  const mockDb = createMockPrisma();
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: true,
      confidence: 0.88,
      events: [
        {
          title: 'Puppet Theater',
          startDate: '2026-10-01',
          category: 'arts',
          location: 'Campbell Library',
          isFree: false,
          cost: '$10',
          description: 'Puppet show',
        },
      ],
    }),
  };

  const result = await ingestEvent(
    'manual_source_id',
    {
      postUrl: 'https://manual-upload/upload_12345',
      images: ['data:image/webp;base64,mockImageBase64'],
      caption: 'Manual flyer',
      isManual: true,
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result.savedCount, 1);
  const saved = mockDb.events[0];
  assert.equal(saved.title, 'Puppet Theater');
  assert.equal(saved.status, 'pending'); // Manual uploads default to pending
});

test('ingestEvent filters past events and skips when all events have passed', async () => {
  const mockDb = createMockPrisma();
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: true,
      confidence: 0.9,
      events: [
        {
          title: 'Past Summer Camp',
          startDate: '2026-08-01',
          endDate: '2026-08-05',
          category: 'sports',
          isFree: false,
          description: 'Old camp',
        },
      ],
    }),
  };

  const result = await ingestEvent(
    'source_1',
    {
      postUrl: 'https://instagram.com/p/oldpost',
      caption: 'Summer camp throwback',
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, 'all_past_events');
  assert.equal(result.savedCount, 0);
  assert.equal(mockDb.events.length, 0);
});

test('ingestEvent saves rejected placeholder when LLM determines post is not an event', async () => {
  const mockDb = createMockPrisma();
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: false,
      confidence: 1.0,
      events: [],
    }),
  };

  const result = await ingestEvent(
    'source_1',
    {
      postUrl: 'https://instagram.com/p/meme',
      caption: 'A funny parenting meme',
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result.isEvent, false);
  assert.equal(result.savedCount, 0);
  assert.equal(mockDb.events.length, 1);
  const placeholder = mockDb.events[0];
  assert.equal(placeholder.title, 'Non-event');
  assert.equal(placeholder.status, 'rejected');
});

test('ingestEvent downloads child post slide images up to limit for sidecar posts', async () => {
  const mockDb = createMockPrisma();
  const downloadedUrls: string[] = [];
  const mockDownloader = async (url: string) => {
    downloadedUrls.push(url);
    return `data:image/webp;base64,data_${url}`;
  };

  let extractedImages: string[] = [];
  const mockExtractor: LLMExtractor = {
    extractEvents: async (input) => {
      extractedImages = input.images || [];
      return { isEvent: true, confidence: 0.9, events: [{ title: 'Slide Event', startDate: '2026-09-25', category: 'arts', isFree: true, description: 'Test' }] };
    },
  };

  const childPosts = Array.from({ length: 15 }, (_, i) => ({
    displayUrl: `https://cdn.instagram.com/slide_${i}.jpg`,
  }));

  await ingestEvent(
    'source_1',
    {
      postUrl: 'https://instagram.com/p/sidecar123',
      postType: 'Sidecar',
      childPosts,
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      downloadImage: mockDownloader,
      currentDate: '2026-09-12',
    }
  );

  // Maximum 10 slides processed
  assert.equal(downloadedUrls.length, 10);
  assert.equal(extractedImages.length, 10);
  assert.equal(extractedImages[0], 'data:image/webp;base64,data_https://cdn.instagram.com/slide_0.jpg');
});
