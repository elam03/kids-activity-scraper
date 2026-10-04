import { prisma as defaultPrisma } from './prisma';
import { buildEventListJsonLd, type SeoEvent } from './seo-utils';

export interface PrismaEventForSeo {
  id: string;
  title: string;
  rawCaption?: string | null;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  cost?: string | null;
  isFree?: boolean;
  registrationUrl?: string | null;
  rawPostUrl?: string | null;
  source?: {
    name: string;
    handle?: string | null;
    url?: string | null;
  } | null;
}

/**
 * Transforms raw Prisma events with source into Schema.org ItemList JSON-LD.
 */
export function formatEventsToItemListJsonLd(events: PrismaEventForSeo[]) {
  const seoEvents: SeoEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.rawCaption,
    startDate: e.startDate,
    endDate: e.endDate,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    cost: e.cost,
    isFree: e.isFree,
    registrationUrl: e.registrationUrl,
    rawCaption: e.rawCaption,
    rawPostUrl: e.rawPostUrl,
    source: e.source
      ? {
          name: e.source.name,
          handle: e.source.handle,
          url: e.source.url,
        }
      : null,
  }));

  return buildEventListJsonLd(seoEvents);
}

/**
 * Fetches upcoming approved events from the database and returns ItemList JSON-LD.
 * Returns null if the database is unreachable or an error occurs.
 */
export async function getUpcomingEventsStructuredData(
  prismaClient: any = defaultPrisma,
  limit = 30
) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const events = await prismaClient.event.findMany({
      where: {
        status: 'approved',
        startDate: { gte: today },
      },
      include: {
        source: {
          select: {
            name: true,
            handle: true,
            url: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
      take: limit,
    });

    if (!events || events.length === 0) {
      return null;
    }

    return formatEventsToItemListJsonLd(events);
  } catch (err) {
    console.error('Graceful degradation: Failed to load upcoming events for JSON-LD:', err);
    return null;
  }
}
