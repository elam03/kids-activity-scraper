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
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'map' | 'weekend'>('week');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDateForDetails, setSelectedDateForDetails] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Theme State
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

  // Filter events based on selections
  const filteredEvents = events.filter(e => {
    // Some events might have an undefined or null ageGroup in old scraped records; default to "all"
    const eventAge = (e as any).ageGroup || 'all';
    const matchesAge = selectedAgeGroup === 'all' || eventAge === selectedAgeGroup;
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesAge && matchesCategory;
  });

  const singleDayEvents = filteredEvents.filter(e => !isMultiDayEvent(e));
  const multiDayEvents = filteredEvents.filter(e => isMultiDayEvent(e));

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

  const getWeekendDates = (pivot: Date) => {
    const dates = [];
    const day = pivot.getDay();
    const startOfWeek = new Date(pivot);
    startOfWeek.setDate(pivot.getDate() - day); // Start on Sunday
    
    // Friday (5), Saturday (6), Sunday (7) of this week
    for (const dayIndex of [5, 6, 7]) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + dayIndex);
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
  const weekendDates = getWeekendDates(currentPivotDate);
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
    } else if (viewMode === 'weekend') {
      return isMultiDayActiveInRange(e, weekendDates[0], weekendDates[2]);
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
    } else if (viewMode === 'weekend') {
      newPivot.setDate(currentPivotDate.getDate() + offset * 7);
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
    }
  };

  const activeTheme = themeClasses[theme] || themeClasses.cosmo;

  return (
    <div className={activeTheme.bg}>
      <div className="mx-auto max-w-7xl w-full">
        {/* Header Block */}
        <header className={`flex flex-col md:flex-row justify-between items-center gap-6 mb-8 pb-6 border-b ${activeTheme.border}`}>
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${activeTheme.headerText}`}>
              Bay Area Kids Activities
            </h1>
            <p className={`text-sm ${activeTheme.textMuted} mt-1`}>
              Curated kid-friendly activities, events, and outings in the San Jose / SF Bay Area.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Theme Selector */}
            <div className="inline-flex rounded-xl bg-slate-900/60 border border-slate-800/40 p-0.5 shadow-sm">
              <button
                onClick={() => changeTheme('cosmo')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${theme === 'cosmo' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title="Cosmo Dark Mode"
              >
                🌌 Cosmo
              </button>
              <button
                onClick={() => changeTheme('bubblegum')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${theme === 'bubblegum' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                title="Bubblegum Light Mode"
              >
                🍬 Playful
              </button>
              <button
                onClick={() => changeTheme('jungle')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${theme === 'jungle' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-800'}`}
                title="Jungle Adventure Mode"
              >
                🌴 Jungle
              </button>
            </div>

            {/* View Selectors */}
            <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${viewMode === 'week' ? activeTheme.activeTab : activeTheme.inactiveTab}`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('weekend')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${viewMode === 'weekend' ? activeTheme.activeTab : activeTheme.inactiveTab}`}
              >
                Weekend
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${viewMode === 'month' ? activeTheme.activeTab : activeTheme.inactiveTab}`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${viewMode === 'map' ? activeTheme.activeTab : activeTheme.inactiveTab}`}
              >
                Map
              </button>
            </div>

            <a href="/admin" className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn}`}>
              Admin Area
            </a>
          </div>
        </header>

        {/* Filters Toolbar */}
        <div className={`flex flex-wrap gap-4 items-center justify-between p-4 mb-6 rounded-2xl border ${activeTheme.card} transition-all duration-300`}>
          <div className="flex flex-wrap items-center gap-4">
            {/* Age Filter */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Age Range:</label>
              <select
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value)}
                className="rounded-xl border border-slate-300/40 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs outline-none transition focus:border-violet-500 max-w-[160px] cursor-pointer"
              >
                <option value="all">👶 All Ages / Family</option>
                <option value="infants">🤱 Infants (0-1 yrs)</option>
                <option value="toddlers">🍼 Toddlers (2-4 yrs)</option>
                <option value="preschoolers">🎨 Preschoolers (5-7 yrs)</option>
                <option value="kids">🎒 Kids (8-12 yrs)</option>
                <option value="teens">🛹 Teens (13+ yrs)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-slate-300/40 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs outline-none transition focus:border-violet-500 max-w-[160px] cursor-pointer"
              >
                <option value="all">✨ All Categories</option>
                <option value="sports">⚽ Sports</option>
                <option value="arts">🎭 Arts & Crafts</option>
                <option value="nature">🌳 Nature & Outings</option>
                <option value="music">🎵 Music & Dance</option>
                <option value="education">🔬 Science & Learning</option>
                <option value="festival">🍿 Festivals & Events</option>
                <option value="other">💡 General/Other</option>
              </select>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Showing {filteredEvents.length} activities
          </div>
        </div>

        {/* Date Navigator (Hidden in Map View since map shows all events) */}
        {viewMode !== 'map' && (
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">
              {viewMode === 'week' 
                ? `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[13].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : viewMode === 'weekend'
                ? `Weekend of ${weekendDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekendDates[2].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
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
                            ? 'border-violet-500/50 bg-violet-950/10 shadow-md shadow-violet-500/10' 
                            : activeTheme.card
                        }`}
                      >
                        {/* Day header */}
                        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-200/10">
                          <div className="flex flex-col">
                            <span className={`text-[9px] font-extrabold uppercase tracking-widest ${isToday ? 'text-violet-500' : 'text-slate-500'}`}>
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className={`text-base font-extrabold ${isToday ? 'text-violet-500' : 'text-slate-700 dark:text-slate-300'}`}>
                              {date.getDate()}
                            </span>
                          </div>
                          {dayEvents.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-violet-600/90 text-white text-[8px] font-extrabold shadow-sm">
                              {dayEvents.length} items
                            </span>
                          )}
                        </div>

                        {/* Events list */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {dayEvents.length === 0 ? (
                            <div className="text-[10px] text-slate-500 italic py-6 text-center">No activities</div>
                          ) : (
                            <>
                              {dayEvents.length > visibleLimit && (
                                <button
                                  onClick={() => setSelectedDateForDetails(date)}
                                  className="w-full py-1 mb-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-[9px] font-bold text-white shadow-sm transition active:scale-[0.98]"
                                >
                                  ⚡ +{dayEvents.length - visibleLimit} more activities
                                </button>
                              )}
                              {dayEvents.slice(0, visibleLimit).map(ev => (
                                <div
                                  key={ev.id}
                                  onClick={() => setSelectedEvent(ev)}
                                  className="p-2 rounded-xl border border-slate-300/40 dark:border-slate-800 bg-white/70 dark:bg-slate-950/80 cursor-pointer transition hover:border-slate-400 dark:hover:border-slate-700 active:scale-[0.98] group"
                                >
                                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                                    {ev.title}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500">
                                    <span>{ev.startTime || 'All day'}</span>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : viewMode === 'weekend' ? (
                /* Weekend View Grid (Friday, Saturday, Sunday) with wide layout */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {weekendDates.map((date, idx) => {
                    const dayEvents = getSingleDayEventsForDate(date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const visibleLimit = 5; // show more events in wide layout

                    return (
                      <div 
                        key={idx} 
                        className={`rounded-2xl border p-6 flex flex-col h-[400px] min-h-[400px] overflow-hidden backdrop-blur-sm transition hover:shadow-xl ${
                          isToday 
                            ? 'border-violet-500/50 bg-violet-950/10 shadow-md shadow-violet-500/10' 
                            : activeTheme.card
                        }`}
                      >
                        {/* Day header */}
                        <div className="flex justify-between items-center mb-4 border-b border-slate-200/10 pb-3">
                          <div className="flex flex-col">
                            <span className={`text-xs font-bold uppercase tracking-widest ${isToday ? 'text-violet-500' : 'text-slate-400'}`}>
                              {date.toLocaleDateString('en-US', { weekday: 'long' })}
                            </span>
                            <span className={`text-2xl font-extrabold ${isToday ? 'text-violet-500' : 'text-slate-800 dark:text-slate-200'}`}>
                              {date.getDate()}
                            </span>
                          </div>
                          {dayEvents.length > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-violet-600/90 text-white text-xs font-extrabold shadow-sm">
                              {dayEvents.length} activities
                            </span>
                          )}
                        </div>

                        {/* Events list */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                          {dayEvents.length === 0 ? (
                            <div className="text-xs text-slate-500 italic py-12 text-center">No weekend activities</div>
                          ) : (
                            <>
                              {dayEvents.length > visibleLimit && (
                                <button
                                  onClick={() => setSelectedDateForDetails(date)}
                                  className="w-full py-1.5 mb-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-sm transition active:scale-[0.98]"
                                >
                                  ⚡ +{dayEvents.length - visibleLimit} more activities today
                                </button>
                              )}
                              {dayEvents.slice(0, visibleLimit).map(ev => (
                                <div
                                  key={ev.id}
                                  onClick={() => setSelectedEvent(ev)}
                                  className="p-3 rounded-xl border border-slate-300/40 dark:border-slate-800 bg-white/70 dark:bg-slate-950/80 cursor-pointer transition hover:border-slate-400 dark:hover:border-slate-700 active:scale-[0.98] group"
                                >
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                                    {ev.title}
                                  </div>
                                  <div className="flex justify-between items-center mt-2.5 text-[10px] text-slate-500">
                                    <span>{ev.startTime || 'All day'}</span>
                                    <span className="text-slate-400">{ev.location?.split(',')[0]}</span>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Month View Grid */
                <div className={`grid grid-cols-7 border ${activeTheme.border} rounded-2xl overflow-hidden bg-slate-950/20 divide-y ${activeTheme.border.replace('border-', 'divide-')} divide-x ${activeTheme.border.replace('border-', 'divide-')} shadow-md`}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-950/40">
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
                          <span className={`text-[10px] font-bold ${isToday ? 'text-violet-500' : 'text-slate-500'}`}>
                            {date.getDate()}
                          </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {dayEvents.slice(0, visibleLimit).map(ev => (
                            <div
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium border border-slate-300/40 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 transition"
                              title={ev.title}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > visibleLimit && (
                            <button
                              onClick={() => setSelectedDateForDetails(date)}
                              className="w-full text-center text-[8px] font-bold text-violet-500 hover:text-violet-600 mt-1"
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
                <div className={`text-center py-10 border border-dashed ${activeTheme.border} rounded-2xl text-slate-500 text-xs`}>
                  No active multi-day programs in this range.
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {activeMultiDayEvents.map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`p-4 rounded-2xl border cursor-pointer shadow-md transition group ${activeTheme.card}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block border px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${categoryColors[ev.category] || categoryColors.other}`}>
                          {ev.category}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {ev.startDate} to {ev.endDate}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition leading-snug">
                        {ev.title}
                      </h4>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {ev.description}
                      </p>
                      <div className="mt-3 flex justify-between items-center text-[9px] text-slate-500">
                        <span className="font-medium">📍 {ev.location?.split(',')[0] || 'Multiple Locations'}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-300">{ev.cost || 'Free'}</span>
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
          <div className={`w-full max-w-xl rounded-2xl border p-6 relative animate-in fade-in zoom-in duration-200 ${activeTheme.modal}`}>
            <button
              onClick={() => setSelectedEvent(null)}
              className={`absolute top-4 right-4 p-2 rounded-lg transition ${activeTheme.closeBtn}`}
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
                <span className="text-xs text-slate-500 font-medium">
                  via @{selectedEvent.source.handle}
                </span>
              </div>
              <h3 className={`text-xl ${activeTheme.modalTitle}`}>{selectedEvent.title}</h3>
            </div>

            <div className="mt-6 space-y-4 text-xs">
              <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border ${activeTheme.modalInner}`}>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">When</div>
                  <div className={`font-semibold ${activeTheme.accentText}`}>
                    {selectedEvent.startDate}
                    {selectedEvent.endDate && ` to ${selectedEvent.endDate}`}
                  </div>
                  <div className="text-slate-500 mt-0.5 font-medium">
                    {selectedEvent.startTime ? `${selectedEvent.startTime} - ${selectedEvent.endTime || 'End'}` : 'All day'}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Pricing & Age</div>
                  <div className={`font-semibold ${activeTheme.accentText}`}>
                    {selectedEvent.cost || 'Free'}
                  </div>
                  <div className="text-slate-500 mt-0.5 font-medium">
                    Age: {selectedEvent.ageRange || 'All ages'}
                  </div>
                </div>
              </div>

              {selectedEvent.location && (
                <div>
                  <h4 className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Where</h4>
                  <div className={`flex gap-2 items-center font-semibold ${activeTheme.accentText}`}>
                    <svg className="h-4 w-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{selectedEvent.location}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200/10 pt-4">
                <h4 className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Details</h4>
                <p className={`leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap pr-1 custom-scrollbar ${activeTheme.cardText}`}>
                  {selectedEvent.description}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200/10 flex justify-between items-center gap-4">
              <a
                href={selectedEvent.rawPostUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 underline"
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
          <div className={`w-full max-w-lg rounded-2xl border p-6 relative animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col ${activeTheme.modal}`}>
            <button
              onClick={() => setSelectedDateForDetails(null)}
              className={`absolute top-4 right-4 p-2 rounded-lg transition ${activeTheme.closeBtn}`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-4">
              <h3 className={`text-lg ${activeTheme.modalTitle}`}>
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
                  className={`p-4 rounded-xl border cursor-pointer transition ${activeTheme.cardAlt}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`inline-block border px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${categoryColors[ev.category] || categoryColors.other}`}>
                      {ev.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {ev.startTime || 'All day'}
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold leading-snug ${activeTheme.textHeading}`}>
                    {ev.title}
                  </h4>
                  <div className="mt-2 text-[10px] text-slate-500 truncate">
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
