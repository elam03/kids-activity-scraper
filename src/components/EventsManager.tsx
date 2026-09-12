'use client';

import { useState, useEffect, useMemo } from 'react';
import { isNeedsReview } from '@/lib/event-utils';

export interface AdminEvent {
  id: string;
  sourceId: string;
  source: {
    handle: string;
    name: string;
  };
  rawPostUrl: string;
  rawCaption?: string;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  ageRange: string | null;
  ageGroup: string;
  category: string;
  cost: string | null;
  isFree: boolean;
  registrationUrl: string | null;
  status: string;
  confidence: number;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  likes?: number;
  _count?: {
    feedbacks?: number;
  };
}

interface EventsManagerProps {
  activeTheme: any;
  onRefreshNeeded?: () => void;
}

export default function EventsManager({ activeTheme, onRefreshNeeded }: EventsManagerProps) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'needs_review' | 'approved' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/events?status=all');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      showNotification('error', 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filter and search logic
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Status/Filter mode
      if (filterMode === 'needs_review' && !isNeedsReview(e)) return false;
      if (filterMode === 'approved' && e.status !== 'approved') return false;
      if (filterMode === 'rejected' && e.status !== 'rejected') return false;

      // Category filter
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title?.toLowerCase().includes(q);
        const matchesLoc = e.location?.toLowerCase().includes(q);
        const matchesCategory = e.category?.toLowerCase().includes(q);
        const matchesSource = e.source?.handle?.toLowerCase().includes(q);
        const matchesDesc = e.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesLoc && !matchesCategory && !matchesSource && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [events, filterMode, categoryFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = events.length;
    const approved = events.filter(e => e.status === 'approved').length;
    const rejected = events.filter(e => e.status === 'rejected').length;
    const needsReview = events.filter(isNeedsReview).length;
    return { total, approved, rejected, needsReview };
  }, [events]);

  // Save modified event
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEvent),
      });

      if (res.ok) {
        showNotification('success', `"${editingEvent.title}" updated successfully.`);
        setEditingEvent(null);
        await fetchEvents();
        onRefreshNeeded?.();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to update event.');
      }
    } catch (err) {
      showNotification('error', (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Hard delete event
  const handleDeleteEvent = async (eventToDelete: AdminEvent) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${eventToDelete.title}"?\n\nThis will permanently remove it from the database and calendar.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/events?id=${encodeURIComponent(eventToDelete.id)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showNotification('success', `Deleted "${eventToDelete.title}".`);
        if (editingEvent?.id === eventToDelete.id) {
          setEditingEvent(null);
        }
        await fetchEvents();
        onRefreshNeeded?.();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to delete event.');
      }
    } catch (err) {
      showNotification('error', (err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-xs font-semibold shadow-xl border backdrop-blur-md animate-in slide-in-from-top-2 duration-150 flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/40'
          }`}
        >
          <span>{notification.type === 'success' ? '✓' : '⚠'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Stat Summary */}
      <div className={`rounded-2xl border p-6 shadow-md ${activeTheme.card}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-bold ${activeTheme.textHeading}`}>
              Calendar Events Manager
            </h2>
            <p className={`text-xs mt-1 ${activeTheme.textMuted}`}>
              Search, verify against original Instagram posts, modify event details, or delete events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchEvents}
              disabled={loading}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition disabled:opacity-50 ${activeTheme.deepScrapeBtn}`}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh Events'}
            </button>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t ${activeTheme.border || 'border-slate-800/40'}`}>
          <button
            onClick={() => setFilterMode('all')}
            className={`p-3 rounded-xl border text-left transition ${
              filterMode === 'all'
                ? 'border-violet-500/70 bg-violet-500/15 shadow-sm'
                : `${activeTheme.cardAlt || 'bg-slate-950/30'} ${activeTheme.border || 'border-slate-800/50'} hover:opacity-95`
            }`}
          >
            <div className={`text-[10px] uppercase tracking-wider font-bold ${activeTheme.textMuted || 'text-slate-400'}`}>
              All Events
            </div>
            <div className={`text-xl font-black mt-1 ${activeTheme.textHeading}`}>
              {stats.total}
            </div>
          </button>

          <button
            onClick={() => setFilterMode('needs_review')}
            className={`p-3 rounded-xl border text-left transition ${
              filterMode === 'needs_review'
                ? 'border-amber-500/70 bg-amber-500/15 shadow-sm'
                : `${activeTheme.cardAlt || 'bg-slate-950/30'} ${activeTheme.border || 'border-slate-800/50'} hover:opacity-95`
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-amber-500 dark:text-amber-400 font-bold">
                Needs Review
              </span>
              {stats.needsReview > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </div>
            <div className="text-xl font-black mt-1 text-amber-600 dark:text-amber-300">
              {stats.needsReview}
            </div>
          </button>

          <button
            onClick={() => setFilterMode('approved')}
            className={`p-3 rounded-xl border text-left transition ${
              filterMode === 'approved'
                ? 'border-emerald-500/70 bg-emerald-500/15 shadow-sm'
                : `${activeTheme.cardAlt || 'bg-slate-950/30'} ${activeTheme.border || 'border-slate-800/50'} hover:opacity-95`
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
              Published Live
            </div>
            <div className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-300">
              {stats.approved}
            </div>
          </button>

          <button
            onClick={() => setFilterMode('rejected')}
            className={`p-3 rounded-xl border text-left transition ${
              filterMode === 'rejected'
                ? 'border-rose-500/70 bg-rose-500/15 shadow-sm'
                : `${activeTheme.cardAlt || 'bg-slate-950/30'} ${activeTheme.border || 'border-slate-800/50'} hover:opacity-95`
            }`}
          >
            <div className={`text-[10px] uppercase tracking-wider font-bold ${activeTheme.textMuted || 'text-slate-400'}`}>
              Rejected
            </div>
            <div className="text-xl font-black mt-1 text-rose-600 dark:text-rose-400">
              {stats.rejected}
            </div>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className={`absolute left-3 top-2.5 h-4 w-4 ${activeTheme.textMuted || 'text-slate-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, location, handle, or details..."
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none font-medium transition ${activeTheme.input}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border outline-none font-semibold cursor-pointer ${activeTheme.input}`}
          >
            <option value="all">All Categories</option>
            <option value="sports">Sports</option>
            <option value="arts">Arts</option>
            <option value="nature">Nature</option>
            <option value="music">Music</option>
            <option value="education">Education</option>
            <option value="festival">Festival</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Events List Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-md ${activeTheme.card}`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${activeTheme.border || 'border-slate-800/60'}`}>
          <h3 className={`text-sm font-bold ${activeTheme.textHeading}`}>
            Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          </h3>
          {filterMode === 'needs_review' && (
            <span className="text-[11px] text-amber-500 dark:text-amber-400 font-bold">
              ⚠️ Filtered to items needing review
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <svg className="animate-spin h-6 w-6 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading calendar events...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className={`py-20 text-center text-xs italic ${activeTheme.textMuted || 'text-slate-400'}`}>
            No events match your current filter and search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b font-bold uppercase text-[10px] tracking-wider ${activeTheme.tableHeader || 'bg-slate-950/40 text-slate-400 border-slate-800/60'}`}>
                <tr>
                  <th className="py-3.5 px-4">Event & Source</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status / Confidence</th>
                  <th className="py-3.5 px-4">Reports / Likes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${activeTheme.tableDivide || 'divide-slate-800/40'}`}>
                {filteredEvents.map(ev => {
                  const needsReview = isNeedsReview(ev);
                  const confidencePct = Math.round((ev.confidence || 0) * 100);

                  return (
                    <tr
                      key={ev.id}
                      className={`transition group ${activeTheme.tableRowHover || 'hover:bg-slate-900/40'} ${
                        needsReview ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Title & Source */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-start gap-2">
                          {needsReview && (
                            <span
                              title="Needs review: low confidence, user reports, or incomplete data"
                              className="mt-0.5 text-amber-500 text-xs shrink-0 cursor-help"
                            >
                              ⚠️
                            </span>
                          )}
                          <div>
                            <button
                              onClick={() => setEditingEvent({ ...ev })}
                              className={`font-bold text-left line-clamp-1 hover:underline transition ${activeTheme.textHeading}`}
                            >
                              {ev.title}
                            </button>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[11px] font-medium ${activeTheme.tableMuted || 'text-slate-400'}`}>
                                @{ev.source?.handle}
                              </span>
                              {ev.rawPostUrl && (
                                <a
                                  href={ev.rawPostUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-bold"
                                >
                                  Post ↗
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className={`py-3.5 px-4 whitespace-nowrap ${activeTheme.tableText || 'text-slate-300'}`}>
                        <div className="font-bold">{ev.startDate}</div>
                        <div className={`text-[10px] font-medium ${activeTheme.tableMuted || 'text-slate-500'}`}>
                          {ev.startTime || 'All day'}
                          {ev.endTime ? ` - ${ev.endTime}` : ''}
                        </div>
                      </td>

                      {/* Location */}
                      <td className={`py-3.5 px-4 max-w-[180px] truncate ${activeTheme.tableText || 'text-slate-300'}`}>
                        {ev.location ? (
                          <span title={ev.location} className="flex items-center gap-1 font-medium">
                            <span>📍</span>
                            <span className="truncate">{ev.location.split(',')[0]}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold italic text-[10px]">Missing location</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
                          {ev.category}
                        </span>
                      </td>

                      {/* Status / Confidence */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold w-fit ${
                              ev.status === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : ev.status === 'rejected'
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {ev.status.toUpperCase()}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              ev.status === 'rejected'
                                ? activeTheme.tableMuted || 'text-slate-400'
                                : ev.confidence < 0.8
                                ? 'text-amber-600 dark:text-amber-400'
                                : activeTheme.tableMuted || 'text-slate-400'
                            }`}
                          >
                            {confidencePct}% conf
                          </span>
                        </div>
                      </td>

                      {/* Reports / Feedback */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {((ev._count?.feedbacks || 0) > 0) && (
                            <span
                              title={`${ev._count?.feedbacks} user report(s) of inaccuracy`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40"
                            >
                              🚨 {ev._count?.feedbacks} reported
                            </span>
                          )}
                          {((ev.likes || 0) > 0) && (
                            <span
                              title={`${ev.likes} like(s)`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            >
                              ❤️ {ev.likes}
                            </span>
                          )}
                          {!((ev._count?.feedbacks || 0) > 0) && !((ev.likes || 0) > 0) && (
                            <span className={`text-[11px] font-medium ${activeTheme.tableMuted || 'text-slate-500'}`}>
                              -
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingEvent({ ...ev })}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-600/15 hover:bg-violet-600/25 text-violet-700 dark:text-violet-300 border border-violet-500/30 transition active:scale-95"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev)}
                            disabled={isDeleting}
                            aria-label={`Delete ${ev.title}`}
                            className="p-1.5 rounded-lg text-xs text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition active:scale-95"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Event Edit Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 my-8 relative animate-in fade-in zoom-in duration-150 shadow-2xl ${activeTheme.modal || 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            {/* Modal Header */}
            <div className={`flex items-start justify-between pb-4 border-b ${activeTheme.border || 'border-slate-800/60'}`}>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Admin Event Editor
                </span>
                <h3 className={`text-lg font-bold mt-0.5 ${activeTheme.modalTitle || activeTheme.textHeading}`}>
                  Edit & Verify Event
                </h3>
              </div>
              <button
                onClick={() => setEditingEvent(null)}
                className={`p-1.5 rounded-lg transition ${activeTheme.closeBtn || 'text-slate-400 hover:text-slate-200'}`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Verification Banner */}
            {editingEvent.rawPostUrl && (
              <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between gap-3 ${activeTheme.modalInner || 'bg-violet-950/30 border-violet-500/30'}`}>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-sm">📸</span>
                  <span>
                    Source: <strong>@{editingEvent.source?.handle}</strong>
                  </span>
                </div>
                <a
                  href={editingEvent.rawPostUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition active:scale-95 shadow-sm"
                >
                  <span>View Original Post</span>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* User Feedback Indicators */}
            {((editingEvent._count?.feedbacks || 0) > 0 || (editingEvent.likes || 0) > 0) && (
              <div className="mt-3 flex items-center gap-4 text-xs font-semibold">
                {(editingEvent.likes || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-500">
                    ❤️ {editingEvent.likes} upvote{editingEvent.likes === 1 ? '' : 's'}
                  </span>
                )}
                {(editingEvent._count?.feedbacks || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                    🚨 {editingEvent._count?.feedbacks} user report{editingEvent._count?.feedbacks === 1 ? '' : 's'} of inaccuracy
                  </span>
                )}
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={editingEvent.title}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border font-bold outline-none ${activeTheme.input}`}
                />
              </div>

              {/* Dates & Times */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editingEvent.startDate}
                    onChange={e => setEditingEvent({ ...editingEvent, startDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${activeTheme.input}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={editingEvent.endDate || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, endDate: e.target.value || null })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${activeTheme.input}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                    Start Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={editingEvent.startTime || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, startTime: e.target.value || null })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${activeTheme.input}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                    End Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2:00 PM"
                    value={editingEvent.endTime || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, endTime: e.target.value || null })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${activeTheme.input}`}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                  Location (Venue Name, City)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Children's Discovery Museum, San Jose"
                  value={editingEvent.location || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value || null })}
                  className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${activeTheme.input}`}
                />
              </div>

              {/* Category, Age Group, Cost, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                    Category
                  </label>
                  <select
                    value={editingEvent.category}
                    onChange={e => setEditingEvent({ ...editingEvent, category: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium cursor-pointer ${activeTheme.input}`}
                  >
                    <option value="sports">Sports</option>
                    <option value="arts">Arts</option>
                    <option value="nature">Nature</option>
                    <option value="music">Music</option>
                    <option value="education">Education</option>
                    <option value="festival">Festival</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                    Age Group
                  </label>
                  <select
                    value={editingEvent.ageGroup || 'all'}
                    onChange={e => setEditingEvent({ ...editingEvent, ageGroup: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium cursor-pointer ${activeTheme.input}`}
                  >
                    <option value="all">All Ages</option>
                    <option value="infants">Infants (0-1)</option>
                    <option value="toddlers">Toddlers (1-3)</option>
                    <option value="preschoolers">Preschoolers (3-5)</option>
                    <option value="kids">Kids (5-12)</option>
                    <option value="teens">Teens (13+)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                    Cost / Price
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Free or $15"
                    value={editingEvent.cost || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, cost: e.target.value || null })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${activeTheme.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                    Status
                  </label>
                  <select
                    value={editingEvent.status}
                    onChange={e => setEditingEvent({ ...editingEvent, status: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium cursor-pointer ${activeTheme.input}`}
                  >
                    <option value="approved">Approved (Live)</option>
                    <option value="pending">Pending Review</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Free Toggle & Registration URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                    Registration / Ticket Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editingEvent.registrationUrl || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, registrationUrl: e.target.value || null })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${activeTheme.input}`}
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isFreeCheckbox"
                    checked={editingEvent.isFree}
                    onChange={e => setEditingEvent({ ...editingEvent, isFree: e.target.checked })}
                    className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
                  />
                  <label htmlFor="isFreeCheckbox" className={`text-xs font-bold cursor-pointer ${activeTheme.tableText || 'text-slate-300'}`}>
                    This is a Free Activity
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-[11px] font-bold mb-1 ${activeTheme.textMuted || 'text-slate-400'}`}>
                  Description / Activity Details
                </label>
                <textarea
                  rows={4}
                  value={editingEvent.description || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${activeTheme.input}`}
                />
              </div>

              {/* Modal Footer Actions */}
              <div className={`pt-4 border-t flex items-center justify-between gap-3 ${activeTheme.border || 'border-slate-800/60'}`}>
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(editingEvent)}
                  disabled={isDeleting}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition active:scale-95"
                >
                  {isDeleting ? 'Deleting...' : '🗑️ Delete Event'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTheme.textMuted || 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition active:scale-95 shadow-md shadow-violet-500/20 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
