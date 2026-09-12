'use client';

import { useState, useEffect } from 'react';

export interface Source {
  id: string;
  handle: string;
  name: string;
  lastScrapedAt: string | null;
  scrapeIntervalHours: number;
  customIntervalHours: number | null;
  isActive: boolean;
  events?: Array<{
    id: string;
    title: string;
    rawPostUrl: string;
    status: string;
    createdAt: string;
  }>;
}

export interface IngestReport {
  source: string;
  scrapedCount: number;
  processedCount: number;
  skippedCount: number;
  error?: string;
}

export interface SourcesManagerProps {
  activeTheme: any;
}

export default function SourcesManager({ activeTheme }: SourcesManagerProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [newHandle, setNewHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [scrapingSourceId, setScrapingSourceId] = useState<string | null>(null);
  const [selectedSourceForHistory, setSelectedSourceForHistory] = useState<Source | null>(null);
  const [report, setReport] = useState<IngestReport[] | null>(null);
  const [statusLog, setStatusLog] = useState<string>('');
  const [apifyBilling, setApifyBilling] = useState<any | null>(null);

  const fetchApifyBilling = async () => {
    try {
      const res = await fetch('/api/admin/billing');
      if (res.ok) {
        const data = await res.json();
        setApifyBilling(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/admin/sources');
      const data = await res.json();
      setSources(data.sources || []);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    }
  };

  useEffect(() => {
    fetchSources();
    fetchApifyBilling();
  }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle) return;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: newHandle, name: newHandle }),
      });
      if (res.ok) {
        setNewHandle('');
        await fetchSources();
      }
    } catch (err) {
      console.error('Failed to add source:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSingleSourceIngest = async (sourceId: string, handle: string, limit: number = 5) => {
    setScrapingSourceId(sourceId);
    setReport(null);
    setStatusLog(`Initializing single channel scrape for @${handle} (limit: ${limit})...\nConnecting to Apify endpoint...\n`);

    try {
      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, limit }),
      });
      const data = await res.json();

      if (data.success) {
        setReport(data.report);
        setStatusLog(`Single channel scrape for @${handle} completed successfully.\n`);
        await fetchSources(); // refresh timestamps
      } else {
        setStatusLog(`Error: ${data.error || 'Ingestion failed'}\n`);
      }
    } catch (err) {
      setStatusLog(`Connection failed: ${(err as Error).message}\n`);
    } finally {
      setScrapingSourceId(null);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scraping source?')) return;
    try {
      const res = await fetch(`/api/admin/sources?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchSources();
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const updateSourceInterval = async (id: string, intervalValue: string) => {
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          customIntervalHours: intervalValue === 'auto' ? 'auto' : Number(intervalValue),
        }),
      });
      if (res.ok) {
        await fetchSources();
      }
    } catch (err) {
      console.error('Failed to update source interval:', err);
    }
  };

  const handleCleanAndRescrape = async (id: string, handle: string) => {
    if (!confirm(`Are you sure you want to delete all scraped events for @${handle} and trigger a fresh deep scrape?`)) {
      return;
    }

    setReport(null);
    setStatusLog(`Flushing scraped events history for @${handle}...\n`);

    try {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flush', id }),
      });

      if (res.ok) {
        setStatusLog((prev) => prev + `History flushed successfully. Triggering deep scrape...\n`);
        await triggerSingleSourceIngest(id, handle, 20);
      } else {
        const data = await res.json();
        setStatusLog(`Error flushing history: ${data.error || 'Request failed'}\n`);
      }
    } catch (err) {
      console.error('Failed to flush and rescrape:', err);
      setStatusLog(`Connection failed: ${(err as Error).message}\n`);
    }
  };

  const triggerIngest = async () => {
    setIngesting(true);
    setReport(null);
    setStatusLog('Initializing scraper pipeline for all channels (limit: 5)...\nConnecting to Apify endpoint...\n');

    try {
      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5 }),
      });
      const data = await res.json();

      if (data.success) {
        setReport(data.report);
        setStatusLog((prev) => prev + 'Ingestion completed successfully.\n');
        await fetchSources(); // refresh scraped timestamps
      } else {
        setStatusLog((prev) => prev + `Error: ${data.error || 'Ingestion failed'}\n`);
      }
    } catch (err) {
      setStatusLog((prev) => prev + `Connection failed: ${(err as Error).message}\n`);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Sources Configuration */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`rounded-2xl border p-6 shadow-md ${activeTheme.card}`}>
            <h2 className={`text-lg font-semibold mb-4 ${activeTheme.textHeading}`}>Scraping Sources</h2>

            {sources.length === 0 ? (
              <div className={`text-center py-10 border border-dashed ${activeTheme.border} rounded-xl text-slate-500 text-sm`}>
                No Instagram sources configured. Add one below to start.
              </div>
            ) : (
              <div className={`overflow-hidden border rounded-xl divide-y divide-slate-200/10 ${activeTheme.cardAlt}`}>
                {sources.map((src) => (
                  <div key={src.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`font-semibold ${activeTheme.textHeading}`}>{src.name}</div>
                        {/* Scrape Status Badge */}
                        {(() => {
                          const lastScraped = src.lastScrapedAt ? new Date(src.lastScrapedAt) : null;
                          const isUpToDate = lastScraped && Date.now() - lastScraped.getTime() < 24 * 60 * 60 * 1000;
                          return isUpToDate ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-semibold">
                              Up to date
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-semibold">
                              Needs Scrape
                            </span>
                          );
                        })()}
                        {/* Contribution Health Badge */}
                        {(() => {
                          const approvedEvents = src.events?.filter((e) => e.status === 'approved') || [];
                          if (approvedEvents.length === 0) {
                            return (
                              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-semibold">
                                Inactive
                              </span>
                            );
                          }
                          const latestDate = new Date(Math.max(...approvedEvents.map((e) => new Date(e.createdAt).getTime())));
                          const daysDiff = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);

                          if (daysDiff <= 14) {
                            return (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-semibold">
                                Active Contributor
                              </span>
                            );
                          } else if (daysDiff <= 45) {
                            return (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9px] font-semibold">
                                Quiet
                              </span>
                            );
                          } else {
                            return (
                              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-semibold">
                                Inactive
                              </span>
                            );
                          }
                        })()}
                      </div>
                      <div className="text-sm text-violet-400">@{src.handle}</div>

                      <div className="text-[11px] text-slate-400 mt-2">
                        {src.events?.length || 0} scraped posts ({src.events?.filter((e) => e.status === 'approved').length || 0} approved, {src.events?.filter((e) => e.status === 'rejected').length || 0} rejected)
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 items-center mt-2 text-[10px] text-slate-500">
                        <div>
                          Last scraped: {src.lastScrapedAt ? new Date(src.lastScrapedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Never'}
                        </div>
                        <div>•</div>
                        {(() => {
                          const activeInterval = src.customIntervalHours ?? src.scrapeIntervalHours;
                          const nextScrape = src.lastScrapedAt
                            ? new Date(new Date(src.lastScrapedAt).getTime() + activeInterval * 60 * 60 * 1000)
                            : null;
                          const isDue = !nextScrape || nextScrape.getTime() <= Date.now();

                          if (isDue) {
                            return <span className="text-amber-400 font-medium">Next run: due now</span>;
                          } else {
                            const hoursRemaining = Math.max(1, Math.round((nextScrape.getTime() - Date.now()) / (1000 * 60 * 60)));
                            return <span>Next run: in {hoursRemaining}h</span>;
                          }
                        })()}
                      </div>

                      {/* Interval Settings Selector */}
                      <div className="mt-3 flex items-center gap-2">
                        <label className="text-[10px] text-slate-500">Scrape Schedule:</label>
                        <select
                          value={src.customIntervalHours ?? 'auto'}
                          onChange={(e) => updateSourceInterval(src.id, e.target.value)}
                          className="bg-slate-950 border border-slate-900 rounded-lg px-2 py-1 text-[10px] font-medium text-slate-300 outline-none focus:border-violet-500 transition cursor-pointer"
                        >
                          <option value="auto">Auto (adaptive: {src.scrapeIntervalHours}h)</option>
                          <option value="6">Fixed (6 hours)</option>
                          <option value="12">Fixed (12 hours)</option>
                          <option value="24">Fixed (24 hours)</option>
                          <option value="72">Fixed (3 days)</option>
                          <option value="120">Fixed (5 days)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSourceForHistory(src)}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition"
                        title="View History"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </button>

                      {/* Scrape Latest (5) Button */}
                      <button
                        onClick={() => triggerSingleSourceIngest(src.id, src.handle, 5)}
                        disabled={ingesting || scrapingSourceId !== null}
                        className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-[11px] font-semibold text-white transition active:scale-[0.98] flex items-center gap-1"
                      >
                        {scrapingSourceId === src.id ? (
                          <>
                            <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Scraping...</span>
                          </>
                        ) : (
                          <span>Scrape Latest</span>
                        )}
                      </button>

                      {/* Deep Scrape (20) Button */}
                      <button
                        onClick={() => triggerSingleSourceIngest(src.id, src.handle, 20)}
                        disabled={ingesting || scrapingSourceId !== null}
                        className={`px-2.5 py-1.5 rounded-lg disabled:opacity-50 text-[11px] font-semibold transition active:scale-[0.98] ${activeTheme.deepScrapeBtn}`}
                      >
                        Deep Scrape
                      </button>

                      {/* Clean & Re-scrape Button */}
                      <button
                        onClick={() => handleCleanAndRescrape(src.id, src.handle)}
                        disabled={ingesting || scrapingSourceId !== null}
                        className="px-2.5 py-1.5 rounded-lg bg-red-950/20 border border-red-900/30 hover:border-red-900/50 disabled:opacity-50 text-[11px] font-semibold text-red-300 transition active:scale-[0.98]"
                        title="Delete all scraped history for this source and run a fresh deep scrape"
                      >
                        Clean & Re-scrape
                      </button>

                      <button
                        onClick={() => handleDeleteSource(src.id)}
                        disabled={ingesting || scrapingSourceId !== null}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition"
                        title="Delete Source"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Source Card */}
          <div className={`rounded-2xl border p-6 shadow-md ${activeTheme.card}`}>
            <h3 className={`text-lg font-semibold mb-4 ${activeTheme.textHeading}`}>Add New Instagram Account</h3>
            <form onSubmit={handleAddSource} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className={`block text-xs font-medium mb-1 ${activeTheme.textMuted}`}>Instagram Handle</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bayarea_toddlerexplorer"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition ${activeTheme.input}`}
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Source'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Ingestion Orchestrator */}
        <div className="space-y-8">
          <div className={`rounded-2xl border p-6 shadow-md flex flex-col h-full ${activeTheme.card}`}>
            <h2 className={`text-lg font-semibold mb-2 ${activeTheme.textHeading}`}>Ingestion Runner</h2>
            <p className={`text-xs ${activeTheme.textMuted} mb-6`}>
              Manually trigger a scrape across all sources. Auto-scraping runs every 6 hours via Railway Cron — each source is only scraped when its adaptive interval has elapsed.
            </p>

            <button
              onClick={triggerIngest}
              disabled={ingesting || sources.length === 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 hover:from-violet-500 hover:to-indigo-500 transition active:scale-[0.98] disabled:opacity-40"
            >
              {ingesting ? 'Running pipeline...' : 'Trigger Manual Scrape'}
            </button>

            {/* Live Progress Logs */}
            {statusLog && (
              <div className="mt-6 flex-1 flex flex-col">
                <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Pipeline Output</h4>
                <pre className={`flex-1 w-full p-4 rounded-xl font-mono text-[10px] leading-relaxed overflow-auto whitespace-pre-wrap max-h-60 ${activeTheme.cardAlt}`}>
                  {statusLog}
                </pre>
              </div>
            )}

            {/* Ingestion Report Table */}
            {report && (
              <div className={`mt-6 border-t ${activeTheme.border} pt-6`}>
                <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Scrape Summary</h4>
                <div className="space-y-3">
                  {report.map((rep, idx) => (
                    <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border text-xs ${activeTheme.cardAlt}`}>
                      <div>
                        <div className="font-semibold text-violet-400">@{rep.source}</div>
                        {rep.error && <div className="text-[10px] text-red-400 mt-1">{rep.error}</div>}
                      </div>
                      <div className="text-right flex gap-3 text-[10px] text-slate-500">
                        <div>Scraped: <span className={`font-bold ${activeTheme.textHeading}`}>{rep.scrapedCount}</span></div>
                        <div>Parsed: <span className="font-bold text-emerald-500">{rep.processedCount}</span></div>
                        <div>Dupes: <span className="font-bold text-slate-500">{rep.skippedCount}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Apify Billing & Quota Widget */}
          {apifyBilling && (
            <div className={`rounded-2xl border p-6 shadow-md ${activeTheme.card}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className={`text-sm font-semibold ${activeTheme.textHeading}`}>Apify API Usage & Quota</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className={`flex justify-between items-center p-3 rounded-xl border ${activeTheme.modalInner}`}>
                  <span className="text-slate-500 font-medium">Account Username:</span>
                  <span className={`font-semibold ${activeTheme.accentText}`}>@{apifyBilling.username}</span>
                </div>

                <div className={`flex justify-between items-center p-3 rounded-xl border ${activeTheme.modalInner}`}>
                  <span className="text-slate-500 font-medium">Subscription Plan:</span>
                  <span className="font-semibold text-violet-500 uppercase tracking-wider">{apifyBilling.plan?.name || 'Free'}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Monthly Usage:</span>
                    <span className="font-mono text-slate-200">
                      ${(apifyBilling.stats?.usageThisMonth || 0).toFixed(2)} / ${(apifyBilling.plan?.monthlyPrepaidUsageUsd || 5.0).toFixed(2)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((apifyBilling.stats?.usageThisMonth || 0) / (apifyBilling.plan?.monthlyPrepaidUsageUsd || 5.0)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                  <span>Today's Cost: ${(apifyBilling.stats?.usageToday || 0).toFixed(4)}</span>
                  <span>Resets monthly</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scraped Post History Drawer/Modal */}
      {selectedSourceForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setSelectedSourceForHistory(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-100">
                Scraped Post History: @{selectedSourceForHistory.handle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Showing posts scraped and parsed from this channel.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {!selectedSourceForHistory.events || selectedSourceForHistory.events.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-xs italic">
                  No post scrape history found for this channel. Click 'Run Scrape' to fetch posts.
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950/40">
                  {selectedSourceForHistory.events.map((ev) => (
                    <div key={ev.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="font-semibold text-slate-200 truncate pr-4">
                          {ev.title}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Scraped: {new Date(ev.createdAt).toLocaleString()}
                        </div>
                        <a
                          href={ev.rawPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-violet-400 hover:underline inline-block truncate max-w-xs"
                        >
                          View Instagram Post
                        </a>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-semibold capitalize ${
                          ev.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : ev.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
