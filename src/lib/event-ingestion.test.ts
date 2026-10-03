import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestEvent, type IngestEventPayload, type IngestionResult } from './event-ingestion';
import type { LLMExtractor, ExtractionResult } from './llm-extractor';

// In-memory mock Prisma client for testing ingestion persistence without postgres
function createMockPrisma() {
  const events: any[] = [];
  const submissions: any[] = [];
  const eventSources: any[] = [];

  return {
    events,
    submissions,
    eventSources,
    urlSubmission: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        return submissions.find((s) => s.id === where.id) || null;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        let sub = submissions.find((s) => s.id === where.id);
        if (!sub) {
          sub = { id: where.id, ...data };
          submissions.push(sub);
        } else {
          Object.assign(sub, data);
        }
        return sub;
      },
    },
    event: {
      findFirst: async ({ where }: { where: { rawPostUrl: string } }) => {
        return events.find((e) => e.rawPostUrl === where.rawPostUrl) || null;
      },
      findMany: async ({ where }: any = {}) => {
        return events.filter((e) => {
          if (where?.startDate && e.startDate !== where.startDate) return false;
          if (where?.status?.not && e.status === where.status.not) return false;
          return true;
        });
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const ev = events.find((e) => e.id === where.id);
        if (ev) {
          Object.assign(ev, data);
          return ev;
        }
        return null;
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
            submissionId: create.submission?.connect?.id || null,
          };
          delete newRecord.source;
          delete newRecord.submission;
          events.push(newRecord);
          return newRecord;
        }
      },
    },
    eventSource: {
      findFirst: async ({ where }: any) => {
        return eventSources.find((es) => es.rawPostUrl === where.rawPostUrl) || null;
      },
      upsert: async ({ where, update, create }: any) => {
        const idx = eventSources.findIndex(
          (es) =>
            es.eventId === where.eventId_rawPostUrl.eventId &&
            es.rawPostUrl === where.eventId_rawPostUrl.rawPostUrl
        );
        if (idx >= 0) {
          eventSources[idx] = { ...eventSources[idx], ...update };
          return eventSources[idx];
        } else {
          const newEs = { id: `es_${eventSources.length + 1}`, ...create };
          eventSources.push(newEs);
          return newEs;
        }
      },
      create: async ({ data }: any) => {
        const newEs = { id: `es_${eventSources.length + 1}`, ...data };
        eventSources.push(newEs);
        return newEs;
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

test('ingestEvent supports pre-extracted events (Tier 1 JSON-LD) without calling LLM extractor', async () => {
  const mockDb = createMockPrisma();
  let extractorCalled = false;
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => {
      extractorCalled = true;
      return { isEvent: true, confidence: 1.0, events: [] };
    },
  };

  const preExtracted = [
    {
      title: 'Pre-Extracted Storytime',
      startDate: '2026-10-15',
      location: 'Main Library, Berkeley',
      category: 'education' as const,
      isFree: true,
      description: 'Pre-extracted via JSON-LD',
    },
  ];

  const result = await ingestEvent(
    'source_1',
    {
      postUrl: 'https://library.org/storytime',
      extractedEvents: preExtracted,
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      geocode: async () => null,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(extractorCalled, false, 'LLM extractor must not be called when events are already extracted');
  assert.equal(result.isEvent, true);
  assert.equal(result.savedCount, 1);
  assert.equal(mockDb.events[0].title, 'Pre-Extracted Storytime');
});

test('ingestEvent unbundles multiple events and links them to UrlSubmission via submissionId', async () => {
  const mockDb = createMockPrisma();
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: true,
      confidence: 0.95,
      events: [
        {
          title: 'Weekend Festival Day 1',
          startDate: '2026-10-10',
          location: 'Golden Gate Park, San Francisco',
          category: 'festival',
          isFree: true,
          description: 'Day 1 festivities',
        },
        {
          title: 'Weekend Festival Day 2',
          startDate: '2026-10-11',
          location: 'Golden Gate Park, San Francisco',
          category: 'festival',
          isFree: true,
          description: 'Day 2 festivities',
        },
      ],
    }),
  };

  const result = await ingestEvent(
    'source_url_submission',
    {
      postUrl: 'https://sfweekendguide.com/october-festivals',
      caption: 'Full guide of weekend activities',
      submissionId: 'sub_123',
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      geocode: async () => null,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result.savedCount, 2);
  assert.equal(mockDb.events.length, 2);
  assert.equal(mockDb.events[0].submissionId, 'sub_123');
  assert.equal(mockDb.events[1].submissionId, 'sub_123');

  // Verify UrlSubmission was updated
  const updatedSub = await mockDb.urlSubmission.findUnique({ where: { id: 'sub_123' } });
  assert.ok(updatedSub);
  assert.equal(updatedSub.status, 'completed');
  assert.equal(updatedSub.extractedEventCount, 2);
});

test('ingestEvent uses Gate 3 to skip LLM when content contains zero event signals', async () => {
  const mockDb = createMockPrisma();
  let extractorCalled = false;
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => {
      extractorCalled = true;
      return { isEvent: true, confidence: 1.0, events: [] };
    },
  };

  const result = await ingestEvent(
    'source_url_submission',
    {
      postUrl: 'https://mommyblog.com/avocado-toast-recipe',
      caption: 'Today we are making healthy avocado toast for breakfast. Ingredients: bread, avocado, lemon juice.',
      submissionId: 'sub_recipe',
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(extractorCalled, false, 'LLM extractor should be skipped when Gate 3 detects no events');
  assert.equal(result.isEvent, false);
  assert.equal(result.savedCount, 0);

  const updatedSub = await mockDb.urlSubmission.findUnique({ where: { id: 'sub_recipe' } });
  assert.ok(updatedSub);
  assert.equal(updatedSub.status, 'rejected');
  assert.equal(updatedSub.extractedEventCount, 0);
});

test('ingestEvent uses Gate 4 to triage events to pending when venue is missing or ambiguous', async () => {
  const mockDb = createMockPrisma();
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: true,
      confidence: 0.95,
      events: [
        {
          title: 'Outdoor Playdate',
          startDate: '2026-10-18',
          location: null, // missing location!
          category: 'other',
          isFree: true,
          description: 'Meet up for outdoor play',
        },
      ],
    }),
  };

  const result = await ingestEvent(
    'source_1',
    {
      postUrl: 'https://community.org/playdate',
      caption: 'Join our fall playdate!',
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result.savedCount, 1);
  const saved = mockDb.events[0];
  assert.equal(saved.status, 'pending', 'Event with missing location should be set to pending for review');
});

