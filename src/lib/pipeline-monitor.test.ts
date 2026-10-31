import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSystemStatus,
  calculateQualityMetrics,
  calculateCommunityMetrics,
  calculateSourceHealth,
  recordIngestionRun,
  getRecentIngestionRuns,
  clearIngestionRuns,
  getPipelineHealthSummary,
  type IngestionRunRecord,
} from './pipeline-monitor';

describe('Pipeline Monitor - Ingestion Run Records', () => {
  beforeEach(() => {
    clearIngestionRuns();
  });

  test('records and retrieves ingestion runs in reverse chronological order', () => {
    const run1: IngestionRunRecord = {
      id: 'run-1',
      trigger: 'cron',
      startedAt: '2026-10-31T10:00:00.000Z',
      completedAt: '2026-10-31T10:01:00.000Z',
      durationMs: 60000,
      status: 'success',
      postsScraped: 5,
      eventsCreated: 3,
      eventsSkipped: 2,
    };

    const run2: IngestionRunRecord = {
      id: 'run-2',
      trigger: 'manual',
      sourceHandle: 'bayarea_fun',
      startedAt: '2026-10-31T11:00:00.000Z',
      completedAt: '2026-10-31T11:00:30.000Z',
      durationMs: 30000,
      status: 'failed',
      postsScraped: 0,
      eventsCreated: 0,
      eventsSkipped: 0,
      error: 'Rate limit exceeded',
    };

    recordIngestionRun(run1);
    recordIngestionRun(run2);

    const history = getRecentIngestionRuns(10);
    assert.equal(history.length, 2);
    assert.equal(history[0].id, 'run-2'); // Most recent first
    assert.equal(history[1].id, 'run-1');
  });

  test('limits history size to specified max limit', () => {
    for (let i = 0; i < 30; i++) {
      recordIngestionRun({
        id: `run-${i}`,
        trigger: 'cron',
        startedAt: new Date(Date.now() + i * 1000).toISOString(),
        status: 'success',
        postsScraped: 1,
        eventsCreated: 1,
        eventsSkipped: 0,
        durationMs: 500,
      });
    }

    const limited = getRecentIngestionRuns(10);
    assert.equal(limited.length, 10);
    assert.equal(limited[0].id, 'run-29');
  });
});

describe('Pipeline Monitor - calculateSystemStatus', () => {
  test('returns healthy when no failures, no high-rate stale sources, and normal pending queue', () => {
    const status = calculateSystemStatus({
      recentRuns: [
        { id: '1', trigger: 'cron', startedAt: '', status: 'success', postsScraped: 5, eventsCreated: 2, eventsSkipped: 3, durationMs: 1000 },
      ],
      staleSourcesCount: 0,
      totalActiveSources: 5,
      pendingCount: 2,
      lowAccuracyRatio: 0.05,
    });

    assert.equal(status.level, 'healthy');
    assert.match(status.message, /healthy/i);
  });

  test('returns degraded when recent run failed or multiple stale sources exist', () => {
    const status = calculateSystemStatus({
      recentRuns: [
        { id: '1', trigger: 'cron', startedAt: '', status: 'failed', postsScraped: 0, eventsCreated: 0, eventsSkipped: 0, durationMs: 500, error: 'Timeout' },
      ],
      staleSourcesCount: 2,
      totalActiveSources: 4,
      pendingCount: 5,
      lowAccuracyRatio: 0.1,
    });

    assert.equal(status.level, 'degraded');
    assert.match(status.message, /degraded|warning|issue/i);
  });

  test('returns critical when all sources are stale and error rate is high', () => {
    const status = calculateSystemStatus({
      recentRuns: [
        { id: '1', trigger: 'cron', startedAt: '', status: 'failed', postsScraped: 0, eventsCreated: 0, eventsSkipped: 0, durationMs: 500, error: 'Auth failed' },
        { id: '2', trigger: 'cron', startedAt: '', status: 'failed', postsScraped: 0, eventsCreated: 0, eventsSkipped: 0, durationMs: 500, error: 'Auth failed' },
      ],
      staleSourcesCount: 5,
      totalActiveSources: 5,
      pendingCount: 40,
      lowAccuracyRatio: 0.5,
    });

    assert.equal(status.level, 'critical');
  });
});

