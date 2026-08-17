import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeInstagramAccount } from '@/lib/apify';
import { extractEventsFromPost } from '@/lib/openai';

export const dynamic = 'force-dynamic';

// POST /api/admin/ingest
// Manually triggers scraping and event extraction
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { handle, limit } = body;
    const scrapeLimit = limit && typeof limit === 'number' ? limit : 5;

    // Fetch sources to process
    let sources = [];
    if (handle) {
      const cleanHandle = handle.replace(/@/g, '').trim();
      const source = await prisma.source.findUnique({
        where: { handle: cleanHandle }
      });
      if (!source) {
        return NextResponse.json({ error: `Source not found for handle: ${cleanHandle}` }, { status: 404 });
      }
      sources = [source];
    } else {
      sources = await prisma.source.findMany({
        where: { isActive: true }
      });
    }

    if (sources.length === 0) {
      return NextResponse.json({ message: "No active sources found to scrape." });
    }

    const report: Array<{
      source: string;
      scrapedCount: number;
      processedCount: number;
      skippedCount: number;
      error?: string;
    }> = [];

    // Run sequentially to prevent hitting API rate limits or concurrent connection pool limits
    for (const source of sources) {
      let scrapedCount = 0;
      let processedCount = 0;
      let skippedCount = 0;

      try {
        // Scrape posts (using dynamic limit)
        const posts = await scrapeInstagramAccount(source.handle, scrapeLimit, 14);
        scrapedCount = posts.length;

        for (const post of posts) {
          // Check if post has already been processed (approved, pending, or rejected placeholder)
          const existingEvent = await prisma.event.findUnique({
            where: { rawPostUrl: post.url }
          });

          if (existingEvent) {
            skippedCount++;
            continue;
          }

          // Trigger extraction pipeline (which handles base64 image down-converts, vision parsing, and DB upserts)
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

        // Update lastScrapedAt timestamp
        await prisma.source.update({
          where: { id: source.id },
          data: { lastScrapedAt: new Date() }
        });

        report.push({
          source: source.handle,
          scrapedCount,
          processedCount,
          skippedCount
        });
      } catch (err) {
        console.error(`Error ingesting source ${source.handle}:`, err);
        report.push({
          source: source.handle,
          scrapedCount,
          processedCount,
          skippedCount,
          error: (err as Error).message
        });
      }
    }

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
