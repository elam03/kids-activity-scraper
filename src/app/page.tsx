'use client';

import { useState, useEffect } from 'react';
import dynamicNext from 'next/dynamic';

export const dynamic = 'force-dynamic';

// Dynamically import MapView client-side only to prevent SSR conflicts with Leaflet
const MapView = dynamicNext(() => import('@/components/MapView'), {
  ssr: false,
});

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
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'map'>('week');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDateForDetails, setSelectedDateForDetails] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Date navigation state
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

  // Classify events
  const isMultiDayEvent = (e: Event) => {
    return e.endDate !== null && e.startDate !== e.endDate;
  };

  const singleDayEvents = events.filter(e => !isMultiDayEvent(e));
  const multiDayEvents = events.filter(e => isMultiDayEvent(e));

  // Get date helper structures
  const getWeekDates = (pivot: Date) => {
    const dates = [];
    const day = pivot.getDay();
    const startOfWeek = new Date(pivot);
    startOfWeek.setDate(pivot.getDate() - day); // Start on Sunday

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
    const startOffset = firstDayOfMonth.getDay();
    for (let i = startOffset; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      dates.push(d);
    }
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      dates.push(d);
    }
    const endOffset = 42 - dates.length; // 6 rows of 7 days
    for (let i = 1; i <= endOffset; i++) {
      const d = new Date(year, month + 1, i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentPivotDate);
  const monthDates = getMonthDates(currentPivotDate);

  const formatLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filters only single-day events to display inside the daily grid cells
  const getSingleDayEventsForDate = (date: Date) => {
    const dateStr = formatLocalDateString(date);
    return singleDayEvents.filter(e => e.startDate === dateStr);
  };

  // Helper check for active multi-day events in the current range
  const isMultiDayActiveInRange = (e: Event, rangeStart: Date, rangeEnd: Date) => {
    const startStr = formatLocalDateString(rangeStart);
    const endStr = formatLocalDateString(rangeEnd);
    if (!e.endDate) return false;
    return (e.startDate <= endStr && e.endDate >= startStr);
  };

  // Filter multi-day programs active during the selected view range
  const activeMultiDayEvents = multiDayEvents.filter(e => {
    if (viewMode === 'week') {
      return isMultiDayActiveInRange(e, weekDates[0], weekDates[13]);
    } else if (viewMode === 'month') {
      return isMultiDayActiveInRange(e, monthDates[0], monthDates[41]);
    }
    return true; // show all in map view
  });

  const formatMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const changePivotDate = (offset: number) => {
    const newPivot = new Date(currentPivotDate);
    if (viewMode === 'week') {
      newPivot.setDate(currentPivotDate.getDate() + offset * 14);
    } else if (viewMode === 'month') {
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
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'map' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Map View
              </button>
            </div>

            <a href="/admin" className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 transition">
              Admin Area
            </a>
          </div>
        </header>

        {/* Date Navigator (Hidden in Map View since map shows all events) */}
        {viewMode !== 'map' && (
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
        )}

        {/* Loading Overlay */}
        {loading ? (
          <div className="flex justify-center items-center py-40">
            <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          /* Main Layout Grid */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Left 3 Cols: Calendar Grid OR Map View */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  {viewMode === 'map' ? 'Geographic Event View' : 'Daily Schedule'}
                </h2>
              </div>

              {viewMode === 'map' ? (
                /* Map View Component */
                <MapView 
                  events={events} 
                  onSelectEvent={(ev) => setSelectedEvent(ev)} 
                />
              ) : viewMode === 'week' ? (
                /* Week View Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {weekDates.map((date, idx) => {
                    const dayEvents = getSingleDayEventsForDate(date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const visibleLimit = 3;

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

                        {/* Events list */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {dayEvents.length === 0 ? (
                            <div className="text-[10px] text-slate-600 italic py-4 text-center">No activities</div>
                          ) : (
                            <>
                              {dayEvents.slice(0, visibleLimit).map(ev => (
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
                                  </div>
                                </div>
                              ))}
                              {dayEvents.length > visibleLimit && (
                                <button
                                  onClick={() => setSelectedDateForDetails(date)}
                                  className="w-full py-1.5 rounded-lg border border-dashed border-violet-500/20 bg-violet-500/5 text-[9px] font-bold text-violet-400 hover:bg-violet-500/10 transition"
                                >
                                  +{dayEvents.length - visibleLimit} more activities
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Month View Grid */
                <div className="grid grid-cols-7 border border-slate-900 rounded-2xl overflow-hidden bg-slate-950/20 divide-y divide-slate-900 divide-x divide-slate-900 shadow-md">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-950/60 border-slate-900">
                      {day}
                    </div>
                  ))}

                  {monthDates.map((date, idx) => {
                    const dayEvents = getSingleDayEventsForDate(date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const isCurrentMonth = date.getMonth() === currentPivotDate.getMonth();
                    const visibleLimit = 2;

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
                          {dayEvents.slice(0, visibleLimit).map(ev => (
                            <div
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium border border-slate-800 bg-slate-950 text-slate-300 truncate cursor-pointer hover:border-slate-700 transition"
                              title={ev.title}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > visibleLimit && (
                            <button
                              onClick={() => setSelectedDateForDetails(date)}
                              className="w-full text-center text-[8px] font-bold text-violet-400 hover:text-violet-300 mt-1"
                            >
                              +{dayEvents.length - visibleLimit} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right 1 Col: Ongoing & Multi-day Programs Section */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Ongoing Programs</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Camps, museum exhibits, and season runs</p>
              </div>

              {activeMultiDayEvents.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-900 rounded-2xl text-slate-500 text-xs">
                  No active multi-day programs in this range.
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {activeMultiDayEvents.map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="p-4 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800 hover:bg-slate-900/30 cursor-pointer shadow-md transition group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block border px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${categoryColors[ev.category] || categoryColors.other}`}>
                          {ev.category}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {ev.startDate} to {ev.endDate}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-violet-400 transition leading-snug">
                        {ev.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {ev.description}
                      </p>
                      <div className="mt-3 flex justify-between items-center text-[9px] text-slate-500">
                        <span>📍 {ev.location?.split(',')[0] || 'Multiple Locations'}</span>
                        <span className="font-semibold text-slate-300">{ev.cost || 'Free'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Modal Dialog for Event Details */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

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

              <div className="border-t border-slate-900 pt-4">
                <h4 className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Details</h4>
                <p className="text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap pr-1 custom-scrollbar">
                  {selectedEvent.description}
                </p>
              </div>
            </div>

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

      {/* Dense Day Detailed List Modal */}
      {selectedDateForDetails && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
            <button
              onClick={() => setSelectedDateForDetails(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-100">
                Activities for {selectedDateForDetails.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Select an event below to view its full details.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {getSingleDayEventsForDate(selectedDateForDetails).map(ev => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelectedDateForDetails(null);
                    setSelectedEvent(ev);
                  }}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 cursor-pointer hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`inline-block border px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${categoryColors[ev.category] || categoryColors.other}`}>
                      {ev.category}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {ev.startTime || 'All day'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 leading-snug">
                    {ev.title}
                  </h4>
                  <div className="mt-2 text-[10px] text-slate-400 truncate">
                    📍 {ev.location || 'Location TBD'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
