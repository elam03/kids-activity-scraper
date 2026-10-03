import { prisma } from './prisma';
import { JevClient } from './jev';
import { scrapeWebPage } from './web-scraper';
import { ingestEvent } from './event-ingestion';

export interface ProcessSubmissionOptions {
  db?: any;
  jevClient?: JevClient;
  scraper?: typeof scrapeWebPage;
  ingestFn?: typeof ingestEvent;
  sourceId?: string;
}

export interface ProcessSubmissionResult {
  submissionId: string;
  status: 'completed' | 'rejected' | 'failed';
  extractedEventCount: number;
  error?: string;
}

/**
 * Returns or provisions the default Source entity for community and URL submissions.
 */
export async function getOrCreateSubmissionSource(db: any = prisma): Promise<string> {
  const existing = await db.source.findUnique({
    where: { handle: 'community_submissions' },
  });

  if (existing) {
    return existing.id;
  }

  const created = await db.source.create({
    data: {
      handle: 'community_submissions',
      name: 'Community Submissions',
      isActive: false, // Inactive for periodic Instagram scraper cron
      scrapeIntervalHours: 9999,
    },
  });

  return created.id;
}

/**
 * Processes a queued UrlSubmission through Gate 2 scraper routing,
 * cascading web scraping, and multi-event unbundling.
 */
export async function processUrlSubmission(
  submissionId: string,
  options: ProcessSubmissionOptions = {}
): Promise<ProcessSubmissionResult> {
  const db = options.db || prisma;
  const jev = options.jevClient || new JevClient();
  const scraper = options.scraper || scrapeWebPage;
  const ingest = options.ingestFn || ingestEvent;

  // 1. Fetch submission
  const submission = await db.urlSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    throw new Error(`UrlSubmission with id ${submissionId} not found`);
  }

  // 2. Mark as processing
  await db.urlSubmission.update({
    where: { id: submissionId },
    data: { status: 'processing' },
  });

  try {
    const sourceId = options.sourceId || (await getOrCreateSubmissionSource(db));

    // 3. Gate 2: Route scraper
    const routeResult = await jev.routeScraper(submission.rawUrl);

    if (routeResult.route === 'image') {
      // Direct flyer image submission
      await ingest(sourceId, {
        postUrl: submission.rawUrl,
        images: [submission.rawUrl],
        submissionId: submission.id,
      }, { db, jevClient: jev });
    } else {
      // Direct HTTP fetch or Apify crawler fallback
      const scraped = await scraper(submission.rawUrl, {
        forceCrawler: routeResult.route === 'crawler',
      });

      if (scraped.tier === 'jsonld' && scraped.events && scraped.events.length > 0) {
        await ingest(sourceId, {
          postUrl: submission.rawUrl,
          caption: scraped.title,
          extractedEvents: scraped.events,
          submissionId: submission.id,
        }, { db, jevClient: jev });
      } else {
        await ingest(sourceId, {
          postUrl: submission.rawUrl,
          caption: scraped.text || scraped.title,
          submissionId: submission.id,
        }, { db, jevClient: jev });
      }
    }

    // 4. Retrieve final status after ingestion completed
    const finalSub = await db.urlSubmission.findUnique({
      where: { id: submissionId },
    });

    return {
      submissionId,
      status: (finalSub?.status as 'completed' | 'rejected' | 'failed') || 'completed',
      extractedEventCount: finalSub?.extractedEventCount || 0,
    };
  } catch (err: any) {
    console.error(`Failed to process UrlSubmission ${submissionId}:`, err);

    await db.urlSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'failed',
        failureReason: err.message || 'Scraping or ingestion failed',
        processedAt: new Date(),
      },
    });

    return {
      submissionId,
      status: 'failed',
      extractedEventCount: 0,
      error: err.message,
    };
  }
}
