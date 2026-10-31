'use client';

import { useState, useEffect } from 'react';
import type { PipelineHealthSummary, FlaggedEventItem, IngestionRunRecord, SourceStatusItem } from '@/lib/pipeline-monitor';

interface MonitoringDashboardProps {
  activeTheme: any;
  onNavigateToTab?: (tab: 'sources' | 'url_ingestion' | 'events') => void;
}

export default function MonitoringDashboard({
  activeTheme,
  onNavigateToTab,
}: MonitoringDashboardProps) {
  const [data, setData] = useState<PipelineHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'quality' | 'sources' | 'runs' | 'alerts'>('overview');
  const [flagFilter, setFlagFilter] = useState<string>('all');
  const [testingAlert, setTestingAlert] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestAlert = async (channel: 'both' | 'discord' | 'email') => {
    setTestingAlert(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });
      const json = await res.json();
      if (json.success) {
        const parts: string[] = [];
        if (json.result?.discord?.success) parts.push('✅ Discord webhook delivered');
        else if (json.result?.discord?.error) parts.push(`❌ Discord: ${json.result.discord.error}`);

        if (json.result?.email?.success) parts.push('✅ Email sent');
        else if (json.result?.email?.skipped) parts.push('ℹ️ Email skipped (RESEND_API_KEY / recipient not set)');
        else if (json.result?.email?.error) parts.push(`❌ Email: ${json.result.email.error}`);

        setTestResult({ success: true, message: parts.join(' · ') });
      } else {
        setTestResult({ success: false, message: json.error || 'Test alert failed' });
      }
    } catch (err) {
      setTestResult({ success: false, message: (err as Error).message });
    } finally {
      setTestingAlert(false);
    }
  };

  const fetchHealthData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/monitoring');
      if (!res.ok) {
        throw new Error(`Failed to fetch monitoring metrics (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Invalid monitoring response payload');
      }
    } catch (err) {
      console.error('Monitoring fetch error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Degraded
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            Critical Issues
          </span>
        );
    }
  };

  const getAccuracyTierBadge = (tier: 'High' | 'Medium' | 'Low', score: number) => {
    if (tier === 'High') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          High ({score}%)
        </span>
      );
    }
    if (tier === 'Medium') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Medium ({score}%)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        Low ({score}%)
      </span>
    );
  };

  const formatRelativeTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${Math.max(1, diffMins)}m ago`;
    }
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className={`mt-3 text-sm font-medium ${activeTheme.textMuted}`}>
          Inspecting scraper health & data quality...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`p-6 rounded-2xl border ${activeTheme.card} text-center space-y-4`}>
        <div className="text-rose-500 text-3xl">⚠️</div>
        <h3 className={`text-base font-bold ${activeTheme.textHeading}`}>
          Unable to Load Monitoring Metrics
        </h3>
        <p className={`text-sm ${activeTheme.textMuted}`}>{error || 'Unknown error occurred.'}</p>
        <button
          onClick={() => fetchHealthData(true)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border ${activeTheme.navBtn}`}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const filteredFlaggedEvents = flagFilter === 'all'
    ? data.flaggedEvents
    : data.flaggedEvents.filter((e) =>
        flagFilter === 'reports' ? e.reportCount > 0 : e.flags.includes(flagFilter)
      );

  return (
    <div className="space-y-6">
      {/* Top Health Status Banner */}
      <div className={`p-5 rounded-2xl border ${activeTheme.card} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-3.5">
          {getStatusBadge(data.systemStatus)}
          <div>
            <h2 className={`text-base font-bold tracking-tight ${activeTheme.textHeading}`}>
              {data.statusMessage}
            </h2>
            <p className={`text-xs ${activeTheme.textMuted} mt-0.5`}>
              Last evaluated {formatRelativeTime(data.evaluatedAt)} ({new Date(data.evaluatedAt).toLocaleTimeString()})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchHealthData(true)}
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
            <span>{refreshing ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Live Approved Events */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Live on Calendar</span>
            <span className="text-base">📅</span>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-extrabold ${activeTheme.textHeading}`}>
              {data.events.upcomingApproved}
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              {data.events.total} total in database
            </div>
          </div>
        </div>

        {/* Card 2: Pending Review Queue */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Pending Review</span>
            <span className="text-base">⏳</span>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-extrabold ${data.events.pendingReview > 0 ? 'text-amber-500' : activeTheme.textHeading}`}>
              {data.events.pendingReview}
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              {data.events.pendingReview > 0 ? 'Awaiting moderation' : 'Queue all clear'}
            </div>
          </div>
        </div>

        {/* Card 3: Data Accuracy Score */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Accuracy Score</span>
            <span className="text-base">🎯</span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-extrabold ${data.quality.averageScore >= 85 ? 'text-emerald-500' : data.quality.averageScore >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                {data.quality.averageScore}%
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {data.quality.averageScore >= 85 ? 'High' : 'Fair'}
              </span>
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              {data.quality.highAccuracyCount} high · {data.quality.mediumAccuracyCount} med · {data.quality.lowAccuracyCount} low
            </div>
          </div>
        </div>

        {/* Card 4: Community Helpfulness */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Helpfulness</span>
            <span className="text-base">👍</span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-extrabold ${data.community.helpfulnessRatio >= 90 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {data.community.helpfulnessRatio}%
              </span>
              <span className="text-xs font-semibold text-slate-400">positive</span>
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              {data.community.totalLikes} likes · {data.community.totalReports} reports
            </div>
          </div>
        </div>

        {/* Card 5: Sources & Channels */}
        <div className={`p-4 rounded-xl border ${activeTheme.card} flex flex-col justify-between col-span-2 lg:col-span-1`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Active Sources</span>
            <span className="text-base">📡</span>
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-extrabold ${activeTheme.textHeading}`}>
              {data.sources.active} <span className="text-sm font-normal text-slate-400">/ {data.sources.total}</span>
            </div>
            <div className={`text-[11px] ${activeTheme.textMuted} mt-0.5`}>
              {data.sources.dueForScrape} due · {data.sources.stale} stale (&gt;7d)
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Overview/Quality vs Sources vs Ingestion Runs */}
      <div className={`border-b ${activeTheme.border} flex gap-5 overflow-x-auto text-sm font-semibold`}>
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`py-3 border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'overview' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
          }`}
        >
          Quality Audit & Flagged Events ({data.flaggedEvents.length})
        </button>
        <button
          onClick={() => setActiveSubTab('sources')}
          className={`py-3 border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'sources' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
          }`}
        >
          Source Freshness ({data.sources.total})
        </button>
        <button
          onClick={() => setActiveSubTab('runs')}
          className={`py-3 border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'runs' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
          }`}
        >
          Ingestion Run Logs ({data.recentRuns.length})
        </button>
        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`py-3 border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'alerts' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
          }`}
        >
          🔔 Notification Channels & Alerts
        </button>
      </div>

      {/* SUB-VIEW 1: Overview & Quality Audit */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Quality Distribution Bar & Issue Badges */}
          <div className={`p-5 rounded-2xl border ${activeTheme.card} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className={`text-sm font-bold ${activeTheme.textHeading}`}>
                  Data Quality & Parsing Integrity
                </h3>
                <p className={`text-xs ${activeTheme.textMuted}`}>
                  Evaluates date formats, geocoded locations, duration sanity, and community complaints.
                </p>
              </div>

              {/* Accuracy Bar Breakdown */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  High: {data.quality.highAccuracyCount}
                </span>
                <span className="flex items-center gap-1.5 text-amber-500">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Med: {data.quality.mediumAccuracyCount}
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Low: {data.quality.lowAccuracyCount}
                </span>
              </div>
            </div>

            {/* Quality Flag Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/40">
              <span className={`text-xs font-semibold ${activeTheme.textMuted}`}>Filter by Issue:</span>
              <button
                onClick={() => setFlagFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  flagFilter === 'all'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                All Issues ({data.flaggedEvents.length})
              </button>
              {data.community.totalReports > 0 && (
                <button
                  onClick={() => setFlagFilter('reports')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    flagFilter === 'reports'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  Reported Inaccurate ({data.community.totalReports})
                </button>
              )}
              {Object.entries(data.quality.flagsBreakdown).map(([flag, count]) => (
                <button
                  key={flag}
                  onClick={() => setFlagFilter(flag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    flagFilter === flag
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {flag} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Flagged Events Audit Table */}
          <div className={`rounded-2xl border ${activeTheme.card} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-slate-800/40 flex items-center justify-between">
              <h3 className={`text-sm font-bold ${activeTheme.textHeading}`}>
                Events Needing Attention ({filteredFlaggedEvents.length})
              </h3>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('events')}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
                >
                  Open Full Review Queue &rarr;
                </button>
              )}
            </div>

            {filteredFlaggedEvents.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-3xl">🎉</span>
                <p className={`mt-2 text-sm font-medium ${activeTheme.textMuted}`}>
                  No data quality issues found in this filter view.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={activeTheme.tableHeader}>
                    <tr>
                      <th className="px-4 py-3">Event Title & Source</th>
                      <th className="px-4 py-3">Date & Location</th>
                      <th className="px-4 py-3">Accuracy</th>
                      <th className="px-4 py-3">Detected Flags</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${activeTheme.tableDivide}`}>
                    {filteredFlaggedEvents.map((ev: FlaggedEventItem) => (
                      <tr key={ev.id} className={activeTheme.tableRowHover}>
                        <td className="px-4 py-3">
                          <div className={`font-semibold ${activeTheme.tableText}`}>{ev.title}</div>
                          <div className={`text-[11px] ${activeTheme.tableMuted}`}>@{ev.sourceHandle}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={activeTheme.tableText}>{ev.startDate}</div>
                          <div className={`text-[11px] ${activeTheme.tableMuted}`}>
                            {ev.location || <span className="text-amber-500 font-medium">Missing location</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getAccuracyTierBadge(ev.accuracyTier, ev.accuracyScore)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {ev.reportCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                🚨 {ev.reportCount} report{ev.reportCount > 1 ? 's' : ''} ({ev.reportReasons.join(', ') || 'inaccurate'})
                              </span>
                            )}
                            {ev.flags.map((flag) => (
                              <span
                                key={flag}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ev.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Source Freshness */}
      {activeSubTab === 'sources' && (
        <div className={`rounded-2xl border ${activeTheme.card} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-slate-800/40 flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-bold ${activeTheme.textHeading}`}>
                Instagram Sources & Scrape Schedules
              </h3>
              <p className={`text-xs ${activeTheme.textMuted}`}>
                Monitors adaptive intervals, last scraped timestamps, and live event yield per channel.
              </p>
            </div>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('sources')}
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
              >
                Manage Sources & Ingestion &rarr;
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={activeTheme.tableHeader}>
                <tr>
                  <th className="px-4 py-3">Source Channel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Scraped</th>
                  <th className="px-4 py-3">Interval</th>
                  <th className="px-4 py-3">Schedule State</th>
                  <th className="px-4 py-3">Live Yield</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${activeTheme.tableDivide}`}>
                {data.sources.sourceStatuses.map((s: SourceStatusItem) => (
                  <tr key={s.id} className={activeTheme.tableRowHover}>
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${activeTheme.tableText}`}>@{s.handle}</div>
                      <div className={`text-[11px] ${activeTheme.tableMuted}`}>{s.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={activeTheme.tableText}>{formatRelativeTime(s.lastScrapedAt)}</div>
                      {s.lastScrapedAt && (
                        <div className={`text-[10px] ${activeTheme.tableMuted}`}>
                          {new Date(s.lastScrapedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-300">{s.scrapeIntervalHours}h</span>
                    </td>
                    <td className="px-4 py-3">
                      {s.isStale ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          ⚠️ Stale (&gt;7d)
                        </span>
                      ) : s.isDue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Due for Scrape
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/60 text-slate-400">
                          Fresh
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-emerald-400">{s.approvedCount} approved</span>
                      {s.pendingCount > 0 && (
                        <span className="ml-2 font-medium text-amber-400">({s.pendingCount} pending)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Ingestion Run Logs */}
      {activeSubTab === 'runs' && (
        <div className={`rounded-2xl border ${activeTheme.card} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-slate-800/40">
            <h3 className={`text-sm font-bold ${activeTheme.textHeading}`}>
              Recent Pipeline Execution Logs
            </h3>
            <p className={`text-xs ${activeTheme.textMuted}`}>
              Shows live execution duration, posts scanned, events extracted, and failures across cron sweeps and manual triggers.
            </p>
          </div>

          {data.recentRuns.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-3xl">📡</span>
              <p className={`mt-2 text-sm font-medium ${activeTheme.textMuted}`}>
                No recorded ingestion runs in this session yet.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Runs will appear automatically when the cron executes or when a manual scrape is triggered.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={activeTheme.tableHeader}>
                  <tr>
                    <th className="px-4 py-3">Trigger & Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Time & Duration</th>
                    <th className="px-4 py-3">Posts Scanned</th>
                    <th className="px-4 py-3">Events Created</th>
                    <th className="px-4 py-3">Skipped / Dupes</th>
                    <th className="px-4 py-3">Details / Errors</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${activeTheme.tableDivide}`}>
                  {data.recentRuns.map((r: IngestionRunRecord) => (
                    <tr key={r.id} className={activeTheme.tableRowHover}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-200">
                          {r.sourceHandle ? `@${r.sourceHandle}` : 'Sweep'}
                        </div>
                        <div className={`text-[10px] uppercase font-bold text-slate-400`}>
                          {r.trigger}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={activeTheme.tableText}>{formatRelativeTime(r.startedAt)}</div>
                        <div className={`text-[10px] ${activeTheme.tableMuted}`}>
                          {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-300">{r.postsScraped}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-400">+{r.eventsCreated}</td>
                      <td className="px-4 py-3 text-slate-400">{r.eventsSkipped}</td>
                      <td className="px-4 py-3 max-w-xs truncate">
                        {r.error ? (
                          <span className="text-rose-400 font-medium">{r.error}</span>
                        ) : (
                          <span className="text-slate-500">Completed normally</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: Notifications & Alerts */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-6">
          {/* Dispatcher Overview Banner */}
          <div className={`p-5 rounded-2xl border ${activeTheme.card} space-y-2`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔔</span>
              <h3 className={`text-base font-bold ${activeTheme.textHeading}`}>
                Two-Tier Notification Dispatcher
              </h3>
            </div>
            <p className={`text-xs ${activeTheme.textMuted} leading-relaxed`}>
              Designed for a low-touch, once-or-twice-a-week founder workflow. Routine briefings are posted to your private Discord channel, while urgent exceptions send a direct email to guarantee attention.
            </p>
          </div>

          {/* Two-Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tier 1: Discord Channel */}
            <div className={`p-5 rounded-2xl border ${activeTheme.card} flex flex-col justify-between space-y-4`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <span className="text-lg">💬</span> Private Discord Channel
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    Tier 1 · Routine
                  </span>
                </div>
                <p className={`text-xs ${activeTheme.textMuted} leading-relaxed`}>
                  Scheduled for <strong>Thursday at 8:00 AM</strong> ahead of the weekend planning rush. Delivers a concise snapshot of active events and items awaiting review for you and Megha.
                </p>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] space-y-1">
                  <div className="text-slate-400"><strong>Channel:</strong> Private #kids-calendar-ops</div>
                  <div className="text-slate-400"><strong>Environment Variable:</strong> <code className="text-violet-400">DISCORD_WEBHOOK_URL</code></div>
                  <div className="text-slate-400"><strong>Mentions:</strong> @here on critical alerts only</div>
                </div>
              </div>

              <button
                onClick={() => handleTestAlert('discord')}
                disabled={testingAlert}
                className={`w-full py-2 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn}`}
              >
                {testingAlert ? 'Dispatching...' : 'Test Discord Webhook'}
              </button>
            </div>

            {/* Tier 2: Email Alert */}
            <div className={`p-5 rounded-2xl border ${activeTheme.card} flex flex-col justify-between space-y-4`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <span className="text-lg">📥</span> Direct Email Alerts
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Tier 2 · High Priority
                  </span>
                </div>
                <p className={`text-xs ${activeTheme.textMuted} leading-relaxed`}>
                  Triggered immediately for urgent exceptions: <strong>consecutive scraper failures</strong>, <strong>parent cancellation reports</strong>, or broken API keys.
                </p>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] space-y-1">
                  <div className="text-slate-400"><strong>Service:</strong> Resend REST API (3,000 free/mo)</div>
                  <div className="text-slate-400"><strong>Environment Variables:</strong> <code className="text-amber-400">RESEND_API_KEY</code>, <code className="text-amber-400">ALERT_EMAIL_RECIPIENT</code></div>
                  <div className="text-slate-400"><strong>Action:</strong> One-click links straight to the flagged event</div>
                </div>
              </div>

              <button
                onClick={() => handleTestAlert('email')}
                disabled={testingAlert}
                className={`w-full py-2 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn}`}
              >
                {testingAlert ? 'Dispatching...' : 'Test Email Alert'}
              </button>
            </div>
          </div>

          {/* Test Feedback Message */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs font-semibold ${
                testResult.success
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {testResult.message}
            </div>
          )}

          {/* Trigger Both Test */}
          <div className={`p-4 rounded-2xl border ${activeTheme.card} flex flex-col sm:flex-row items-center justify-between gap-3`}>
            <div>
              <div className={`text-xs font-bold ${activeTheme.textHeading}`}>
                Full Two-Tier Verification
              </div>
              <div className={`text-[11px] ${activeTheme.textMuted}`}>
                Dispatches a test payload to both Discord and Email simultaneously.
              </div>
            </div>
            <button
              onClick={() => handleTestAlert('both')}
              disabled={testingAlert}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition shadow-sm"
            >
              {testingAlert ? 'Testing Delivery...' : '🧪 Test Both Channels'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
