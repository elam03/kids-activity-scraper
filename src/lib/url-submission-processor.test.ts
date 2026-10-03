import test from 'node:test';
import assert from 'node:assert/strict';
import {
  processUrlSubmission,
  getOrCreateSubmissionSource,
} from './url-submission-processor';

function createMockProcessorDb() {
  const sources: any[] = [];
  const submissions: any[] = [];
  const events: any[] = [];

  return {
    sources,
    submissions,
    events,
    source: {
      findUnique: async ({ where }: any) => {
        return sources.find((s) => s.handle === where.handle || s.id === where.id) || null;
      },
      create: async ({ data }: any) => {
        const newSource = { id: `src_${sources.length + 1}`, ...data };
        sources.push(newSource);
        return newSource;
      },
    },
    urlSubmission: {
      findUnique: async ({ where }: any) => {
        return submissions.find((s) => s.id === where.id) || null;
      },
      update: async ({ where, data }: any) => {
        const sub = submissions.find((s) => s.id === where.id);
        if (!sub) throw new Error('Not found');
        Object.assign(sub, data);
        return sub;
      },
    },
    event: {
      findFirst: async () => null,
      upsert: async ({ create }: any) => {
        const newEvt = { id: `evt_${events.length + 1}`, ...create };
        events.push(newEvt);
        return newEvt;
      },
    },
  };
}

test('getOrCreateSubmissionSource creates canonical source if missing and reuses existing', async () => {
  const mockDb = createMockProcessorDb();

  const id1 = await getOrCreateSubmissionSource(mockDb as any);
  assert.ok(id1.startsWith('src_'));
  assert.equal(mockDb.sources.length, 1);
  assert.equal(mockDb.sources[0].handle, 'community_submissions');

  const id2 = await getOrCreateSubmissionSource(mockDb as any);
  assert.equal(id2, id1);
  assert.equal(mockDb.sources.length, 1);
});

test('processUrlSubmission scrapes web page and ingests extracted events', async () => {
  const mockDb = createMockProcessorDb();
  mockDb.submissions.push({
    id: 'sub_test_1',
    rawUrl: 'https://community.org/stem-workshop',
    normalizedUrl: 'https://community.org/stem-workshop',
    status: 'queued',
    extractedEventCount: 0,
  });

  const mockScraper = async () => ({
    url: 'https://community.org/stem-workshop',
    tier: 'direct_html' as const,
    title: 'Kids STEM Workshop',
    text: 'Join us Saturday Oct 24 for a robotics and science workshop. Free admission.',
  });

  let ingestedWithSource = '';
  const mockIngestFn = async (sourceId: string, payload: any) => {
    ingestedWithSource = sourceId;
    await mockDb.urlSubmission.update({
      where: { id: payload.submissionId },
      data: { status: 'completed', extractedEventCount: 1 },
    });
    return {
      rawPostUrl: payload.postUrl,
      isEvent: true,
      confidence: 0.95,
      events: [{ title: 'Kids STEM Workshop' }],
      savedCount: 1,
      skipped: false,
    } as any;
  };

  const result = await processUrlSubmission('sub_test_1', {
    db: mockDb as any,
    scraper: mockScraper as any,
    ingestFn: mockIngestFn as any,
    sourceId: 'src_custom',
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.extractedEventCount, 1);
  assert.equal(ingestedWithSource, 'src_custom');

  const updated = mockDb.submissions[0];
  assert.equal(updated.status, 'completed');
  assert.equal(updated.extractedEventCount, 1);
});

test('processUrlSubmission handles scraping errors gracefully and marks status as failed', async () => {
  const mockDb = createMockProcessorDb();
  mockDb.submissions.push({
    id: 'sub_fail',
    rawUrl: 'https://broken-domain-404.org/none',
    normalizedUrl: 'https://broken-domain-404.org/none',
    status: 'queued',
    extractedEventCount: 0,
  });

  const mockScraper = async () => {
    throw new Error('Connection refused by host');
  };

  const result = await processUrlSubmission('sub_fail', {
    db: mockDb as any,
    scraper: mockScraper as any,
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.extractedEventCount, 0);
  assert.ok(result.error?.includes('Connection refused'));

  const updated = mockDb.submissions[0];
  assert.equal(updated.status, 'failed');
  assert.ok(updated.failureReason?.includes('Connection refused'));
});