describe('Pipeline Monitor - calculateQualityMetrics', () => {
  test('computes accuracy tiers and aggregates quality flags', () => {
    const sampleEvents = [
      {
        id: 'ev-1',
        title: 'SF Science Museum Family Day',
        startDate: '2026-11-01',
        startTime: '10:00',
        location: '55 Music Concourse Dr, San Francisco',
        latitude: 37.77,
        longitude: -122.46,
        confidence: 0.95,
        feedbacks: [],
      },
      {
        id: 'ev-2',
        title: 'Toddler Art Workshop',
        startDate: '2026-11-02',
        startTime: '10:00', // +5
        location: 'Bay Area', // broad-location flag: -10
        confidence: 0.85, // 85 + 5 - 10 = 80 (Medium tier: 70-84)
        feedbacks: [],
      },
      {
        id: 'ev-3',
        title: 'Non-Event', // suspicious-title flag
        startDate: '2026-11-03',
        location: null, // missing-location flag
        confidence: 0.5,
        feedbacks: [{ type: 'report_inaccurate', reason: 'wrong_date' }],
      },
    ];

    const metrics = calculateQualityMetrics(sampleEvents);

    assert.equal(metrics.total, 3);
    assert.equal(metrics.highAccuracyCount, 1);
    assert.equal(metrics.mediumAccuracyCount, 1);
    assert.equal(metrics.lowAccuracyCount, 1);
    assert.equal(metrics.flaggedCount, 2);
    assert.ok(metrics.averageScore > 0 && metrics.averageScore < 100);
    assert.ok(metrics.flagsBreakdown['broad-location'] >= 1);
    assert.ok(metrics.flagsBreakdown['suspicious-title'] >= 1);
    assert.ok(metrics.flagsBreakdown['missing-location'] >= 1);
  });
});

describe('Pipeline Monitor - calculateCommunityMetrics', () => {
  test('computes total likes, reports, and helpfulness ratio', () => {
    const feedbacks = [
      { type: 'like' },
      { type: 'like' },
      { type: 'like' },
      { type: 'report_inaccurate', reason: 'cancelled' },
    ];

    const metrics = calculateCommunityMetrics(feedbacks);

    assert.equal(metrics.totalLikes, 3);
    assert.equal(metrics.totalReports, 1);
    assert.equal(metrics.helpfulnessRatio, 75); // 3 out of 4 = 75%
  });

  test('returns 100% helpfulness ratio when there are likes and zero reports', () => {
    const feedbacks = [{ type: 'like' }, { type: 'like' }];
    const metrics = calculateCommunityMetrics(feedbacks);
    assert.equal(metrics.helpfulnessRatio, 100);
  });

  test('returns 100% helpfulness ratio when no feedback exists yet', () => {
    const metrics = calculateCommunityMetrics([]);
    assert.equal(metrics.helpfulnessRatio, 100);
    assert.equal(metrics.totalLikes, 0);
    assert.equal(metrics.totalReports, 0);
  });
});

