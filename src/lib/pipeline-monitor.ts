import { calculateAccuracyRating, type AccuracyTier } from './event-evaluator';
import { prisma as defaultPrisma } from './prisma';

export interface IngestionRunRecord {
  id: string;
  trigger: 'cron' | 'manual' | 'url_submission';
  sourceHandle?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: 'success' | 'partial' | 'failed';
  postsScraped: number;
  eventsCreated: number;
  eventsSkipped: number;
  error?: string;
}

export type SystemStatusLevel = 'healthy' | 'degraded' | 'critical';

export interface SystemStatus {
  level: SystemStatusLevel;
  message: string;
}

export interface QualityMetrics {
  total: number;
  averageScore: number;
  highAccuracyCount: number;
  mediumAccuracyCount: number;
  lowAccuracyCount: number;
  flaggedCount: number;
  flagsBreakdown: Record<string, number>;
}

export interface CommunityMetrics {
  totalLikes: number;
  totalReports: number;
  helpfulnessRatio: number;
}

export interface SourceStatusItem {
  id: string;
  handle: string;
  name: string;
  isActive: boolean;
  lastScrapedAt: string | null;
  scrapeIntervalHours: number;
  isDue: boolean;
  isStale: boolean;
  approvedCount: number;
  pendingCount: number;
}

export interface SourceHealth {
  total: number;
  active: number;
  inactive: number;
  dueForScrape: number;
  stale: number;
  sourceStatuses: SourceStatusItem[];
}

export interface FlaggedEventItem {
  id: string;
  title: string;
  startDate: string;
  location: string | null;
  sourceHandle: string;
  status: string;
  confidence: number;
  accuracyScore: number;
  accuracyTier: AccuracyTier;
  flags: string[];
  likes: number;
  reportCount: number;
  reportReasons: string[];
}

export interface PipelineHealthSummary {
  systemStatus: SystemStatusLevel;
  statusMessage: string;
  evaluatedAt: string;
  events: {
    total: number;
    upcomingApproved: number;
    pendingReview: number;
    rejected: number;
    pastEvents: number;
  };
  quality: QualityMetrics;
  community: CommunityMetrics;
  sources: SourceHealth;
  submissions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    recentSubmissions: Array<{
      id: string;
      rawUrl: string;
      status: string;
      extractedCount: number;
      createdAt: string;
      error?: string | null;
    }>;
  };
  recentRuns: IngestionRunRecord[];
  flaggedEvents: FlaggedEventItem[];
}

// In-memory run history (survives requests during service execution)
const MAX_RUN_HISTORY = 50;
let runHistory: IngestionRunRecord[] = [];

/**
 * Records an ingestion run into the in-memory history ring buffer.
 */
export function recordIngestionRun(run: IngestionRunRecord): void {
  // Prepend so latest runs are at index 0
  runHistory.unshift(run);
  if (runHistory.length > MAX_RUN_HISTORY) {
    runHistory = runHistory.slice(0, MAX_RUN_HISTORY);
  }
}

/**
 * Returns recent ingestion runs, limited by count.
 */
export function getRecentIngestionRuns(limit = 15): IngestionRunRecord[] {
  return runHistory.slice(0, limit);
}

/**
 * Clears ingestion runs history (primarily for test isolation).
 */
export function clearIngestionRuns(): void {
  runHistory = [];
}

/**
 * Computes high-level system status based on run outcomes, source health, and quality ratios.
 */
export function calculateSystemStatus(params: {
  recentRuns: IngestionRunRecord[];
  staleSourcesCount: number;
  totalActiveSources: number;
  pendingCount: number;
  lowAccuracyRatio: number;
}): SystemStatus {
  const { recentRuns, staleSourcesCount, totalActiveSources, pendingCount, lowAccuracyRatio } = params;

  // Count recent consecutive failures
  const recentFailures = recentRuns.slice(0, 3).filter((r) => r.status === 'failed').length;

  if (
    (totalActiveSources > 0 && staleSourcesCount >= totalActiveSources && recentFailures >= 2) ||
    lowAccuracyRatio > 0.4
  ) {
    return {
      level: 'critical',
      message: 'Critical: Multiple pipeline failures or widespread stale sources detected.',
    };
  }

  if (
    recentFailures > 0 ||
    staleSourcesCount > 0 ||
    pendingCount > 25 ||
    lowAccuracyRatio > 0.15
  ) {
    const reasons: string[] = [];
    if (recentFailures > 0) reasons.push(`${recentFailures} recent run failure(s)`);
    if (staleSourcesCount > 0) reasons.push(`${staleSourcesCount} stale source(s)`);
    if (pendingCount > 25) reasons.push(`${pendingCount} pending review items`);
    if (lowAccuracyRatio > 0.15) reasons.push('elevated low accuracy events');

    return {
      level: 'degraded',
      message: `Degraded: Issues detected (${reasons.join(', ')}).`,
    };
  }

  return {
    level: 'healthy',
    message: 'Healthy: Pipeline active, sources fresh, data quality within target range.',
  };
}

