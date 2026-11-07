import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { cleanHandle, formatCuratorStats } from '@/lib/curator-utils';
import { getSiteUrl } from '@/lib/seo-utils';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Bay Area Family Curators & Influencers | Little Days Out',
  description:
    'Discover the top local parents, educators, and Instagram creators curating kids activities, park outings, and weekend family fun across the SF Bay Area.',
  alternates: {
    canonical: '/curators',
  },
  openGraph: {
    title: 'Bay Area Family Curators & Influencers | Little Days Out',
    description:
      'Discover the top local parents, educators, and Instagram creators curating kids activities across the SF Bay Area.',
    url: `${getSiteUrl()}/curators`,
    siteName: 'Little Days Out',
    locale: 'en_US',
    type: 'website',
  },
};

async function getCurators() {
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

    return sources.map((s) => {
      const stats = formatCuratorStats({
        id: s.id,
        handle: s.handle,
        name: s.name,
        eventCount: s._count.events,
        upcomingCount: s.events.length,
        isActive: s.isActive,
      });

      return {
        id: s.id,
        handle: cleanHandle(s.handle),
        name: s.name,
        eventCount: s._count.events,
        upcomingCount: s.events.length,
        instagramUrl: stats.instagramUrl,
      };
    });
  } catch {
    return [];
  }
}

export default async function CuratorsDirectoryPage() {
  const curators = await getCurators();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 px-4 py-8 sm:px-6 lg:px-8 text-slate-100">
      <div className="mx-auto max-w-6xl w-full">
        {/* Top Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
          >
            <span>←</span>
            <span>Back to Full Calendar</span>
          </Link>
        </div>

        {/* Directory Header Hero */}
        <header className="rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-slate-900/40 to-indigo-950/40 p-6 sm:p-10 backdrop-blur-md shadow-2xl mb-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30 bg-purple-500/10 text-purple-400 mb-4">
            🌟 Verified Local Curators
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Bay Area Family Curators & Creators
          </h1>
          <p className="text-base text-slate-300 max-w-3xl leading-relaxed">
            Little Days Out indexes and credits local Bay Area parents, educators, and community organizations who explore and share the very best family activities. Explore each curator’s upcoming recommendations below.
          </p>
        </header>

        {/* Curators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {curators.map((curator) => (
            <div
              key={curator.id}
              className="group rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-violet-500/40 p-6 transition-all duration-300 flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-lg shadow-md shadow-violet-600/20">
                    {curator.name.charAt(0).toUpperCase()}
                  </div>
                  <a
                    href={curator.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-pink-400 transition"
                    title={`Visit @${curator.handle} on Instagram`}
                  >
                    <span>📸 @{curator.handle}</span>
                  </a>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-violet-300 transition mb-1">
                  {curator.name}
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Verified Bay Area Community Curator
                </p>

                <div className="flex items-center gap-3 text-xs mb-6">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">
                    {curator.eventCount} total activities
                  </span>
                  {curator.upcomingCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      {curator.upcomingCount} upcoming
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <Link
                  href={`/curators/${curator.handle}`}
                  className="w-full text-center px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition shadow-md shadow-violet-600/20"
                >
                  View Curated Activities →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {curators.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-medium">No verified curators loaded yet.</p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Little Days Out • Bay Area Curators Directory</p>
          <Link href="/" className="hover:text-slate-300 transition">
            Calendar Home
          </Link>
        </footer>
      </div>
    </div>
  );
}