test('ingestEvent records primary EventSource on initial creation and merges cross-source duplicate without duplicate Event', async () => {
  const mockDb = createMockPrisma();

  // Ingest Source 1 (Instagram)
  const extractor1: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: true,
      confidence: 0.95,
      events: [
        {
          title: 'Annual Pumpkin Patch & Harvest Festival',
          startDate: '2026-10-25',
          location: 'Alameda County Fairgrounds',
          category: 'festival',
          isFree: false,
          description: 'Fun festival',
        },
      ],
    }),
  };

  const geocoder = async () => ({ lat: 37.6604, lng: -121.8758 });

  const result1 = await ingestEvent(
    'src_instagram',
    {
      postUrl: 'https://instagram.com/p/harvest123',
      caption: 'Come out to the harvest festival!',
    },
    {
      db: mockDb as any,
      extractor: extractor1,
      geocode: geocoder,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result1.savedCount, 1);
  assert.equal(mockDb.events.length, 1);
  assert.equal(mockDb.eventSources.length, 1);
  assert.equal(mockDb.eventSources[0].isPrimary, true);
  assert.equal(mockDb.eventSources[0].rawPostUrl, 'https://instagram.com/p/harvest123');
  assert.equal(mockDb.events[0].startTime, null);

  // Ingest Source 2 (Web Submission / Eventbrite) with matching date & title but enriched metadata
  const extractor2: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: true,
      confidence: 0.95,
      events: [
        {
          title: 'Pumpkin Patch & Harvest Festival in Pleasanton',
          startDate: '2026-10-25',
          startTime: '10:00',
          endTime: '16:00',
          location: 'Alameda County Fairgrounds, 4501 Pleasanton Ave, Pleasanton',
          category: 'festival',
          isFree: false,
          cost: '$15',
          registrationUrl: 'https://eventbrite.com/e/harvest-festival-pleasanton',
          description: 'Enriched web listing',
        },
      ],
    }),
  };

  const result2 = await ingestEvent(
    'src_web',
    {
      postUrl: 'https://eventbrite.com/e/harvest-festival-pleasanton',
      caption: 'Register for tickets',
      submissionId: 'sub_eventbrite_456',
    },
    {
      db: mockDb as any,
      extractor: extractor2,
      geocode: geocoder,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result2.savedCount, 1);
  // Must NOT create a duplicate event row in db.events
  assert.equal(mockDb.events.length, 1, 'Duplicate event must be merged instead of creating a second row');

  // Must have 2 EventSource records (1 primary from Instagram, 1 secondary from Eventbrite)
  assert.equal(mockDb.eventSources.length, 2);
  const secondarySource = mockDb.eventSources.find((es) => !es.isPrimary);
  assert.ok(secondarySource, 'Secondary EventSource must be created');
  assert.equal(secondarySource.rawPostUrl, 'https://eventbrite.com/e/harvest-festival-pleasanton');
  assert.equal(secondarySource.sourceId, 'src_web');
  assert.equal(secondarySource.submissionId, 'sub_eventbrite_456');

  // Canonical event must be non-destructively patched with missing fields
  const canonical = mockDb.events[0];
  assert.equal(canonical.startTime, '10:00');
  assert.equal(canonical.endTime, '16:00');
  assert.equal(canonical.cost, '$15');
  assert.equal(canonical.registrationUrl, 'https://eventbrite.com/e/harvest-festival-pleasanton');
  assert.equal(canonical.location, 'Alameda County Fairgrounds, 4501 Pleasanton Ave, Pleasanton');
});

