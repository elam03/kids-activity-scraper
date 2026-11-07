import type { Metadata } from 'next';
import Link from 'next/link';
import CalendarApp from '@/components/calendar/CalendarApp';
import { prisma } from '@/lib/prisma';
import { cleanHandle, formatInstagramUrl } from '@/lib/curator-utils';
import { getSiteUrl } from '@/lib/seo-utils';

interface CuratorPageProps {
  params: {
    handle: string;
  };
}

export const revalidate = 3600;

export async function generateMetadata({ params }: CuratorPageProps): Promise<Metadata> {
  const clean = cleanHandle(params.handle);
  const title = `Family Activities Curated by @${clean} | Little Days Out`;
  const description = `Explore upcoming kids activities, weekend family events, and outings recommended by @${clean} across the San Francisco Bay Area.`;
  const url = `${getSiteUrl()}/curators/${clean}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/curators/${clean}`,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Little Days Out',
      locale: 'en_US',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

async function getCuratorSource(handle: string) {
  const clean = cleanHandle(handle);
  try {
    const source = await prisma.source.findFirst({
      where: {
        OR: [
          { handle: clean },
          { handle: `@${clean}` },
        ],
      },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });
    return source;
  } catch {
    return null;
  }
}

export default async function CuratorDetailPage({ params }: CuratorPageProps) {
  const clean = cleanHandle(params.handle);
  const source = await getCuratorSource(clean);
  const displayName = source?.name || `@${clean}`;
  const totalEvents = source?._count?.events || 0;
  const instagramUrl = formatInstagramUrl(clean);

  const hero = (
    <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-slate-900/40 to-indigo-950/40 p-6 sm:p-8 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <Link
          href="/curators"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition group"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">←</span>
          <span>View All Curators</span>
        </Link>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30 bg-purple-500/10 text-purple-400 self-start sm:self-auto">
          🌟 Verified Curator
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-extrabold text-2xl shadow-lg shadow-violet-600/30 shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            {displayName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 font-semibold transition"
            >
              📸 @{clean} on Instagram
            </a>
            <span>•</span>
            <span>{totalEvents} activities curated</span>
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
        Showing upcoming Bay Area family activities and weekend events recommended by{' '}
        <strong className="text-white">@{clean}</strong>. Follow their Instagram for more daily inspiration.
      </p>
    </div>
  );

  return (
    <CalendarApp
      curatorFilter={clean}
      headerHero={hero}
    />
  );
}
