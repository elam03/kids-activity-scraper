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
  description: string;
}

export default function CalendarHome() {
  const [events, setEvents] = useState<Event[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Date orchestration
  const [currentPivotDate, setCurrentPivotDate] = useState(new Date());

  useEffect(() => {
    const fetchApprovedEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApprovedEvents();
  }, []);

  // Get date helper structures
  const getWeekDates = (pivot: Date) => {
    const dates = [];
    const day = pivot.getDay();
    // Start week from Sunday
    const startOfWeek = new Date(pivot);
    startOfWeek.setDate(pivot.getDate() - day);

    // Get 14 days (Current Week + Next Week)
    for (let i = 0; i < 14; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const getMonthDates = (pivot: Date) => {
    const year = pivot.getFullYear();
    const month = pivot.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const dates = [];
    // Backfill starting days from previous month
    const startOffset = firstDayOfMonth.getDay();
    for (let i = startOffset; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      dates.push(d);
    }
    // Days in current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      dates.push(d);
    }
    // Padding days from next month to complete grid
    const endOffset = 42 - dates.length; // 6 rows of 7 days
    for (let i = 1; i <= endOffset; i++) {
      const d = new Date(year, month + 1, i);
      dates.push(d);
    }

    return dates;
  };

  const weekDates = getWeekDates(currentPivotDate);
  const monthDates = getMonthDates(currentPivotDate);

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => {
      if (e.startDate === dateStr) return true;
      if (e.endDate && dateStr >= e.startDate && dateStr <= e.endDate) return true;
      return false;
    });
  };

  const formatMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const changePivotDate = (offset: number) => {
    const newPivot = new Date(currentPivotDate);
    if (viewMode === 'week') {
      newPivot.setDate(currentPivotDate.getDate() + offset * 14);
    } else {
      newPivot.setMonth(currentPivotDate.getMonth() + offset);
    }
    setCurrentPivotDate(newPivot);
  };

  const categoryColors: Record<string, string> = {
    sports: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    arts: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    nature: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    music: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    education: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    festival: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 px-4 py-8 sm:px-6 lg:px-8 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-7xl w-full">
        {/* Header Block */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b border-slate-900">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-200 to-indigo-200">
              Bay Area Kids Activities
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Curated kid-friendly activities, events, and outings in the San Jose / SF Bay Area.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'week' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Week View
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'month' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Month View
              </button>
            </div>

            {/* Admin link */}
            <a href="/admin" className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 transition">
              Admin Area
            </a>
          </div>
        </header>

        {/* Date Navigator */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-200">
            {viewMode === 'week' 
              ? `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[13].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : formatMonthName(currentPivotDate)
            }
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changePivotDate(-1)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPivotDate(new Date())}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition"
            >
              Today
            </button>
            <button
              onClick={() => changePivotDate(1)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading ? (
          <div className="flex justify-center items-center py-40">
            <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          /* Calendar view structures */
          viewMode === 'week' ? (
            /* Week View Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {weekDates.map((date, idx) => {
                const dayEvents = getEventsForDate(date);
                const isToday = new Date().toDateString() === date.toDateString();

                return (
                  <div 
                    key={idx} 
                    className={`rounded-2xl border p-4 flex flex-col h-72 min-h-72 overflow-hidden backdrop-blur-sm transition hover:shadow-lg ${
                      isToday 
                        ? 'border-violet-500/40 bg-violet-950/5 shadow-md shadow-violet-500/5' 
                        : 'border-slate-900 bg-slate-900/10'
                    }`}
                  >
                    {/* Day header */}
                    <div className="flex justify-between items-baseline mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-violet-400' : 'text-slate-500'}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className={`text-base font-bold ${isToday ? 'text-violet-400' : 'text-slate-300'}`}>
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Events body */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {dayEvents.length === 0 ? (
                        <div className="text-[10px] text-slate-600 italic py-4 text-center">No activities</div>
                      ) : (
                        dayEvents.map(ev => (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className="p-2 rounded-xl border border-slate-800 bg-slate-950/80 cursor-pointer transition hover:border-slate-700 active:scale-[0.98] group"
                          >
                            <div className="text-[11px] font-bold text-slate-200 line-clamp-2 leading-tight group-hover:text-violet-400 transition">
                              {ev.title}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 text-[9px] text-slate-500">
                              <span>{ev.startTime || 'All day'}</span>
                              <span>•</span>
                              <span className="truncate">{ev.location?.split(',')[0] || 'TBD'}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Month View Grid */
            <div className="grid grid-cols-7 border border-slate-900 rounded-2xl overflow-hidden bg-slate-950/20 divide-y divide-slate-900 divide-x divide-slate-900 shadow-md">
              {/* Day names headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-950/60 border-slate-900">
                  {day}
                </div>
              ))}

              {/* Month dates */}
              {monthDates.map((date, idx) => {
                const dayEvents = getEventsForDate(date);
                const isToday = new Date().toDateString() === date.toDateString();
                const isCurrentMonth = date.getMonth() === currentPivotDate.getMonth();

                return (
                  <div 
                    key={idx} 
                    className={`p-2 h-28 overflow-hidden flex flex-col justify-between transition ${
                      isToday ? 'bg-violet-950/10' : 'bg-transparent'
                    } ${isCurrentMonth ? '' : 'opacity-35'}`}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <span className={`text-[10px] font-bold ${isToday ? 'text-violet-400' : 'text-slate-500'}`}>
                        {date.getDate()}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium border border-slate-800 bg-slate-950 text-slate-300 truncate cursor-pointer hover:border-slate-700 transition"
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[8px] text-center font-bold text-violet-400">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Modal Dialog for Event Details */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Event Details Content */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-block border px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${categoryColors[selectedEvent.category] || categoryColors.other}`}>
                  {selectedEvent.category}
                </span>
                <span className="text-xs text-slate-500">
                  via @{selectedEvent.source.handle}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-100">{selectedEvent.title}</h3>
            </div>

            <div className="mt-6 space-y-4 text-xs text-slate-300">
              {/* Date & Time metadata */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">When</div>
                  <div className="font-semibold text-slate-200">
                    {selectedEvent.startDate}
                    {selectedEvent.endDate && ` to ${selectedEvent.endDate}`}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    {selectedEvent.startTime ? `${selectedEvent.startTime} - ${selectedEvent.endTime || 'End'}` : 'All day'}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Pricing & Age</div>
                  <div className="font-semibold text-slate-200">
                    {selectedEvent.cost || 'Free'}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Age: {selectedEvent.ageRange || 'All ages'}
                  </div>
                </div>
              </div>

              {/* Location metadata */}
              {selectedEvent.location && (
                <div>
                  <h4 className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Where</h4>
                  <div className="flex gap-2 items-center text-slate-200 font-semibold">
                    <svg className="h-4 w-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{selectedEvent.location}</span>
                  </div>
                </div>
              )}

              {/* Description body */}
              <div className="border-t border-slate-900 pt-4">
                <h4 className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Details</h4>
                <p className="text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap pr-1 custom-scrollbar">
                  {selectedEvent.description}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-4 border-t border-slate-900 flex justify-between items-center gap-4">
              <a
                href={selectedEvent.rawPostUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                View Original Instagram Post
              </a>
              {selectedEvent.registrationUrl && (
                <a
                  href={selectedEvent.registrationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition active:scale-[0.98]"
                >
                  Register / Sign Up
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
