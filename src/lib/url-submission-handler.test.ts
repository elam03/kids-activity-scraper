import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleGetSubmissions,
  handlePostSubmissions,
  handleDeleteSubmission,
} from './url-submission-handler';

function createMockHandlerDb() {
  const submissions: any[] = [];
  const sources: any[] = [{ id: 'src_default', handle: 'community_submissions' }];

  return {
    submissions,
    sources,
    source: {
      findUnique: async () => sources[0],
      create: async ({ data }: any) => {
        const s = { id: `src_${sources.length + 1}`, ...data };
        sources.push(s);
        return s;
      },
    },
    urlSubmission: {
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        let filtered = [...submissions];
        if (where?.status) {
          filtered = filtered.filter((s) => s.status === where.status);
        }
        return filtered.slice(skip, skip + take);
      },
      count: async ({ where }: any) => {
        if (where?.status) {
          return submissions.filter((s) => s.status === where.status).length;
        }
        return submissions.length;
      },
      findUnique: async ({ where }: any) => {
        return submissions.find((s) => s.id === where.id) || null;
      },
      create: async ({ data }: any) => {
        const item = {
          id: `sub_${submissions.length + 1}`,
          extractedEventCount: 0,
          createdAt: new Date(),
          events: [],
          ...data,
        };
        submissions.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const item = submissions.find((s) => s.id === where.id);
        if (!item) throw new Error('Not found');
        Object.assign(item, data);
        return item;
      },
      delete: async ({ where }: any) => {
        const idx = submissions.findIndex((s) => s.id === where.id);
        if (idx === -1) throw new Error('Not found');
        const [deleted] = submissions.splice(idx, 1);
        return deleted;
      },
    },
  };
}

test('handlePostSubmissions rejects missing or empty URL', async () => {
  const mockDb = createMockHandlerDb();
  const req = new Request('http://localhost/api/admin/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const res = await handlePostSubmissions(req, { db: mockDb as any });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error?.includes('valid URL'));
});

test('handlePostSubmissions blocks SSRF loopback and private networks', async () => {
  const mockDb = createMockHandlerDb();
  const req = new Request('http://localhost/api/admin/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'http://127.0.0.1:8000/internal' }),
  });

  const res = await handlePostSubmissions(req, { db: mockDb as any });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error?.includes('blocked'));
});

test('handlePostSubmissions rejects spam URLs via Gate 1 and saves as rejected', async () => {
  const mockDb = createMockHandlerDb();
  const req = new Request('http://localhost/api/admin/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://spammy-site.com/malware.exe' }),
  });

  const res = await handlePostSubmissions(req, { db: mockDb as any });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.submission.status, 'rejected');
  assert.equal(mockDb.submissions.length, 1);
  assert.equal(mockDb.submissions[0].status, 'rejected');
});

test('handlePostSubmissions queues valid URL when runImmediately is false', async () => {
  const mockDb = createMockHandlerDb();
  const req = new Request('http://localhost/api/admin/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://paloalto.org/events/library-puppet-show?utm_source=fb',
      notes: 'Submitted by library organizer',
    }),
  });

  const res = await handlePostSubmissions(req, { db: mockDb as any });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.submission.status, 'queued');
  // Check tracking param stripped
  assert.equal(data.submission.normalizedUrl, 'https://paloalto.org/events/library-puppet-show');
  assert.equal(mockDb.submissions.length, 1);
});

test('handlePostSubmissions processes immediately when runImmediately is true', async () => {
  const mockDb = createMockHandlerDb();
  const mockProcessor = async (id: string) => {
    await mockDb.urlSubmission.update({
      where: { id },
      data: { status: 'completed', extractedEventCount: 2 },
    });
    return {
      submissionId: id,
      status: 'completed' as const,
      extractedEventCount: 2,
    };
  };

  const req = new Request('http://localhost/api/admin/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://community.org/festival',
      runImmediately: true,
    }),
  });

  const res = await handlePostSubmissions(req, {
    db: mockDb as any,
    processor: mockProcessor as any,
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.submission.status, 'completed');
  assert.equal(data.submission.extractedEventCount, 2);
});

test('handleGetSubmissions returns filtered list and total count', async () => {
  const mockDb = createMockHandlerDb();
  mockDb.submissions.push(
    { id: '1', rawUrl: 'https://a.com', status: 'queued', createdAt: new Date() },
    { id: '2', rawUrl: 'https://b.com', status: 'completed', createdAt: new Date() },
    { id: '3', rawUrl: 'https://c.com', status: 'completed', createdAt: new Date() }
  );

  // Filter all
  const reqAll = new Request('http://localhost/api/admin/submissions?status=all');
  const resAll = await handleGetSubmissions(reqAll, { db: mockDb as any });
  const dataAll = await resAll.json();
  assert.equal(dataAll.total, 3);
  assert.equal(dataAll.submissions.length, 3);

  // Filter completed
  const reqComp = new Request('http://localhost/api/admin/submissions?status=completed');
  const resComp = await handleGetSubmissions(reqComp, { db: mockDb as any });
  const dataComp = await resComp.json();
  assert.equal(dataComp.total, 2);
  assert.equal(dataComp.submissions.length, 2);
});

test('handleDeleteSubmission removes submission by ID and validates input', async () => {
  const mockDb = createMockHandlerDb();
  mockDb.submissions.push({ id: 'sub_del', rawUrl: 'https://delete-me.com' });

  // Missing ID
  const reqNoId = new Request('http://localhost/api/admin/submissions', { method: 'DELETE' });
  const resNoId = await handleDeleteSubmission(reqNoId, { db: mockDb as any });
  assert.equal(resNoId.status, 400);

  // Valid ID
  const reqValid = new Request('http://localhost/api/admin/submissions?id=sub_del', { method: 'DELETE' });
  const resValid = await handleDeleteSubmission(reqValid, { db: mockDb as any });
  assert.equal(resValid.status, 200);
  assert.equal(mockDb.submissions.length, 0);
});
