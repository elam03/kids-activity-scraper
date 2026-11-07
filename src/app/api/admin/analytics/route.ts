import { NextResponse } from 'next/server';
import { getTelemetrySummary } from '@/lib/telemetry';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const telemetry = getTelemetrySummary();

    let dbMetrics = {
      totalBookmarks: 0,
      totalLikes: 0,
      totalReports: 0,
    };

    try {
      const [bookmarksCount, likesAggregate, reportsCount] = await Promise.all([
        prisma.bookmark.count().catch(() => 0),
        prisma.event.aggregate({ _sum: { likes: true } }).catch(() => ({ _sum: { likes: 0 } })),
        prisma.eventFeedback.count({ where: { type: 'report_inaccurate' } }).catch(() => 0),
      ]);

      dbMetrics = {
        totalBookmarks: bookmarksCount,
        totalLikes: likesAggregate._sum.likes || 0,
        totalReports: reportsCount,
      };
    } catch {
      // Graceful degradation if database is unreachable during tests
    }

    return NextResponse.json({
      success: true,
      telemetry,
      dbMetrics,
      gaConfig: {
        measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-P4ZPYFWRLK',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
