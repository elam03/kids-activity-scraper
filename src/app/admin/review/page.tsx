'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
  id: string;
  sourceId: string;
  source: {
    handle: string;
    name: string;
  };
  rawPostUrl: string;
  rawCaption: string;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  ageRange: string | null;
  category: string;
  cost: string | null;
  isFree: boolean;
  registrationUrl: string | null;
  confidence: number;
}

export default function ReviewQueue() {
  const [events, setEvents] = useState<Event[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Event>>({});
  const [loading, setLoading] = useState(true);

  const fetchPendingEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/events?status=pending');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch pending events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const startEdit = (event: Event) => {
    setEditingEventId(event.id);
    setEditForm(event);
  };

  const handleFormChange = (key: keyof Event, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveEventStatus = async (id: string, status: 'approved' | 'rejected') => {
    // If editing this card, merge the form changes, otherwise send as-is
    const payload = editingEventId === id 
      ? { ...editForm, status } 
      : { id, status };

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingEventId(null);
        // Remove from local list
        setEvents(prev => prev.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error('Failed to update event:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 sticky top-0 z-10 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-md shadow-violet-500/10">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
              Kids Calendar Admin
            </h1>
          </div>
          
          <nav className="flex gap-4">
            <Link href="/admin" className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition">
              Dashboard
            </Link>
            <Link href="/admin/review" className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 border border-slate-800 text-slate-200">
              Review Queue
            </Link>
            <Link href="/" className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 transition">
              View Calendar
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-200">Review Queue</h2>
            <p className="text-sm text-slate-400 mt-1">
              Verify and polish low-confidence extractions before they publish.
            </p>
          </div>
          <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400 border border-violet-500/20">
            {events.length} pending items
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-900 rounded-2xl bg-slate-900/10">
            <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-sm font-semibold text-slate-300">All caught up!</h3>
            <p className="mt-1 text-sm text-slate-500">There are no pending events to review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((ev) => {
              const isEditing = editingEventId === ev.id;
              const currentData = isEditing ? editForm : ev;

              return (
                <div key={ev.id} className="rounded-2xl border border-slate-900 bg-slate-900/10 overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-md">
                  {/* Left Side: Original Post / Caption */}
                  <div className="p-6 border-b md:border-b-0 md:border-r border-slate-900 bg-slate-950/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-semibold text-violet-400">@{ev.source.handle}</span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <a 
                          href={ev.rawPostUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                        >
                          View Original Instagram Post
                        </a>
                      </div>
                      <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">Caption Content</h4>
                      <p className="text-xs text-slate-300 leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap pr-2">
                        {ev.rawCaption}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-900 flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">
                        Confidence: <span className="font-mono text-slate-300">{(ev.confidence * 100).toFixed(0)}%</span>
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Editable Structured Form */}
                  <div className="p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Extracted Event</h4>
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(ev)}
                            className="text-xs text-violet-400 hover:text-violet-300 transition"
                          >
                            Edit Fields
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {/* Title */}
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Title</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={currentData.title || ''}
                              onChange={(e) => handleFormChange('title', e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-violet-500"
                            />
                          ) : (
                            <div className="text-sm font-semibold text-slate-200">{ev.title}</div>
                          )}
                        </div>

                        {/* Date & Time Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                            {isEditing ? (
                              <input
                                type="date"
                                value={currentData.startDate || ''}
                                onChange={(e) => handleFormChange('startDate', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-violet-500"
                              />
                            ) : (
                              <div className="text-xs text-slate-300">{ev.startDate}</div>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                            {isEditing ? (
                              <input
                                type="date"
                                value={currentData.endDate || ''}
                                onChange={(e) => handleFormChange('endDate', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-violet-500"
                              />
                            ) : (
                              <div className="text-xs text-slate-300">{ev.endDate || 'Single day'}</div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Start Time</label>
                            {isEditing ? (
                              <input
                                type="text"
                                placeholder="e.g. 10:00"
                                value={currentData.startTime || ''}
                                onChange={(e) => handleFormChange('startTime', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-violet-500"
                              />
                            ) : (
                              <div className="text-xs text-slate-300">{ev.startTime || 'Not specified'}</div>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">End Time</label>
                            {isEditing ? (
                              <input
                                type="text"
                                placeholder="e.g. 14:00"
                                value={currentData.endTime || ''}
                                onChange={(e) => handleFormChange('endTime', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-violet-500"
                              />
                            ) : (
                              <div className="text-xs text-slate-300">{ev.endTime || 'Not specified'}</div>
                            )}
                          </div>
                        </div>

                        {/* Location & Category */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Category</label>
                            {isEditing ? (
                              <select
                                value={currentData.category || 'other'}
                                onChange={(e) => handleFormChange('category', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-violet-500"
                              >
                                <option value="sports">Sports</option>
                                <option value="arts">Arts</option>
                                <option value="nature">Nature</option>
                                <option value="music">Music</option>
                                <option value="education">Education</option>
                                <option value="festival">Festival</option>
                                <option value="other">Other</option>
                              </select>
                            ) : (
                              <span className="inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 uppercase tracking-wider">
                                {ev.category}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Age Range</label>
                            {isEditing ? (
                              <input
                                type="text"
                                placeholder="e.g. 0-4 years"
                                value={currentData.ageRange || ''}
                                onChange={(e) => handleFormChange('ageRange', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-violet-500"
                              />
                            ) : (
                              <div className="text-xs text-slate-300">{ev.ageRange || 'All ages'}</div>
                            )}
                          </div>
                        </div>

                        {/* Cost & Free state */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Cost</label>
                            {isEditing ? (
                              <input
                                type="text"
                                placeholder="e.g. Free or $15"
                                value={currentData.cost || ''}
                                onChange={(e) => handleFormChange('cost', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-violet-500"
                              />
                            ) : (
                              <div className="text-xs text-slate-300">{ev.cost || 'Free'}</div>
                            )}
                          </div>
                          <div className="flex items-center pt-4">
                            {isEditing ? (
                              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!currentData.isFree}
                                  onChange={(e) => handleFormChange('isFree', e.target.checked)}
                                  className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-violet-500"
                                />
                                <span>Mark as Free Event</span>
                              </label>
                            ) : (
                              <div className="text-xs text-slate-300">
                                {ev.isFree ? '🏷️ Marked Free' : '💵 Paid'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Location Input */}
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Location Address</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={currentData.location || ''}
                              onChange={(e) => handleFormChange('location', e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-violet-500"
                            />
                          ) : (
                            <div className="text-xs text-slate-300">{ev.location || 'Not specified'}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Panel Buttons */}
                    <div className="mt-8 pt-4 border-t border-slate-900 flex justify-end gap-3">
                      <button
                        onClick={() => saveEventStatus(ev.id, 'rejected')}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition"
                      >
                        Reject Event
                      </button>
                      <button
                        onClick={() => saveEventStatus(ev.id, 'approved')}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold text-white transition active:scale-[0.98]"
                      >
                        Approve & Publish
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