/**
 * Aggregates accuracy evaluations and quality flags for a collection of events.
 */
export function calculateQualityMetrics(
  events: Array<{
    id: string;
    title: string;
    startDate: string;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    confidence?: number;
    rawCaption?: string;
    feedbacks?: Array<{ type: string }>;
  }>
): QualityMetrics {
  const flagsBreakdown: Record<string, number> = {};
  let totalScore = 0;
  let highAccuracyCount = 0;
  let mediumAccuracyCount = 0;
  let lowAccuracyCount = 0;
  let flaggedCount = 0;

  for (const event of events) {
    const evaluation = calculateAccuracyRating(event);
    totalScore += evaluation.score;

    if (evaluation.tier === 'High') {
      highAccuracyCount++;
    } else if (evaluation.tier === 'Medium') {
      mediumAccuracyCount++;
    } else {
      lowAccuracyCount++;
    }

    if (evaluation.flags.length > 0) {
      flaggedCount++;
      for (const flag of evaluation.flags) {
        flagsBreakdown[flag] = (flagsBreakdown[flag] || 0) + 1;
      }
    }
  }

  const total = events.length;
  const averageScore = total > 0 ? Math.round(totalScore / total) : 100;

  return {
    total,
    averageScore,
    highAccuracyCount,
    mediumAccuracyCount,
    lowAccuracyCount,
    flaggedCount,
    flagsBreakdown,
  };
}

/**
 * Computes community helpfulness signals from feedback entries.
 */
export function calculateCommunityMetrics(
  feedbacks: Array<{ type: string; reason?: string | null }>
): CommunityMetrics {
  let totalLikes = 0;
  let totalReports = 0;

  for (const f of feedbacks) {
    if (f.type === 'like') {
      totalLikes++;
    } else if (f.type === 'report_inaccurate') {
      totalReports++;
    }
  }

  const total = totalLikes + totalReports;
  const helpfulnessRatio = total === 0 ? 100 : Math.round((totalLikes / total) * 100);

  return {
    totalLikes,
    totalReports,
    helpfulnessRatio,
  };
}

/**
 * Evaluates sources for scheduled scraping due state and staleness.
 */
export function calculateSourceHealth(
  sources: Array<{
    id: string;
    handle: string;
    name: string;
    isActive: boolean;
    lastScrapedAt: Date | string | null;
    scrapeIntervalHours: number;
    customIntervalHours?: number | null;
    events?: Array<{ status: string }>;
  }>,
  now: Date = new Date()
): SourceHealth {
  const sourceStatuses: SourceStatusItem[] = [];
  let active = 0;
  let inactive = 0;
  let dueForScrape = 0;
  let stale = 0;

  const nowMs = now.getTime();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  for (const s of sources) {
    if (s.isActive) {
      active++;
    } else {
      inactive++;
    }

    const interval = s.customIntervalHours ?? s.scrapeIntervalHours ?? 24;
    const lastScrapedMs = s.lastScrapedAt ? new Date(s.lastScrapedAt).getTime() : 0;
    const hoursSinceLast = (nowMs - lastScrapedMs) / (1000 * 60 * 60);

    const isDue = s.isActive && (lastScrapedMs === 0 || hoursSinceLast >= interval);
    const isStale = s.isActive && (lastScrapedMs === 0 || (nowMs - lastScrapedMs) > SEVEN_DAYS_MS);

    if (isDue) dueForScrape++;
    if (isStale) stale++;

    const approvedCount = (s.events || []).filter((e) => e.status === 'approved').length;
    const pendingCount = (s.events || []).filter((e) => e.status === 'pending').length;

    sourceStatuses.push({
      id: s.id,
      handle: s.handle,
      name: s.name,
      isActive: s.isActive,
      lastScrapedAt: s.lastScrapedAt ? new Date(s.lastScrapedAt).toISOString() : null,
      scrapeIntervalHours: interval,
      isDue,
      isStale,
      approvedCount,
      pendingCount,
    });
  }

  return {
    total: sources.length,
    active,
    inactive,
    dueForScrape,
    stale,
    sourceStatuses,
  };
}

/**
 * Loads full pipeline health summary directly from database.
 */
