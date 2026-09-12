'use client';

import { useState, useEffect } from 'react';
import dynamicNext from 'next/dynamic';

export const dynamic = 'force-dynamic';

import { toggleAgeGroup } from '@/lib/event-utils';
import {
  useCalendarQuery,
  calculateNextPivotDate,
  type CalendarEvent,
} from '@/lib/calendar-query';
import DayTimelineView from '@/components/calendar/DayTimelineView';
import MonthGridView from '@/components/calendar/MonthGridView';
import OngoingProgramsList from '@/components/calendar/OngoingProgramsList';
import EventDetailModal from '@/components/calendar/EventDetailModal';
import DayDetailModal from '@/components/calendar/DayDetailModal';

// Dynamically import MapView client-side only to prevent SSR conflicts with Leaflet
const MapView = dynamicNext(() => import('@/components/MapView'), {
  ssr: false,
});

const AGE_GROUPS = [
  { id: 'all', label: 'All Ages', emoji: '👶' },
  { id: 'infants', label: 'Infants (0-1)', emoji: '🤱' },
  { id: 'toddlers', label: 'Toddlers (2-4)', emoji: '🍼' },
  { id: 'preschoolers', label: 'Preschoolers (5-7)', emoji: '🎨' },
  { id: 'kids', label: 'Kids (8-12)', emoji: '🎒' },
  { id: 'teens', label: 'Teens (13+)', emoji: '🛹' },
] as const;

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
    input: 'bg-slate-950 text-slate-100 border-slate-800 focus:border-violet-500',
    btnMore: 'text-violet-400 hover:bg-violet-500/10',
    chevron: 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900',
    themePicker: 'bg-slate-900/60 border-slate-800/40',
    themePickerInactive: 'text-slate-400 hover:text-slate-200',
    viewSelectBg: 'bg-slate-900 border border-slate-800',
  },
  bubblegum: {
    bg: 'min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-100 via-purple-50 to-indigo-100 px-4 py-8 sm:px-6 lg:px-8 text-slate-800 flex flex-col justify-between transition-all duration-300',
    text: 'text-slate-800',
    textHeading: 'text-purple-950 font-bold',
    textMuted: 'text-purple-900 font-semibold',
    card: 'bg-white border-purple-200 shadow-md shadow-purple-500/5 hover:border-purple-300',
    cardAlt: 'bg-purple-50/80 border-purple-200 hover:border-purple-300',
    cardBorder: 'border-purple-200',
    cardText: 'text-slate-800 font-medium',
    headerText: 'bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 font-extrabold',
    navBtn: 'bg-white border-purple-200 hover:border-purple-300 text-purple-900 font-semibold shadow-sm',
    badge: 'bg-purple-100 text-purple-800 border-purple-200 font-bold',
    activeTab: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
    inactiveTab: 'text-purple-700 hover:text-purple-900',
    border: 'border-purple-200',
    modal: 'bg-white border-purple-300 text-slate-900 shadow-2xl shadow-purple-500/20',
    modalInner: 'bg-purple-50 border-purple-200 text-purple-950 font-medium',
    modalTitle: 'text-purple-950 font-bold',
    closeBtn: 'text-purple-500 hover:text-purple-700 hover:bg-purple-100/70',
    accentText: 'text-purple-900 font-bold',
    input: 'border-purple-200 bg-white text-purple-950 placeholder:text-purple-400 focus:border-purple-500',
    btnMore: 'text-purple-600 hover:bg-purple-100/50',
    chevron: 'border-purple-200 text-purple-700 hover:text-purple-900 hover:bg-white',
    themePicker: 'bg-white/80 border-purple-200 shadow-sm',
    themePickerInactive: 'text-purple-700 hover:text-purple-950',
    viewSelectBg: 'bg-white border border-purple-200 shadow-sm',
  },
  jungle: {
    bg: 'min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100 via-yellow-50 to-amber-100 px-4 py-8 sm:px-6 lg:px-8 text-emerald-950 flex flex-col justify-between transition-all duration-300',
    text: 'text-emerald-950',
    textHeading: 'text-emerald-950 font-bold',
    textMuted: 'text-emerald-900 font-semibold',
    card: 'bg-white border-emerald-200 shadow-md shadow-emerald-500/5 hover:border-emerald-300',
    cardAlt: 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-300',
    cardBorder: 'border-emerald-200',
    cardText: 'text-emerald-950 font-medium',
    headerText: 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-amber-700 font-extrabold',
    navBtn: 'bg-white border-emerald-200 hover:border-emerald-300 text-emerald-900 font-semibold shadow-sm',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold',
    activeTab: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
    inactiveTab: 'text-emerald-800 hover:text-emerald-950',
    border: 'border-emerald-200',
    modal: 'bg-white border-emerald-300 text-emerald-950 shadow-2xl shadow-emerald-500/20',
    modalInner: 'bg-emerald-50 border-emerald-200 text-emerald-950 font-medium',
    modalTitle: 'text-emerald-950 font-bold',
    closeBtn: 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/70',
    accentText: 'text-emerald-900 font-bold',
    input: 'border-emerald-200 bg-white text-emerald-950 placeholder:text-emerald-500 focus:border-emerald-500',
    btnMore: 'text-emerald-600 hover:bg-emerald-100/50',
    chevron: 'border-emerald-200 text-emerald-800 hover:text-emerald-950 hover:bg-white',
    themePicker: 'bg-white/80 border-emerald-200 shadow-sm',
    themePickerInactive: 'text-emerald-800 hover:text-emerald-950',
    viewSelectBg: 'bg-white border border-emerald-200 shadow-sm',
  },
};

