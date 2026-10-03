'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { CalendarEvent } from '@/lib/calendar-query';
import { getDirectionsUrl } from '@/lib/location-utils';
import {
  formatDateToIsoDate,
  formatEventTime,
  filterLeanEvents,
  formatSpelledYear,
  formatTrackedMonth,
  getPlannerMonthCells,
  PLANNER_WEEKDAYS,
  type PlannerDayCell,
} from '@/lib/lean-calendar';

/**
 * Maps event category and price to authentic planner highlighter markers
 */
function getEventHighlighterStyle(event: CalendarEvent): {
  highlighterClass: string;
  dotColor: string;
  label: string;
} {
  if (event.isFree) {
    return {
      highlighterClass: 'bg-[#fef08a] text-[#1e3a8a]', // Soft yellow highlighter
      dotColor: '#eab308',
      label: 'Free Event',
    };
  }

  switch (event.category) {
    case 'arts':
    case 'music':
      return {
        highlighterClass: 'bg-[#fbcfe8] text-[#1e3a8a]', // Soft pink highlighter
        dotColor: '#ec4899',
        label: 'Arts & Music',
      };
    case 'sports':
    case 'nature':
      return {
        highlighterClass: 'bg-[#86efac] text-[#1e3a8a]', // Soft green highlighter
        dotColor: '#22c55e',
        label: 'Sports & Nature',
      };
    case 'education':
      return {
        highlighterClass: 'bg-[#fed7aa] text-[#1e3a8a]', // Soft peach/orange highlighter
        dotColor: '#f97316',
        label: 'Science & Camps',
      };
    default:
      return {
        highlighterClass: 'bg-[#bae6fd] text-[#1e3a8a]', // Soft light blue highlighter
        dotColor: '#0284c7',
        label: 'Festivals & Events',
      };
  }
}

