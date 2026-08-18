import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeInstagramAccount } from '@/lib/apify';
import { extractEventsFromPost } from '@/lib/openai';

export const dynamic = 'force-dynamic';

// Helper to calculate the adaptive interval based on the last 3 approved events
async function calculateAdaptiveInterval(sourceId: string): Promise<number> {
  const approvedEvents = await prisma.event.findMany({
    where: { sourceId, status: 'approved' },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  if (approvedEvents.length === 0) {
    return 48; // Default 48 hours for new/quiet channels
  }
  if (approvedEvents.length < 3) {
    return 24; // Default 24 hours if we don't have enough data
  }

  // Calculate gaps in hours
  const dates = approvedEvents.map(e => new Date(e.createdAt).getTime());
  const gap1 = (dates[0] - dates[1]) / (1000 * 60 * 60);
  const gap2 = (dates[1] - dates[2]) / (1000 * 60 * 60);
  const averageGap = (gap1 + gap2) / 2;

  // Set interval to 50% of the average gap
  // Limit to: min 6 hours, max 120 hours (5 days)
  const calculatedInterval = Math.max(6, Math.min(120, Math.round(averageGap * 0.5)));
  return calculatedInterval;
}

// GET or POST /api/cron/ingest
export async function GET(request: Request) {
  return handleCronTrigger(request);
}

export async function POST(request: Request) {
  return handleCronTrigger(request);
}

async function handleCronTrigger(request: Request) {
  try {
    // 1. Secure verification check
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get('secret');
    
    const authHeader = request.headers.get('authorization');
    const secretHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_PASSWORD || 'fr33SCRAPER';
    
    if (secretParam !== cronSecret && secretHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized cron trigger invocation' }, { status: 401 });
    }

    // 2. Fetch active sources
    const sources = await prisma.source.findMany({
      where: { isActive: true },
    });

    const report: Array<{
      source: string;
      scraped: boolean;
      intervalHours: number;
      scrapedCount?: number;
      processedCount?: number;
      skippedCount?: number;
      newIntervalHours?: number;
      error?: string;
    }> = [];

    // 3. Process each source if its interval has elapsed
    for (const source of sources) {
      const activeInterval = source.customIntervalHours ?? source.scrapeIntervalHours;
      const lastScraped = source.lastScrapedAt ? new Date(source.lastScrapedAt).getTime() : 0;
      const hoursSinceScrape = (Date.now() - lastScraped) / (1000 * 60 * 60);
      const isDue = hoursSinceScrape >= activeInterval;

      if (!isDue) {
        report.push({
          source: source.handle,
          scraped: false,
          intervalHours: activeInterval,
        });
        continue;
      }

      // Source is due: Scrape and extract
      let scrapedCount = 0;
      let processedCount = 0;
      let skippedCount = 0;

      try {
        // Scrape latest 5 posts by default for cron jobs
        const posts = await scrapeInstagramAccount(source.handle, 5, 14);
        scrapedCount = posts.length;

        for (const post of posts) {
          const existingEvent = await prisma.event.findUnique({
            where: { rawPostUrl: post.url },
          });

          if (existingEvent) {
            skippedCount++;
            continue;
          }

          await extractEventsFromPost(
            post.url,
            post.type,
            post.caption,
            post.displayUrl,
            post.childPosts,
            source.id
          );
          processedCount++;
        }

        // Recalculate adaptive interval
        const newInterval = await calculateAdaptiveInterval(source.id);

        // Update timestamps and intervals
        await prisma.source.update({
          where: { id: source.id },
          data: {
            lastScrapedAt: new Date(),
            scrapeIntervalHours: newInterval,
          },
        });

        report.push({
          source: source.handle,
          scraped: true,
          intervalHours: activeInterval,
          scrapedCount,
          processedCount,
          skippedCount,
          newIntervalHours: newInterval,
        });
      } catch (err) {
        console.error(`Cron scrape failed for @${source.handle}:`, err);
        report.push({
          source: source.handle,
          scraped: true,
          intervalHours: activeInterval,
          error: (err as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