export default function CalendarHome() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'map'>('day');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateForDetails, setSelectedDateForDetails] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>(['all']);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleToggleAgeGroup = (groupId: string) => {
    setSelectedAgeGroups((prev) => toggleAgeGroup(prev, groupId));
  };

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

  // Escape key: prioritise back-navigation over full dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selectedEvent) {
        setSelectedEvent(null);
        if (!selectedDateForDetails) return;
      } else if (selectedDateForDetails) {
        setSelectedDateForDetails(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvent, selectedDateForDetails]);

  // Deep Calendar Query hook
  const {
    filteredEvents,
    weekDates,
    monthDates,
    activeMultiDayEvents,
    getEventsForDate,
  } = useCalendarQuery(events, {
    viewMode,
    currentPivotDate,
    selectedAgeGroups,
    selectedCategory,
  });

  const changePivot = (offset: number) => {
    if (viewMode === 'day' || viewMode === 'month') {
      setCurrentPivotDate((prev) => calculateNextPivotDate(prev, viewMode, offset));
    }
  };

  const formatMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const activeTheme = themeClasses[theme] || themeClasses.cosmo;

  return (
    <div className={activeTheme.bg}>
      <div className="mx-auto max-w-7xl w-full">
        {/* Header bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/20">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <h1 className={`text-2xl tracking-tight ${activeTheme.headerText}`}>
                Kids Calendar South Bay
              </h1>
              <p className={`text-xs ${activeTheme.textMuted}`}>
                Discover activities, festivals, camps & outings in Silicon Valley
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Theme Selector */}
            <div className={`inline-flex rounded-xl p-0.5 ${activeTheme.themePicker}`}>
              <button
                onClick={() => changeTheme('cosmo')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                  theme === 'cosmo' ? 'bg-violet-600 text-white' : activeTheme.themePickerInactive
                }`}
              >
                🌌 Cosmo
              </button>
              <button
                onClick={() => changeTheme('bubblegum')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                  theme === 'bubblegum' ? 'bg-pink-500 text-white' : activeTheme.themePickerInactive
                }`}
              >
                🍬 Playful
              </button>
              <button
                onClick={() => changeTheme('jungle')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                  theme === 'jungle' ? 'bg-emerald-600 text-white' : activeTheme.themePickerInactive
                }`}
              >
                🌴 Jungle
              </button>
            </div>

            {/* View Selectors */}
            <div className={`inline-flex rounded-xl p-0.5 ${activeTheme.viewSelectBg}`}>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'day' ? activeTheme.activeTab : activeTheme.inactiveTab
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'month' ? activeTheme.activeTab : activeTheme.inactiveTab
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'map' ? activeTheme.activeTab : activeTheme.inactiveTab
                }`}
              >
                Map
              </button>
            </div>

            <a
              href="/admin"
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn}`}
            >
              Admin Area
            </a>
          </div>
        </header>

        {/* Filters Toolbar */}
        <div
          className={`flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between p-4 mb-6 rounded-2xl border ${activeTheme.card} transition-all duration-300`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full lg:w-auto">
            {/* Age Filter Multi-Select Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 shrink-0">
                Age Range:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {AGE_GROUPS.map((group) => {
                  const isSelected = selectedAgeGroups.includes(group.id);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleToggleAgeGroup(group.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition border ${
                        isSelected
                          ? `${activeTheme.activeTab} border-transparent shadow-sm`
                          : `${activeTheme.navBtn} opacity-75 hover:opacity-100`
                      }`}
                    >
                      <span>{group.emoji}</span> <span className="ml-1">{group.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`rounded-xl border px-3 py-1.5 text-xs outline-none transition max-w-[160px] cursor-pointer ${activeTheme.input}`}
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

          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0 self-end lg:self-auto">
            Showing {filteredEvents.length} activities
          </div>
        </div>

        {/* Date Navigator (Hidden in Map View since map shows all events) */}
        {viewMode !== 'map' && (
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-bold ${activeTheme.textHeading}`}>
              {viewMode === 'day'
                ? `Week of ${weekDates[0].toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })} - ${weekDates[13].toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : formatMonthName(currentPivotDate)}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePivot(-1)}
                className={`p-2 rounded-lg border transition ${activeTheme.chevron}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPivotDate(new Date())}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${activeTheme.chevron}`}
              >
                Today
              </button>
              <button
                onClick={() => changePivot(1)}
                className={`p-2 rounded-lg border transition ${activeTheme.chevron}`}
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
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
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
                <MapView events={events} onSelectEvent={(ev) => setSelectedEvent(ev)} />
              ) : viewMode === 'day' ? (
                <DayTimelineView
                  weekDates={weekDates}
                  getEventsForDate={getEventsForDate}
                  onSelectDate={(d) => setSelectedDateForDetails(d)}
                  activeTheme={activeTheme}
                />
              ) : (
                <MonthGridView
                  monthDates={monthDates}
                  currentPivotDate={currentPivotDate}
                  getEventsForDate={getEventsForDate}
                  onSelectDate={(d) => setSelectedDateForDetails(d)}
                  activeTheme={activeTheme}
                />
              )}
            </div>

            {/* Right 1 Col: Ongoing & Multi-day Programs Section */}
            <OngoingProgramsList
              events={activeMultiDayEvents}
              categoryColors={categoryColors}
              activeTheme={activeTheme}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />
          </div>
        )}
      </div>

      {/* Modal Dialog for Event Details */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          categoryColors={categoryColors}
          activeTheme={activeTheme}
          isFromDayModal={Boolean(selectedDateForDetails)}
          onClose={() => {
            setSelectedEvent(null);
            setSelectedDateForDetails(null);
          }}
          onBackToDay={() => setSelectedEvent(null)}
        />
      )}

      {/* Day Detail Modal */}
      {selectedDateForDetails && (
        <DayDetailModal
          date={selectedDateForDetails}
          events={getEventsForDate(selectedDateForDetails)}
          activeTheme={activeTheme}
          onClose={() => setSelectedDateForDetails(null)}
          onSelectEvent={(ev) => setSelectedEvent(ev)}
        />
      )}
    </div>
  );
}