export default function PaperPlannerCalendarPage() {
  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateToIsoDate(todayDate), [todayDate]);

  const [pivotDate, setPivotDate] = useState<Date>(todayDate);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected event for note popup / drawer
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateForList, setSelectedDateForList] = useState<string | null>(null);

  // Optional quick filter
  const [freeOnly, setFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch approved events
  useEffect(() => {
    let isMounted = true;
    async function loadEvents() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/events');
        if (!res.ok) {
          throw new Error(`Failed to load events: HTTP ${res.status}`);
        }
        const data = await res.json();
        if (isMounted) {
          setEvents(data.events || []);
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message || 'Failed to load events');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter events
  const filteredEvents = useMemo(() => {
    return filterLeanEvents(events, {
      search: searchQuery,
      freeOnly,
    });
  }, [events, searchQuery, freeOnly]);

  // Generate 7x5 or 7x6 month planner cells
  const monthCells = useMemo(() => {
    return getPlannerMonthCells(pivotDate, filteredEvents, todayStr);
  }, [pivotDate, filteredEvents, todayStr]);

  // Month navigation
  const shiftMonth = useCallback((offset: number) => {
    setPivotDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  }, []);

  const jumpToToday = useCallback(() => {
    setPivotDate(new Date());
  }, []);

  // Format month and spelled year
  const monthTitle = useMemo(() => formatTrackedMonth(pivotDate), [pivotDate]);
  const spelledYear = useMemo(() => formatSpelledYear(pivotDate.getFullYear()), [pivotDate]);

  // Keyboard navigation: left/right arrows for month, T for today, Esc to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        setSelectedEvent(null);
        setSelectedDateForList(null);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        shiftMonth(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        shiftMonth(1);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        jumpToToday();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shiftMonth, jumpToToday]);

  const selectedCell = useMemo(() => {
    if (!selectedDateForList) return null;
    return monthCells.find((c) => c.dateStr === selectedDateForList) || null;
  }, [monthCells, selectedDateForList]);

  return (
    <div className="min-h-screen bg-[#edece8] text-slate-800 py-6 sm:py-12 px-2 sm:px-6 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Top Minimal Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-2 text-xs font-serif text-slate-600">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hover:text-slate-900 transition underline underline-offset-4 font-medium"
            >
              ← Standard Calendar
            </Link>
            <Link href="/alternate-render/view-2" className="hover:text-slate-900 transition font-medium">
              View 2 (Classroom)
            </Link>
            <Link href="/admin" className="hover:text-slate-900 transition font-medium">
              Admin
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="rounded border-slate-400 text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span className="font-sans text-[11px] font-medium text-slate-700">Free only</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick filter..."
                className="bg-white/80 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-0.5 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Paper Planner Sheet */}
        <div className="bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08),0_2px_10px_rgba(0,0,0,0.04)] border border-[#cbd5e1] rounded-sm p-4 sm:p-10 transition-all">
          {/* Top Month Header with Controls */}
          <div className="relative flex items-center justify-center pb-6 sm:pb-8 pt-2 sm:pt-4">
            {/* Left Nav Arrow */}
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-2 sm:p-3 text-slate-400 hover:text-slate-800 transition mr-2 sm:mr-6"
              title="Previous Month (Left Arrow)"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Giant Tracked Month Title */}
            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal text-slate-900 tracking-[0.3em] sm:tracking-[0.45em] uppercase text-center select-none pl-3">
              {monthTitle}
            </h1>

            {/* Right Nav Arrow */}
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-2 sm:p-3 text-slate-400 hover:text-slate-800 transition ml-2 sm:ml-6"
              title="Next Month (Right Arrow)"
              aria-label="Next month"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Jump to Today Button */}
            <button
              type="button"
              onClick={jumpToToday}
              className="absolute right-0 top-3 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-serif uppercase tracking-widest text-slate-500 hover:text-slate-900 border border-slate-300 rounded hover:border-slate-500 transition"
              title="Jump to Today (Key: T)"
            >
              Today
            </button>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <p className="font-serif text-xs text-slate-500 tracking-wider">
                Opening planner...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 font-serif text-sm">
              <p>Failed to load calendar events: {error}</p>
            </div>
          ) : (
            <div>
              {/* Calendar Table Container */}
              <div className="border border-[#788896] overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Weekday Header Row with Pastel Boxes */}
                  <div className="grid grid-cols-7 border-b border-[#788896]">
                    {PLANNER_WEEKDAYS.map((weekday, idx) => (
                      <div
                        key={weekday.name}
                        className={`${weekday.bg} py-2 sm:py-2.5 px-2 text-center border-r last:border-r-0 border-[#788896]`}
                      >
                        <span
                          className={`font-serif tracking-[0.2em] sm:tracking-[0.25em] text-[10px] sm:text-xs font-bold ${weekday.text} uppercase`}
                        >
                          {weekday.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid of Cells */}
                  <div className="grid grid-cols-7 divide-y divide-[#788896]">
                    {Array.from({ length: Math.ceil(monthCells.length / 7) }).map((_, rowIdx) => {
                      const rowCells = monthCells.slice(rowIdx * 7, rowIdx * 7 + 7);

                      return (
                        <div key={rowIdx} className="col-span-7 grid grid-cols-7">
                          {rowCells.map((cell) => {
                            const isSelected = selectedDateForList === cell.dateStr;

                            return (
                              <div
                                key={cell.dateStr}
                                onClick={() => {
                                  if (cell.events.length > 0) {
                                    setSelectedDateForList(cell.dateStr);
                                  }
                                }}
                                className={`border-r last:border-r-0 border-[#788896] min-h-[110px] sm:min-h-[135px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors relative ${
                                  !cell.isCurrentMonth
                                    ? 'bg-[#fafafa]'
                                    : isSelected
                                    ? 'bg-amber-50/70'
                                    : 'bg-white hover:bg-slate-50/70'
                                } ${cell.events.length > 0 ? 'cursor-pointer' : ''}`}
                              >
                                {/* Top Cell Header: Day Number */}
                                <div className="flex items-center justify-between">
                                  {cell.isToday ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Today" />
                                  ) : (
                                    <span />
                                  )}

                                  {cell.isCurrentMonth && (
                                    <span className="font-serif text-xs sm:text-sm font-semibold text-slate-800">
                                      {cell.dayNumber}
                                    </span>
                                  )}
                                </div>

                                {/* Events List (Highlighter Marker Style) */}
                                <div className="space-y-1.5 my-1 flex-1 overflow-hidden">
                                  {cell.isCurrentMonth &&
                                    cell.events.slice(0, 3).map((event) => {
                                      const { highlighterClass } = getEventHighlighterStyle(event);
                                      const timeFormatted = formatEventTime(
                                        event.startTime,
                                        event.endTime
                                      );

                                      return (
                                        <div
                                          key={event.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEvent(event);
                                          }}
                                          className="text-left group cursor-pointer"
                                          title={`${event.title} (${timeFormatted})`}
                                        >
                                          {/* Time Badge if available */}
                                          {event.startTime && (
                                            <div className="text-[9px] sm:text-[10px] font-sans font-bold text-[#1e3a8a] tracking-tight leading-tight">
                                              {timeFormatted.split(' – ')[0]}
                                            </div>
                                          )}

                                          {/* Event Title with Highlighter Background */}
                                          <div className="inline">
                                            <span
                                              className={`inline-block ${highlighterClass} font-sans font-bold uppercase tracking-tight text-[9px] sm:text-[10.5px] px-1 py-0.5 rounded-[2px] leading-tight hover:opacity-90 shadow-[0_1px_1px_rgba(0,0,0,0.06)]`}
                                            >
                                              {event.title}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}

                                  {/* More Activities Overflow Indicator */}
                                  {cell.isCurrentMonth && cell.events.length > 3 && (
                                    <div className="text-[10px] font-serif font-bold text-blue-900/80 hover:underline">
                                      +{cell.events.length - 3} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Legend (Matching Cell 29 Style in Reference Screenshot) */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-sans text-[11px] font-bold tracking-wide text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#fef08a] border border-[#eab308]" />
                    <span className="text-[#1e3a8a] uppercase">Free Events</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#fbcfe8] border border-[#ec4899]" />
                    <span className="text-[#1e3a8a] uppercase">Arts & Music</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#86efac] border border-[#22c55e]" />
                    <span className="text-[#1e3a8a] uppercase">Sports & Nature</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#fed7aa] border border-[#f97316]" />
                    <span className="text-[#1e3a8a] uppercase">Science & Camps</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#bae6fd] border border-[#0284c7]" />
                    <span className="text-[#1e3a8a] uppercase">Festivals</span>
                  </div>
                </div>

                <div className="font-serif text-[11px] text-slate-500 italic">
                  Showing {filteredEvents.length} curated activities
                </div>
              </div>

              {/* Bottom Spelled Year Footer */}
              <div className="mt-8 pt-4 pb-2 text-center select-none">
                <p className="font-serif tracking-[0.4em] sm:tracking-[0.6em] text-xs sm:text-sm font-normal text-slate-800 uppercase">
                  {spelledYear}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Note Event Detail Modal (Enlarged) */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEvent(null)}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#fefce8] border-2 border-[#fef08a] rounded-2xl shadow-2xl p-6 sm:p-10 max-w-2xl sm:max-w-3xl w-full text-slate-900 space-y-5 relative max-h-[90vh] flex flex-col justify-between"
          >
            {/* Top Post-it Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#fef08a] pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-amber-200/90 text-amber-950">
                  {selectedEvent.category} • {selectedEvent.isFree ? 'Free' : selectedEvent.cost || 'Cost TBA'}
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 pt-2 leading-snug">
                  {selectedEvent.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-800 p-2 text-xl font-bold rounded-lg hover:bg-amber-100 transition"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            {/* Time & Venue Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-800 bg-amber-100/40 p-3.5 rounded-xl border border-amber-200/60">
              <div className="flex items-center gap-2 font-medium">
                <span className="text-base">⏰</span>
                <span>
                  {selectedEvent.startDate} • {formatEventTime(selectedEvent.startTime, selectedEvent.endTime)}
                </span>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <span className="font-medium truncate">{selectedEvent.location}</span>
                  <a
                    href={getDirectionsUrl(selectedEvent.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:underline font-bold ml-auto shrink-0"
                  >
                    Directions ↗
                  </a>
                </div>
              )}

              {selectedEvent.ageRange && (
                <div className="flex items-center gap-2">
                  <span className="text-base">👶</span>
                  <span>Ages: <strong className="font-semibold">{selectedEvent.ageRange}</strong></span>
                </div>
              )}

              {selectedEvent.cost && (
                <div className="flex items-center gap-2">
                  <span className="text-base">🎟️</span>
                  <span>Admission: <strong className="font-semibold">{selectedEvent.cost}</strong></span>
                </div>
              )}
            </div>

            {/* Description Body */}
            {selectedEvent.description && (
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed overflow-y-auto max-h-[45vh] pr-2 whitespace-pre-line border-t border-[#fef08a] pt-3">
                {selectedEvent.description}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#fef08a]">
              <div className="flex items-center gap-3">
                {selectedEvent.registrationUrl && (
                  <a
                    href={selectedEvent.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition shadow-sm inline-flex items-center gap-1.5"
                  >
                    <span>Register / Official Details</span>
                    <span>↗</span>
                  </a>
                )}

                {selectedEvent.rawPostUrl && (
                  <a
                    href={selectedEvent.rawPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-amber-300 transition shadow-xs inline-flex items-center gap-1.5"
                  >
                    <span>Original Source</span>
                    <span>↗</span>
                  </a>
                )}
              </div>

              {selectedEvent.source?.name && (
                <span className="text-xs text-slate-500">
                  Curated via @{selectedEvent.source.handle || selectedEvent.source.name}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Day Agenda Drawer Modal (Enlarged) */}
      {selectedCell && !selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedDateForList(null)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#cbd5e1] rounded-2xl shadow-2xl p-6 sm:p-8 max-w-2xl sm:max-w-3xl w-full text-slate-800 space-y-4 max-h-[85vh] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-serif uppercase tracking-widest text-slate-500 font-semibold">
                  Day Schedule • {selectedCell.events.length} {selectedCell.events.length === 1 ? 'activity' : 'activities'}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  {selectedCell.dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDateForList(null)}
                className="text-slate-400 hover:text-slate-800 text-xl font-bold p-2 rounded-lg hover:bg-slate-100 transition"
                aria-label="Close day list"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2 divide-y divide-slate-100">
              {selectedCell.events.map((event) => {
                const { highlighterClass } = getEventHighlighterStyle(event);
                const timeLabel = formatEventTime(event.startTime, event.endTime);

                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="pt-3 first:pt-0 cursor-pointer hover:bg-slate-50 p-3 rounded-xl transition group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-sans font-bold text-[#1e3a8a] bg-slate-100 px-2 py-0.5 rounded">
                          ⏰ {timeLabel}
                        </span>
                        <span
                          className={`inline-block ${highlighterClass} font-sans font-bold uppercase tracking-tight text-xs px-2 py-0.5 rounded`}
                        >
                          {event.title}
                        </span>
                      </div>

                      {event.isFree && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                          Free
                        </span>
                      )}
                    </div>

                    {event.location && (
                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                        <span>📍 {event.location}</span>
                      </p>
                    )}

                    {event.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
