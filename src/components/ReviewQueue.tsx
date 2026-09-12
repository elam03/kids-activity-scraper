'use client';

import { useState, useEffect } from 'react';

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
  ageGroup?: string;
  category: string;
  cost: string | null;
  isFree: boolean;
  registrationUrl: string | null;
  confidence: number;
}

interface ReviewQueueProps {
  activeTheme: any;
  onCountChange?: (count: number) => void;
}

export default function ReviewQueue({ activeTheme, onCountChange }: ReviewQueueProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Event>>({});
  const [loading, setLoading] = useState(true);

  const fetchPendingEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/events?status=pending');
      const data = await res.json();
      const pending = data.events || [];
      setEvents(pending);
      onCountChange?.(pending.length);
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
        setEvents(prev => {
          const updated = prev.filter(e => e.id !== id);
          onCountChange?.(updated.length);
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to update event:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-xl font-bold ${activeTheme.textHeading}`}>Review Queue</h2>
          <p className={`text-xs ${activeTheme.textMuted} mt-1`}>
            Verify and polish low-confidence extractions before they appear on the calendar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${activeTheme.badge}`}>
            {events.length} {events.length === 1 ? 'item' : 'items'} to review
          </span>
          <button
            onClick={fetchPendingEvents}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition disabled:opacity-50 ${activeTheme.deepScrapeBtn}`}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : events.length === 0 ? (
        <div className={`text-center py-20 border border-dashed rounded-2xl ${activeTheme.border} ${activeTheme.cardAlt}`}>
          <svg className="mx-auto h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className={`mt-4 text-sm font-semibold ${activeTheme.textHeading}`}>All caught up!</h3>
          <p className={`mt-1 text-xs ${activeTheme.textMuted}`}>There are no pending events to review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((ev) => {
            const isEditing = editingEventId === ev.id;
            const currentData = isEditing ? editForm : ev;

            return (
              <div key={ev.id} className={`rounded-2xl border overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-md ${activeTheme.card}`}>
                {/* Left Side: Original Post / Caption */}
                <div className={`p-6 border-b md:border-b-0 md:border-r flex flex-col justify-between ${activeTheme.border} ${activeTheme.cardAlt}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-semibold text-violet-500">@{ev.source.handle}</span>
                      <span className="text-[10px] text-slate-400">•</span>
                      <a 
                        href={ev.rawPostUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-violet-400 hover:text-violet-300 underline font-medium"
                      >
                        View Original Post ↗
                      </a>
                    </div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Caption Content</h4>
                    <p className={`text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap pr-2 ${activeTheme.cardText}`}>
                      {ev.rawCaption}
                    </p>
                  </div>
                  <div className={`mt-6 pt-4 border-t flex justify-between items-center ${activeTheme.border}`}>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Confidence: <span className={`font-mono font-bold ${activeTheme.accentText}`}>{(ev.confidence * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                </div>

                {/* Right Side: Editable Structured Form */}
                <div className="p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Extracted Event</h4>
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(ev)}
                          className="text-xs text-violet-500 hover:text-violet-600 font-bold transition"
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
                            className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                          />
                        ) : (
                          <div className={`text-sm font-bold ${activeTheme.textHeading}`}>{ev.title}</div>
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
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                            />
                          ) : (
                            <div className={`text-xs ${activeTheme.cardText}`}>{ev.startDate}</div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                          {isEditing ? (
                            <input
                              type="date"
                              value={currentData.endDate || ''}
                              onChange={(e) => handleFormChange('endDate', e.target.value)}
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                            />
                          ) : (
                            <div className={`text-xs ${activeTheme.cardText}`}>{ev.endDate || 'Single day'}</div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Start Time</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={currentData.startTime || ''}
                              placeholder="e.g. 10:00 AM"
                              onChange={(e) => handleFormChange('startTime', e.target.value)}
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                            />
                          ) : (
                            <div className={`text-xs ${activeTheme.cardText}`}>{ev.startTime || 'Not specified'}</div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">End Time</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={currentData.endTime || ''}
                              placeholder="e.g. 2:00 PM"
                              onChange={(e) => handleFormChange('endTime', e.target.value)}
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                            />
                          ) : (
                            <div className={`text-xs ${activeTheme.cardText}`}>{ev.endTime || 'Not specified'}</div>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Location</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={currentData.location || ''}
                            onChange={(e) => handleFormChange('location', e.target.value)}
                            className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                          />
                        ) : (
                          <div className={`text-xs ${activeTheme.cardText}`}>{ev.location || 'None'}</div>
                        )}
                      </div>

                      {/* Category, Cost, Registration */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Category</label>
                          {isEditing ? (
                            <select
                              value={currentData.category || 'other'}
                              onChange={(e) => handleFormChange('category', e.target.value)}
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
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
                            <div className={`text-xs capitalize ${activeTheme.cardText}`}>{ev.category}</div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Cost</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={currentData.cost || ''}
                              placeholder="Free or $10"
                              onChange={(e) => handleFormChange('cost', e.target.value)}
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                            />
                          ) : (
                            <div className={`text-xs ${activeTheme.cardText}`}>{ev.isFree ? 'Free' : ev.cost || 'Not specified'}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Approve / Reject) */}
                  <div className={`mt-6 pt-4 border-t flex justify-end gap-3 ${activeTheme.border}`}>
                    <button
                      onClick={() => saveEventStatus(ev.id, 'rejected')}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/20 transition active:scale-95"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => saveEventStatus(ev.id, 'approved')}
                      className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition active:scale-95 shadow-md shadow-violet-500/20"
                    >
                      Approve &amp; Publish
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