describe('Pipeline Monitor - calculateSourceHealth', () => {
  test('identifies due sources and stale sources', () => {
    const now = new Date('2026-10-31T12:00:00.000Z');
    const sources = [
      {
        id: 's1',
        handle: 'fresh_source',
        name: 'Fresh Source',
        isActive: true,
        scrapeIntervalHours: 24,
        customIntervalHours: null,
        lastScrapedAt: new Date('2026-10-31T06:00:00.000Z'), // 6 hours ago (< 24)
        events: [{ status: 'approved' }, { status: 'approved' }],
      },
      {
        id: 's2',
        handle: 'due_source',
        name: 'Due Source',
        isActive: true,
        scrapeIntervalHours: 24,
        customIntervalHours: null,
        lastScrapedAt: new Date('2026-10-30T10:00:00.000Z'), // 26 hours ago (>= 24)
        events: [{ status: 'approved' }],
      },
      {
        id: 's3',
        handle: 'stale_source',
        name: 'Stale Source',
        isActive: true,
        scrapeIntervalHours: 24,
        customIntervalHours: null,
        lastScrapedAt: new Date('2026-10-15T00:00:00.000Z'), // 16 days ago (> 7 days)
        events: [],
      },
      {
        id: 's4',
        handle: 'inactive_source',
        name: 'Inactive Source',
        isActive: false,
        scrapeIntervalHours: 24,
        customIntervalHours: null,
        lastScrapedAt: null,
        events: [],
      },
    ];

    const health = calculateSourceHealth(sources, now);

    assert.equal(health.total, 4);
    assert.equal(health.active, 3);
    assert.equal(health.inactive, 1);
    assert.equal(health.dueForScrape, 2); // s2 (due) and s3 (overdue)
    assert.equal(health.stale, 1); // s3 is stale (> 7 days)

    const freshStatus = health.sourceStatuses.find((s) => s.handle === 'fresh_source');
    assert.equal(freshStatus?.isDue, false);
    assert.equal(freshStatus?.isStale, false);

    const staleStatus = health.sourceStatuses.find((s) => s.handle === 'stale_source');
    assert.equal(staleStatus?.isDue, true);
    assert.equal(staleStatus?.isStale, true);
  });
});

describe('Pipeline Monitor - getPipelineHealthSummary (Integration with Mock DB)', () => {
  test('aggregates events, quality, community, and source metrics from database models', async () => {
    const mockDb = {
      source: {
        findMany: async () => [
          {
            id: 's1',
            handle: 'test_creator',
            name: 'Test Creator',
            isActive: true,
            lastScrapedAt: new Date('2026-10-31T08:00:00Z'),
            scrapeIntervalHours: 24,
            events: [{ status: 'approved' }],
          },
        ],
      },
      event: {
        count: async ({ where }: any = {}) => {
          if (where?.status === 'pending') return 1;
          if (where?.status === 'rejected') return 0;
          if (where?.status === 'approved') return 2;
          return 3; // total
        },
        findMany: async () => [
          {
            id: 'e1',
            title: 'Toddler Music Class',
            startDate: '2026-10-31',
            startTime: '10:00',
            location: 'Berkeley, CA',
            status: 'approved',
            confidence: 0.9,
            source: { handle: 'test_creator' },
            feedbacks: [{ type: 'like' }],
          },
        ],
      },
      eventFeedback: {
        findMany: async () => [{ type: 'like' }],
      },
      urlSubmission: {
        count: async ({ where }: any = {}) => {
          if (where?.status === 'pending') return 0;
          if (where?.status === 'completed') return 1;
          if (where?.status === 'failed') return 0;
          return 1;
        },
        findMany: async () => [
          {
            id: 'sub-1',
            rawUrl: 'https://example.com/event',
            status: 'completed',
            extractedEventCount: 1,
            createdAt: new Date('2026-10-31T09:00:00Z'),
            failureReason: null,
          },
        ],
      },
    };

    const summary = await getPipelineHealthSummary({
      db: mockDb,
      now: new Date('2026-10-31T12:00:00Z'),
    });

    assert.equal(summary.systemStatus, 'healthy');
    assert.equal(summary.events.total, 3);
    assert.equal(summary.events.pendingReview, 1);
    assert.equal(summary.events.upcomingApproved, 2);
    assert.equal(summary.quality.total, 1);
    assert.equal(summary.community.totalLikes, 1);
    assert.equal(summary.community.helpfulnessRatio, 100);
    assert.equal(summary.sources.total, 1);
    assert.equal(summary.sources.active, 1);
    assert.equal(summary.submissions.completed, 1);
  });
});

