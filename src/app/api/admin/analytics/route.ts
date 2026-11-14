import { NextResponse } from 'next/server';
import { getTelemetrySummary } from '@/lib/telemetry';
import { prisma } from '@/lib/prisma';
import { getGa4CredentialsSummary, fetchGa4Overview, fetchGa4Realtime } from '@/lib/ga4-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const telemetry = getTelemetrySummary();
    const ga4Summary = getGa4CredentialsSummary();

    let ga4Data: any = null;
    if (ga4Summary.configured) {
      try {
        const [overview, realtime] = await Promise.all([
          fetchGa4Overview(7),
          fetchGa4Realtime(),
        ]);
        ga4Data = { overview, realtime };
      } catch (err) {
        console.error('GA4 API fetch error in admin analytics route:', err);
      }
    }

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
        propertyId: ga4Summary.propertyId,
        isApiConfigured: ga4Summary.configured,
        summary: ga4Summary,
        data: ga4Data,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