test('ingestEvent uses Gate 5 for borderline ambiguity and respects triage decision', async () => {
  const mockDb = createMockPrisma();

  // Seed existing event
  mockDb.events.push({
    id: 'evt_robotics_1',
    title: 'Family Robotics Workshop',
    startDate: '2026-11-01',
    location: 'San Mateo Event Center',
    status: 'approved',
    confidence: 0.9,
  });

  let gate5Called = false;
  const mockJevClient = {
    filterContentHasEvents: async () => ({ hasEvents: true, confidence: 1.0 }),
    triageExtractedEvent: async () => ({ status: 'approved' as const, confidence: 0.9 }),
    triageDuplicateCandidate: async () => {
      gate5Called = true;
      return { isDuplicate: true, confidence: 0.92, reason: 'Same robotics event' };
    },
  };

  const mockExtractor: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: true,
      confidence: 0.9,
      events: [
        {
          title: 'Kids Robotics Workshop', // Borderline similarity (0.6375)
          startDate: '2026-11-01',
          location: 'San Mateo Expo Hall',
          category: 'education',
          isFree: false,
          description: 'Robotics and coding projects',
        },
      ],
    }),
  };

  await ingestEvent(
    'src_maker',
    {
      postUrl: 'https://makerfaire.com/san-mateo',
      caption: 'Tickets on sale now',
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      jevClient: mockJevClient as any,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(gate5Called, true, 'Gate 5 triage should be invoked for borderline duplicate candidates');
  assert.equal(mockDb.events.length, 1, 'Borderline duplicate confirmed by Gate 5 should be merged');
  assert.equal(mockDb.eventSources.length, 1);
  assert.equal(mockDb.eventSources[0].isPrimary, false);
});

test('ingestEvent does NOT merge events with identical titles on same date if locations are far apart', async () => {
  const mockDb = createMockPrisma();

  // Seed San Francisco Storytime
  mockDb.events.push({
    id: 'evt_sf_story',
    title: 'Toddler Storytime',
    startDate: '2026-10-15',
    location: 'San Francisco Public Library',
    latitude: 37.7793,
    longitude: -122.4160,
    status: 'approved',
  });

  // Incoming San Jose Storytime with identical title on same date
  const mockExtractor: LLMExtractor = {
    extractEvents: async () => ({
      isEvent: true,
      confidence: 0.95,
      events: [
        {
          title: 'Toddler Storytime',
          startDate: '2026-10-15',
          location: 'Dr. Martin Luther King, Jr. Library, San Jose',
          category: 'education',
          isFree: true,
          description: 'Weekly storytime in San Jose',
        },
      ],
    }),
  };

  const geocoder = async () => ({ lat: 37.3355, lng: -121.8847 }); // > 40 miles away

  const result = await ingestEvent(
    'src_sj_library',
    {
      postUrl: 'https://sjlibrary.org/storytime',
      caption: 'Storytime at MLK library',
    },
    {
      db: mockDb as any,
      extractor: mockExtractor,
      geocode: geocoder,
      currentDate: '2026-09-12',
    }
  );

  assert.equal(result.savedCount, 1);
  assert.equal(mockDb.events.length, 2, 'Events > 5 miles apart should not be merged even with identical titles');
});