export async function getPipelineHealthSummary(options: {
  db?: any;
  now?: Date;
} = {}): Promise<PipelineHealthSummary> {
  const db = options.db || defaultPrisma;
  const now = options.now || new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Fetch sources
  const sources = await db.source.findMany({
    include: {
      events: {
        select: { status: true },
      },
    },
    orderBy: { handle: 'asc' },
  });

  const sourceHealth = calculateSourceHealth(sources, now);

  // 2. Fetch event counts
  const totalEvents = await db.event.count();
  const pendingReview = await db.event.count({ where: { status: 'pending' } });
  const rejectedCount = await db.event.count({ where: { status: 'rejected' } });

  // Upcoming approved events (endDate >= today OR (endDate is null and startDate >= today))
  const upcomingApproved = await db.event.count({
    where: {
      status: 'approved',
      OR: [
        { startDate: { gte: todayStr } },
        {
          AND: [
            { startDate: { lte: todayStr } },
            { endDate: { gte: todayStr } },
          ],
        },
      ],
    },
  });

  const pastEvents = Math.max(0, totalEvents - upcomingApproved - pendingReview - rejectedCount);

  // 3. Fetch active and pending events for quality evaluation
  const evaluationEvents = await db.event.findMany({
    where: {
      status: { in: ['approved', 'pending'] },
    },
    include: {
      source: { select: { handle: true } },
      feedbacks: { select: { type: true, reason: true } },
    },
    orderBy: { startDate: 'asc' },
    take: 300,
  });

  const quality = calculateQualityMetrics(evaluationEvents);

  // 4. Fetch all feedbacks for community helpfulness
  const allFeedbacks = await db.eventFeedback.findMany({
    select: { type: true, reason: true },
  });

  const community = calculateCommunityMetrics(allFeedbacks);

  // 5. Build flagged events list
  const flaggedEvents: FlaggedEventItem[] = [];
  for (const ev of evaluationEvents) {
    const evalResult = calculateAccuracyRating(ev);
    const reports = (ev.feedbacks || []).filter((f: any) => f.type === 'report_inaccurate');
    const likes = (ev.feedbacks || []).filter((f: any) => f.type === 'like').length;

    if (evalResult.flags.length > 0 || reports.length > 0 || evalResult.score < 80) {
      flaggedEvents.push({
        id: ev.id,
        title: ev.title,
        startDate: ev.startDate,
        location: ev.location,
        sourceHandle: ev.source?.handle || 'unknown',
        status: ev.status,
        confidence: ev.confidence,
        accuracyScore: evalResult.score,
        accuracyTier: evalResult.tier,
        flags: evalResult.flags,
        likes,
        reportCount: reports.length,
        reportReasons: reports.map((r: any) => r.reason).filter(Boolean),
      });
    }
  }

  // Sort flagged events: most reports first, then lowest accuracy
  flaggedEvents.sort((a, b) => b.reportCount - a.reportCount || a.accuracyScore - b.accuracyScore);

  // 6. Submissions status
  let submissionsSummary = {
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    recentSubmissions: [] as any[],
  };

  if (db.urlSubmission) {
    const totalSubs = await db.urlSubmission.count();
    const pendingSubs = await db.urlSubmission.count({ where: { status: 'pending' } });
    const completedSubs = await db.urlSubmission.count({ where: { status: 'completed' } });
    const failedSubs = await db.urlSubmission.count({ where: { status: 'failed' } });

    const recentSubs = await db.urlSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        rawUrl: true,
        status: true,
        extractedEventCount: true,
        createdAt: true,
        failureReason: true,
      },
    });

    submissionsSummary = {
      total: totalSubs,
      pending: pendingSubs,
      completed: completedSubs,
      failed: failedSubs,
      recentSubmissions: recentSubs.map((s: any) => ({
        id: s.id,
        rawUrl: s.rawUrl,
        status: s.status,
        extractedCount: s.extractedEventCount,
        createdAt: s.createdAt.toISOString(),
        error: s.failureReason,
      })),
    };
  }

  // 7. Calculate overall system status
  const recentRuns = getRecentIngestionRuns(15);
  const lowAccuracyRatio = quality.total > 0 ? quality.lowAccuracyCount / quality.total : 0;

  const status = calculateSystemStatus({
    recentRuns,
    staleSourcesCount: sourceHealth.stale,
    totalActiveSources: sourceHealth.active,
    pendingCount: pendingReview,
    lowAccuracyRatio,
  });

  return {
    systemStatus: status.level,
    statusMessage: status.message,
    evaluatedAt: now.toISOString(),
    events: {
      total: totalEvents,
      upcomingApproved,
      pendingReview,
      rejected: rejectedCount,
      pastEvents,
    },
    quality,
    community,
    sources: sourceHealth,
    submissions: submissionsSummary,
    recentRuns,
    flaggedEvents: flaggedEvents.slice(0, 20),
  };
}
