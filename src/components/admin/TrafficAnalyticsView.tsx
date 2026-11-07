'use client';

import { useState, useEffect } from 'react';
import type { TelemetrySummary, TrackedEventItem, TicketDomainItem } from '@/lib/telemetry';

interface TrafficAnalyticsViewProps {
  activeTheme: any;
}

interface AnalyticsApiResponse {
  success: boolean;
  telemetry: TelemetrySummary;
  dbMetrics: {
    totalBookmarks: number;
    totalLikes: number;
    totalReports: number;
  };
  gaConfig: {
    measurementId: string;
  };
}

export default function TrafficAnalyticsView({ activeTheme }: TrafficAnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/analytics');
      if (!res.ok) {
        throw new Error(`Failed to load analytics (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || 'Failed to retrieve analytics payload');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className={`mt-3 text-sm font-medium ${activeTheme.textMuted}`}>
          Aggregating parent traffic & engagement metrics...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`p-6 rounded-2xl border ${activeTheme.card} text-center space-y-4`}>
        <div className="text-rose-500 text-3xl">⚠️</div>
        <h3 className={`text-base font-bold ${activeTheme.textHeading}`}>
          Unable to Load Traffic Analytics
        </h3>
        <p className={`text-sm ${activeTheme.textMuted}`}>{error || 'Unknown error occurred.'}</p>
        <button
          onClick={() => fetchAnalytics(true)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border ${activeTheme.navBtn}`}
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const { telemetry, dbMetrics, gaConfig } = data;

  // Calculate age group percentages for demand bar
  const totalAgeFilterActions = Object.values(telemetry.ageGroupDemand).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-5 rounded-2xl border ${activeTheme.card} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-xl">
            📈
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-tight ${activeTheme.textHeading}`}>
              Parent Traffic & Commercial Intent Analytics
            </h2>
            <p className={`text-xs ${activeTheme.textMuted} mt-0.5`}>
              First-party telemetry tracking high-intent parent behavior, outbound ticket conversions, and demand patterns.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${activeTheme.navBtn}`}
          >
            <svg
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh Stats'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Event Views */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Activity Views</span>
            <span className="text-base">👀</span>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-extrabold ${activeTheme.textHeading}`}>
              {telemetry.totalViews}
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              Detail modals opened by parents
            </div>
          </div>
        </div>

        {/* Card 2: Outbound Ticket Clicks */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Ticket Clicks</span>
            <span className="text-base">🎟️</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-emerald-500">
              {telemetry.totalTicketClicks}
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              Direct intent to register / buy
            </div>
          </div>
        </div>

        {/* Card 3: Outbound CTR */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Booking CTR</span>
            <span className="text-base">⚡</span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-extrabold ${telemetry.outboundCtr >= 20 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {telemetry.outboundCtr}%
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {telemetry.outboundCtr >= 20 ? 'High' : 'Normal'}
              </span>
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              Ticket clicks / event views
            </div>
          </div>
        </div>

        {/* Card 4: Creator Referrals */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Creator Clicks</span>
            <span className="text-base">📸</span>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-extrabold ${activeTheme.textHeading}`}>
              {telemetry.totalSourceClicks}
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              Referrals to original Instagram posts
            </div>
          </div>
        </div>

        {/* Card 5: Bookmarks & Likes */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between col-span-2 lg:col-span-1`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Saved Bookmarks</span>
            <span className="text-base">⭐</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-amber-500">
              {dbMetrics.totalBookmarks}
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              {dbMetrics.totalLikes} likes recorded
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Top Events (Left) & Audience Demand (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Top Performing Events */}
        <div className={`lg:col-span-2 rounded-2xl border ${activeTheme.card} overflow-hidden flex flex-col justify-between`}>
          <div className="px-5 py-4 border-b border-slate-800/40 flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-bold ${activeTheme.textHeading}`}>
                Most Viewed & Clicked Activities
              </h3>
              <p className={`text-xs ${activeTheme.textMuted}`}>
                High-intent activities attracting the most parent attention.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">Top 10</span>
          </div>

          {telemetry.topEvents.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-3xl">🎯</span>
              <p className={`mt-2 text-sm font-medium ${activeTheme.textMuted}`}>
                No event view events captured yet.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Views and ticket clicks will appear as parents browse the calendar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={activeTheme.tableHeader}>
                  <tr>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Views</th>
                    <th className="px-4 py-3 text-right">Ticket Clicks</th>
                    <th className="px-4 py-3 text-right">Conversion</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${activeTheme.tableDivide}`}>
                  {telemetry.topEvents.map((ev: TrackedEventItem) => {
                    const ctr = ev.views > 0 ? Math.round((ev.ticketClicks / ev.views) * 100) : 0;
                    return (
                      <tr key={ev.eventId} className={activeTheme.tableRowHover}>
                        <td className="px-4 py-3">
                          <div className={`font-semibold ${activeTheme.tableText} line-clamp-1`}>
                            {ev.title}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                            {ev.category || 'general'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-300">
                          {ev.views}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400">
                          {ev.ticketClicks}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ctr > 0
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {ctr}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Audience Demand & Commercial Outbound Destinations */}
        <div className="space-y-6">
          {/* Age Group Demand Card */}
          <div className={`p-5 rounded-2xl border ${activeTheme.card} space-y-4`}>
            <div>
              <h3 className={`text-sm font-bold ${activeTheme.textHeading}`}>
                Audience Age Demand
              </h3>
              <p className={`text-xs ${activeTheme.textMuted}`}>
                Which age groups parents are actively filtering for.
              </p>
            </div>

            {totalAgeFilterActions === 0 ? (
              <p className="text-xs text-slate-500 italic">No filter actions recorded yet.</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {Object.entries(telemetry.ageGroupDemand)
                  .sort(([, a], [, b]) => b - a)
                  .map(([group, count]) => {
                    const pct = Math.round((count / totalAgeFilterActions) * 100);
                    return (
                      <div key={group} className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="capitalize text-slate-300">{group}</span>
                          <span className="text-slate-400">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Outbound Ticket Domains Card */}
          <div className={`p-5 rounded-2xl border ${activeTheme.card} space-y-4`}>
            <div>
              <h3 className={`text-sm font-bold ${activeTheme.textHeading}`}>
                Commercial Ticket Outlets
              </h3>
              <p className={`text-xs ${activeTheme.textMuted}`}>
                Top external ticket providers receiving traffic.
              </p>
            </div>

            {telemetry.topTicketDomains.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No outbound ticket clicks recorded yet.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {telemetry.topTicketDomains.map((d: TicketDomainItem) => (
                  <div key={d.domain} className="flex items-center justify-between py-1 border-b border-slate-800/40">
                    <span className="font-medium text-slate-200 truncate max-w-[180px]">
                      {d.domain}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400">
                      {d.clicks} clicks
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External Macro Analytics Quick Links */}
          <div className={`p-5 rounded-2xl border ${activeTheme.card} space-y-3`}>
            <div>
              <h3 className={`text-sm font-bold ${activeTheme.textHeading}`}>
                External Search & Web Analytics
              </h3>
              <p className={`text-xs ${activeTheme.textMuted}`}>
                Quick diagnostic links for sessions and Google Search rankings.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href="https://analytics.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full text-center py-2 px-3 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn}`}
              >
                📊 Open Google Analytics 4 ({gaConfig.measurementId}) &rarr;
              </a>
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full text-center py-2 px-3 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn}`}
              >
                🔍 Open Google Search Console &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
