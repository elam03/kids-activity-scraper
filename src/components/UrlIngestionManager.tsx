'use client';

import { useState, useEffect } from 'react';

export interface SubmissionItem {
  id: string;
  rawUrl: string;
  normalizedUrl: string;
  notes?: string | null;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'rejected';
  failureReason?: string | null;
  extractedEventCount: number;
  createdAt: string;
  processedAt?: string | null;
  events?: Array<{
    id: string;
    title: string;
    startDate: string;
    status: string;
    category: string;
    location?: string | null;
  }>;
}

interface UrlIngestionManagerProps {
  activeTheme: any;
  onRefreshNeeded?: () => void;
}

export default function UrlIngestionManager({
  activeTheme,
  onRefreshNeeded,
}: UrlIngestionManagerProps) {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'immediate' | 'queue' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  const fetchSubmissions = async () => {
    try {
      const url = statusFilter === 'all'
        ? '/api/admin/submissions'
        : `/api/admin/submissions?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const handleSubmit = async (runImmediately: boolean) => {
    if (!urlInput.trim()) return;

    setSubmitting(true);
    setActionType(runImmediately ? 'immediate' : 'queue');
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.trim(),
          notes: notesInput.trim() || undefined,
          runImmediately,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to submit URL',
        });
      } else if (data.submission?.status === 'rejected') {
        setFeedback({
          type: 'warning',
          message: data.message || 'URL was rejected by triage filter.',
        });
        setUrlInput('');
        setNotesInput('');
        fetchSubmissions();
      } else {
        const count = data.submission?.extractedEventCount ?? 0;
        setFeedback({
          type: 'success',
          message: runImmediately
            ? `Successfully processed! ${count} event(s) extracted.`
            : 'URL successfully added to ingestion queue.',
        });
        setUrlInput('');
        setNotesInput('');
        fetchSubmissions();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: (err as Error).message || 'Network error submitting URL',
      });
    } finally {
      setSubmitting(false);
      setActionType(null);
    }
  };

  const handleRetry = async (submission: SubmissionItem) => {
    try {
      setFeedback(null);
      const res = await fetch('/api/admin/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: submission.rawUrl,
          notes: submission.notes || undefined,
          runImmediately: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Re-processed URL! Status: ${data.submission?.status} (${data.submission?.extractedEventCount || 0} events)`,
        });
        fetchSubmissions();
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Retry failed',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: (err as Error).message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this submission record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/submissions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        setFeedback({
          type: 'success',
          message: 'Submission removed.',
        });
      } else {
        const data = await res.json();
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to delete submission',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: (err as Error).message,
      });
    }
  };

  const getStatusBadge = (status: string, count: number) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Completed ({count})
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Processing
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Queued
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Rejected
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Submission Form Card */}
      <div className={`rounded-2xl border p-6 shadow-md ${activeTheme.card}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className={`text-xl font-bold ${activeTheme.textHeading}`}>
              🌐 Arbitrary URL Ingestion Pipeline
            </h2>
            <p className={`text-xs mt-1 ${activeTheme.textMuted}`}>
              Submit any event link, municipal recreation page, library calendar, Eventbrite listing, or roundup article. The system runs Jev Gate 1 triage, routes through our 3-tier scraper, and unbundles multiple events.
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : feedback.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${activeTheme.text}`}>
              Target Web URL *
            </label>
            <input
              type="url"
              placeholder="https://www.eventbrite.com/e/... or https://library.city.gov/events/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition ${activeTheme.input}`}
              disabled={submitting}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${activeTheme.text}`}>
              Organizer Notes / Context (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Free admission, organizer email, age group details..."
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition ${activeTheme.input}`}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting || !urlInput.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition shadow-sm"
            >
              {submitting && actionType === 'immediate' ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Ingesting via Jev Pipeline...</span>
                </>
              ) : (
                <>
                  <span>⚡ Ingest Now (Live)</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting || !urlInput.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border disabled:opacity-50 transition shadow-sm ${activeTheme.navBtn}`}
            >
              {submitting && actionType === 'queue' ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Adding to Queue...</span>
                </>
              ) : (
                <>
                  <span>📥 Add to Background Queue</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Submissions Audit & Queue Table */}
      <div className={`rounded-2xl border shadow-md overflow-hidden ${activeTheme.card}`}>
        <div className="p-4 sm:p-6 border-b border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className={`text-base font-bold ${activeTheme.textHeading}`}>
              Submissions Audit Queue
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTheme.badge}`}>
              {submissions.length} Total
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'queued', 'completed', 'rejected', 'failed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                  statusFilter === st
                    ? 'bg-violet-600 text-white font-bold'
                    : `${activeTheme.textMuted} hover:text-slate-200`
                }`}
              >
                {st}
              </button>
            ))}
            <button
              onClick={fetchSubmissions}
              className={`ml-2 px-2.5 py-1 rounded-lg text-xs border ${activeTheme.navBtn}`}
              title="Refresh Queue"
            >
              🔄
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs opacity-60">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center text-xs opacity-60">
            No submissions found for filter &quot;{statusFilter}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={activeTheme.tableHeader}>
                <tr>
                  <th className="px-4 py-3">Submitted URL & Notes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Extracted Events</th>
                  <th className="px-4 py-3">Submitted At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${activeTheme.tableDivide}`}>
                {submissions.map((sub) => (
                  <tr key={sub.id} className={`${activeTheme.tableRowHover} transition`}>
                    <td className="px-4 py-3 max-w-xs sm:max-w-md">
                      <div className="flex items-center gap-2">
                        <a
                          href={sub.rawUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-violet-400 hover:underline truncate max-w-[280px]"
                          title={sub.rawUrl}
                        >
                          {sub.rawUrl}
                        </a>
                      </div>
                      {sub.notes && (
                        <p className={`text-[11px] mt-0.5 truncate ${activeTheme.tableMuted}`}>
                          📝 {sub.notes}
                        </p>
                      )}
                      {sub.failureReason && (
                        <p className="text-[11px] text-rose-400 mt-0.5">
                          ⚠️ {sub.failureReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(sub.status, sub.extractedEventCount)}
                    </td>
                    <td className="px-4 py-3">
                      {sub.events && sub.events.length > 0 ? (
                        <div className="space-y-1">
                          {sub.events.slice(0, 3).map((e) => (
                            <div key={e.id} className="truncate max-w-[200px]" title={e.title}>
                              • <span className="font-medium">{e.title}</span> ({e.startDate})
                            </div>
                          ))}
                          {sub.events.length > 3 && (
                            <span className="text-[10px] opacity-60">
                              +{sub.events.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="opacity-40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap opacity-75">
                      {new Date(sub.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleRetry(sub)}
                        className={`px-2 py-1 rounded-md text-[11px] border font-medium ${activeTheme.navBtn}`}
                        title="Re-run Ingestion"
                      >
                        ⚡ Ingest
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="px-2 py-1 rounded-md text-[11px] border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition font-medium"
                        title="Delete Record"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
