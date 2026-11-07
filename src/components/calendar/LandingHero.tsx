import Link from 'next/link';
import type { LandingPageConfig } from '@/lib/seo-landing-pages';

interface LandingHeroProps {
  config: LandingPageConfig;
}

export default function LandingHero({ config }: LandingHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-slate-900/40 to-indigo-950/40 p-6 sm:p-8 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition group"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">←</span>
          <span>View All Bay Area Activities</span>
        </Link>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto ${config.badgeColor}`}
        >
          {config.badge}
        </span>
      </div>

      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-3">
        {config.headline}
      </h1>

      <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed mb-6">
        {config.description}
      </p>

      {/* Helpful Trust Notes */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span>✨</span>
          <span>Verified Local Events</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>📅</span>
          <span>Updated Daily from 30+ Bay Area Creators</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>📍</span>
          <span>San Francisco · Peninsula · South Bay · East Bay</span>
        </div>
      </div>
    </div>
  );
}
