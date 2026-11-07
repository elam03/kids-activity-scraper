import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanHandle, formatCuratorStats } from '@/lib/curator-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const sources = await prisma.source.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
        events: {
          where: {
            status: 'approved',
            startDate: { gte: today },
          },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const curators = sources.map((s) => {
      const stats = formatCuratorStats({
        id: s.id,
        handle: s.handle,
        name: s.name,
        eventCount: s._count.events,
        upcomingCount: s.events.length,
        isActive: s.isActive,
        lastScrapedAt: s.lastScrapedAt,
      });

      return {
        id: s.id,
        handle: cleanHandle(s.handle),
        name: s.name,
        eventCount: s._count.events,
        upcomingCount: s.events.length,
        instagramUrl: stats.instagramUrl,
        lastScrapedAt: s.lastScrapedAt,
      };
    });

    return NextResponse.json({ success: true, curators });
  } catch (error) {
    // Graceful degradation
    return NextResponse.json(
      { success: true, curators: [] },
      { status: 200 }
    );
  }
}
