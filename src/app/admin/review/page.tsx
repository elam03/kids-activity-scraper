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
  ageGroup?: string;
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

const themeClasses = {
  cosmo: {
    bg: 'min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 px-4 py-8 sm:px-6 lg:px-8 text-slate-100 flex flex-col justify-between transition-all duration-300',
    text: 'text-slate-100',
    textHeading: 'text-slate-100',
    textMuted: 'text-slate-400',
    card: 'bg-slate-900/10 border-slate-900 hover:border-slate-800',
    cardAlt: 'bg-slate-950/80 border-slate-800 hover:border-slate-700',
    cardBorder: 'border-slate-900',
    cardText: 'text-slate-300',
    headerText: 'bg-clip-text text-transparent bg-gradient-to-r from-violet-200 to-indigo-200',
    navBtn: 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300',
    badge: 'bg-slate-800 text-slate-300',
    activeTab: 'bg-violet-600 text-white',
    inactiveTab: 'text-slate-400 hover:text-slate-200',
    border: 'border-slate-900',
    modal: 'bg-slate-900 border-slate-800 text-slate-100',
    modalInner: 'bg-slate-950/40 border-slate-900 text-slate-300',
    modalTitle: 'text-slate-100',
    closeBtn: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
    accentText: 'text-slate-200',
    input: 'bg-slate-950 text-slate-100 border-slate-800 focus:border-violet-500',
  },
  bubblegum: {
    bg: 'min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-100 via-purple-50 to-indigo-100 px-4 py-8 sm:px-6 lg:px-8 text-slate-800 flex flex-col justify-between transition-all duration-300',
    text: 'text-slate-800',
    textHeading: 'text-purple-950',
    textMuted: 'text-purple-900/70',
    card: 'bg-white/80 border-purple-200/60 shadow-purple-500/5 hover:border-purple-300/80 hover:bg-white',
    cardAlt: 'bg-white border-purple-200 hover:border-purple-300',
    cardBorder: 'border-purple-100',
    cardText: 'text-slate-600',
    headerText: 'bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 font-extrabold',
    navBtn: 'bg-white border-purple-200 hover:border-purple-300 text-slate-700',
    badge: 'bg-purple-100 text-purple-700',
    activeTab: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
    inactiveTab: 'text-purple-600/70 hover:text-purple-700',
    border: 'border-purple-100',
    modal: 'bg-white border-purple-200 text-slate-800 shadow-2xl shadow-purple-500/10',
    modalInner: 'bg-purple-50/55 border-purple-100 text-slate-700',
    modalTitle: 'text-purple-950 font-bold',
    closeBtn: 'text-purple-400 hover:text-purple-600 hover:bg-purple-50',
    accentText: 'text-purple-900 font-semibold',
    input: 'bg-white text-purple-950 border-purple-200 focus:border-purple-500',
  },
  jungle: {
    bg: 'min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100 via-yellow-50 to-amber-100 px-4 py-8 sm:px-6 lg:px-8 text-emerald-950 flex flex-col justify-between transition-all duration-300',
    text: 'text-emerald-950',
    textHeading: 'text-emerald-950',
    textMuted: 'text-emerald-800/70',
    card: 'bg-white/90 border-emerald-200/60 shadow-emerald-500/5 hover:border-emerald-300/80 hover:bg-white',
    cardAlt: 'bg-white border-emerald-200 hover:border-emerald-300',
    cardBorder: 'border-emerald-100',
    cardText: 'text-emerald-800',
    headerText: 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-amber-700 font-extrabold',
    navBtn: 'bg-white border-emerald-200 hover:border-emerald-300 text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-800',
    activeTab: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
    inactiveTab: 'text-emerald-700/70 hover:text-emerald-800',
    border: 'border-emerald-100',
    modal: 'bg-white border-emerald-200 text-emerald-950 shadow-2xl shadow-emerald-500/10',
    modalInner: 'bg-emerald-50/55 border-emerald-100 text-emerald-900',
    modalTitle: 'text-emerald-950 font-bold',
    closeBtn: 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50',
    accentText: 'text-emerald-900 font-semibold',
    input: 'bg-white text-emerald-950 border-emerald-200 focus:border-emerald-500',
  }
};

  const [theme, setTheme] = useState<'cosmo' | 'bubblegum' | 'jungle'>('cosmo');

  useEffect(() => {
    const savedTheme = localStorage.getItem('calendar-theme');
    if (savedTheme && ['cosmo', 'bubblegum', 'jungle'].includes(savedTheme)) {
      setTheme(savedTheme as any);
    }
  }, []);

  const changeTheme = (newTheme: 'cosmo' | 'bubblegum' | 'jungle') => {
    setTheme(newTheme);
    localStorage.setItem('calendar-theme', newTheme);
  };

  const activeTheme = themeClasses[theme] || themeClasses.cosmo;

  return (
    <div className={activeTheme.bg}>
      {/* Top Navbar */}
      <header className={`border-b ${activeTheme.border} bg-slate-950/20 sticky top-0 z-10 backdrop-blur-md`}>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-md shadow-violet-500/10">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h1 className={`text-xl font-bold tracking-tight ${activeTheme.textHeading}`}>
              Kids Calendar Admin
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Theme Selector */}
            <div className="inline-flex rounded-xl bg-slate-900/60 border border-slate-800/40 p-0.5 shadow-sm">
              <button
                onClick={() => changeTheme('cosmo')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${theme === 'cosmo' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🌌 Cosmo
              </button>
              <button
                onClick={() => changeTheme('bubblegum')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${theme === 'bubblegum' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                🍬 Playful
              </button>
              <button
                onClick={() => changeTheme('jungle')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${theme === 'jungle' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-800'}`}
              >
                🌴 Jungle
              </button>
            </div>

            <nav className="flex items-center gap-3">
              <Link href="/admin" className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn}`}>
                Admin Dashboard
              </Link>
              <Link href="/" className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn}`}>
                Calendar
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${activeTheme.textHeading}`}>Review Queue</h2>
            <p className={`text-sm ${activeTheme.textMuted} mt-1`}>
              Verify and polish low-confidence extractions before they publish.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${activeTheme.badge}`}>
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
                          className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                        >
                          View Original Instagram Post
                        </a>
                      </div>
                      <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Caption Content</h4>
                      <p className={`text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap pr-2 ${activeTheme.cardText}`}>
                        {ev.rawCaption}
                      </p>
                    </div>
                    <div className={`mt-6 pt-4 border-t flex justify-between items-center ${activeTheme.border}`}>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Confidence: <span className={`font-mono ${activeTheme.accentText}`}>{(ev.confidence * 100).toFixed(0)}%</span>
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
                                placeholder="e.g. 10:00"
                                value={currentData.startTime || ''}
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
                                placeholder="e.g. 14:00"
                                value={currentData.endTime || ''}
                                onChange={(e) => handleFormChange('endTime', e.target.value)}
                                className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                              />
                            ) : (
                              <div className={`text-xs ${activeTheme.cardText}`}>{ev.endTime || 'Not specified'}</div>
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
                              <span className="inline-block rounded bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
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
                                className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                              />
                            ) : (
                              <div className={`text-xs ${activeTheme.cardText}`}>{ev.ageRange || 'All ages'}</div>
                            )}
                          </div>
                        </div>

                        {/* Age Group Structured Filter Enum */}
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Structured Age Filter</label>
                          {isEditing ? (
                            <select
                              value={currentData.ageGroup || 'all'}
                              onChange={(e) => handleFormChange('ageGroup', e.target.value)}
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                            >
                              <option value="infants">Infants (0-1 yrs)</option>
                              <option value="toddlers">Toddlers (2-4 yrs)</option>
                              <option value="preschoolers">Preschoolers (5-7 yrs)</option>
                              <option value="kids">Kids (8-12 yrs)</option>
                              <option value="teens">Teens (13+ yrs)</option>
                              <option value="all">All Ages / Family</option>
                            </select>
                          ) : (
                            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${activeTheme.badge}`}>
                              {ev.ageGroup || 'all'}
                            </span>
                          )}
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
                                className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                              />
                            ) : (
                              <div className={`text-xs ${activeTheme.cardText}`}>{ev.cost || 'Free'}</div>
                            )}
                          </div>
                          <div className="flex items-center pt-4">
                            {isEditing ? (
                              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!!currentData.isFree}
                                  onChange={(e) => handleFormChange('isFree', e.target.checked)}
                                  className="rounded border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-violet-600 focus:ring-violet-500"
                                />
                                <span className="text-slate-500 font-semibold">Mark as Free Event</span>
                              </label>
                            ) : (
                              <div className={`text-xs ${activeTheme.cardText}`}>
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
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition ${activeTheme.input}`}
                            />
                          ) : (
                            <div className={`text-xs ${activeTheme.cardText}`}>{ev.location || 'Not specified'}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Panel Buttons */}
                    <div className={`mt-8 pt-4 border-t flex justify-end gap-3 ${activeTheme.border}`}>
                      <button
                        onClick={() => saveEventStatus(ev.id, 'rejected')}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-500 hover:bg-red-500/10 border border-transparent transition"
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
