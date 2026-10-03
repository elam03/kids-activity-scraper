'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { CalendarEvent } from '@/lib/calendar-query';
import { getDirectionsUrl } from '@/lib/location-utils';
import {
  formatDateToIsoDate,
  formatEventTime,
  filterLeanEvents,
  getMondayStartMonthCells,
  CLASSROOM_WEEKDAYS,
  type PlannerDayCell,
} from '@/lib/lean-calendar';

export default function ClassroomCalendarViewPage() {
  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateToIsoDate(todayDate), [todayDate]);

  const [pivotDate, setPivotDate] = useState<Date>(todayDate);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected event or date for large modals
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateForList, setSelectedDateForList] = useState<string | null>(null);

  // Filters
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

  // Generate Monday-first month cells
  const monthCells = useMemo(() => {
    return getMondayStartMonthCells(pivotDate, filteredEvents, todayStr);
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

  // Keyboard navigation
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

  const monthName = useMemo(() => {
    return pivotDate.toLocaleDateString('en-US', { month: 'long' });
  }, [pivotDate]);

  const yearNumber = pivotDate.getFullYear();

  const selectedCell = useMemo(() => {
    if (!selectedDateForList) return null;
    return monthCells.find((c) => c.dateStr === selectedDateForList) || null;
  }, [monthCells, selectedDateForList]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Top Minimal Toolbar */}
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6 px-1 text-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 transition underline underline-offset-4 font-semibold"
            >
              ← Standard Calendar
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/alternate-render/view-1"
              className="text-slate-600 hover:text-slate-900 transition font-semibold"
            >
              View 1 (Paper Planner)
            </Link>
            <span className="text-slate-300">•</span>
            <Link href="/admin" className="text-slate-500 hover:text-slate-800 transition">
              Admin
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">Free only</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities..."
                className="bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={jumpToToday}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border-2 border-slate-900 bg-amber-200 hover:bg-amber-300 transition text-slate-900"
              title="Jump to current month (Key: T)"
            >
              Today
            </button>
          </div>
        </header>

        {/* Calendar Wrapper Container with Floating Navigation Arrows */}
        <div className="relative bg-white rounded-2xl shadow-xl border-2 border-slate-900 p-4 sm:p-8">
          {/* Floating Left Carousel Arrow */}
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border-2 border-slate-900 shadow-md flex items-center justify-center text-slate-800 hover:bg-amber-100 hover:scale-105 active:scale-95 transition"
            title="Previous month"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Floating Right Carousel Arrow */}
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border-2 border-slate-900 shadow-md flex items-center justify-center text-slate-800 hover:bg-amber-100 hover:scale-105 active:scale-95 transition"
            title="Next month"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* TOP ILLUSTRATION BANNER (Matching Screenshot 2) */}
          <div className="relative w-full pb-6 pt-2 select-none border-b-2 border-slate-900 mb-6 overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left School Clipart (Backpack, Apple on Books, Pencil Cup) */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {/* Backpack illustration */}
                <div className="relative">
                  <div className="w-16 h-20 sm:w-20 sm:h-24 bg-[#65a30d] border-2 border-slate-900 rounded-t-3xl rounded-b-2xl relative shadow-sm flex flex-col justify-between p-1.5">
                    {/* Top loop handle */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-4 border-2 border-slate-900 rounded-t-full bg-transparent" />
                    {/* Front pocket */}
                    <div className="w-full h-8 bg-[#84cc16] border-2 border-slate-900 rounded-xl mt-auto relative flex items-center justify-center">
                      <div className="w-4 h-1.5 bg-[#ea580c] border border-slate-900 rounded-sm" />
                    </div>
                  </div>
                  {/* Floating star */}
                  <span className="absolute -top-3 -right-2 text-amber-400 text-lg">⭐</span>
                  {/* Floating autumn leaf */}
                  <span className="absolute -top-1 left-full text-orange-500 text-base">🍁</span>
                </div>

                {/* Stack of books with Apple */}
                <div className="flex flex-col items-center">
                  {/* Apple with leaf */}
                  <div className="relative text-2xl sm:text-3xl -mb-1">
                    🍎
                  </div>
                  {/* Top Book (Blue) */}
                  <div className="w-16 sm:w-20 h-4 bg-[#38bdf8] border-2 border-slate-900 rounded-sm shadow-xs -mb-1" />
                  {/* Bottom Book (Orange/Red) */}
                  <div className="w-18 sm:w-22 h-4.5 bg-[#f97316] border-2 border-slate-900 rounded-sm shadow-xs" />
                </div>

                {/* Pencil Cup with heart */}
                <div className="relative hidden sm:block">
                  <div className="flex justify-center gap-0.5 -mb-1">
                    <div className="w-2 h-7 bg-amber-400 border border-slate-900 rounded-t-sm" />
                    <div className="w-2.5 h-9 bg-pink-500 border border-slate-900 rounded-t-sm" />
                    <div className="w-2 h-8 bg-sky-500 border border-slate-900 rounded-t-sm" />
                  </div>
                  <div className="w-11 h-11 bg-[#fef08a] border-2 border-slate-900 rounded-b-xl flex items-center justify-center text-xs text-rose-500">
                    💛
                  </div>
                </div>
              </div>

              {/* Center Month & Year Title */}
              <div className="text-center px-4 my-2">
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-950 font-sans">
                  {monthName}
                </h1>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 tracking-wider mt-0.5">
                  {yearNumber}
                </p>
              </div>

              {/* Right School Clipart (Globe, Mini Chalkboard, Pen Pot) */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {/* Desk Globe */}
                <div className="relative hidden sm:block">
                  <span className="text-3xl sm:text-4xl">🌍</span>
                  <div className="w-4 h-2 bg-amber-700 border border-slate-900 mx-auto rounded-t-xs" />
                  <div className="w-7 h-1.5 bg-amber-800 border border-slate-900 mx-auto rounded-full" />
                </div>

                {/* Chalkboard: "Back to School!" */}
                <div className="relative">
                  <div className="w-28 sm:w-32 h-18 sm:h-20 bg-[#27272a] border-4 border-[#b45309] rounded-md shadow-sm p-1.5 flex flex-col items-center justify-center text-center">
                    <span className="font-serif text-[11px] sm:text-xs text-white leading-tight font-medium">
                      Back<br />to<br />School!
                    </span>
                    {/* Chalk on ledge */}
                    <div className="w-3 h-1 bg-white rounded-xs absolute bottom-0.5 right-2" />
                  </div>
                  {/* Floating star */}
                  <span className="absolute -top-3 -left-2 text-amber-400 text-lg">⭐</span>
                  <span className="absolute -top-2 -right-1 text-red-500 text-base">🍂</span>
                </div>

                {/* Blue Cup with Star & Ruler */}
                <div className="relative">
                  <div className="flex justify-center gap-1 -mb-1">
                    <div className="w-2.5 h-8 bg-amber-200 border border-slate-900 rounded-t-xs text-[7px] text-center font-mono">
                      |||
                    </div>
                    <div className="w-2.5 h-6 bg-red-400 border border-slate-900 rounded-t-full" />
                  </div>
                  <div className="w-10 h-10 bg-[#38bdf8] border-2 border-slate-900 rounded-b-xl flex items-center justify-center text-xs text-white">
                    ⭐
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Table Component */}
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-slate-900 border-t-amber-400 rounded-full animate-spin" />
              <p className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                Loading Classroom Calendar...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-600 font-bold text-sm">
              Failed to load events: {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[650px] border-2 border-slate-900">
                {/* Weekday Header Row (Monday Start!) */}
                <div className="grid grid-cols-7 border-b-2 border-slate-900">
                  {CLASSROOM_WEEKDAYS.map((day) => (
                    <div
                      key={day.name}
                      className={`${day.bg} py-2 text-center border-r-2 last:border-r-0 border-slate-900`}
                    >
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
                        {day.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Month Days Grid */}
                <div className="grid grid-cols-7 divide-y-2 divide-slate-900">
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
                              className={`border-r-2 last:border-r-0 border-slate-900 min-h-[100px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors ${
                                !cell.isCurrentMonth
                                  ? 'bg-slate-50/50'
                                  : isSelected
                                  ? 'bg-amber-100/60'
                                  : 'bg-white hover:bg-amber-50/40'
                              } ${cell.events.length > 0 ? 'cursor-pointer' : ''}`}
                            >
                              {/* Top-Left Day Number (Matching Screenshot 2) */}
                              <div className="flex items-center justify-between">
                                {cell.isCurrentMonth ? (
                                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 pl-0.5">
                                    {cell.dayNumber}
                                  </span>
                                ) : (
                                  <span />
                                )}

                                {cell.isToday && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Today" />
                                )}
                              </div>

                              {/* Activity Pills in Cell */}
                              <div className="space-y-1 my-1 flex-1 overflow-hidden">
                                {cell.isCurrentMonth &&
                                  cell.events.slice(0, 2).map((event) => {
                                    const timeLabel = formatEventTime(event.startTime, event.endTime);

                                    return (
                                      <div
                                        key={event.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedEvent(event);
                                        }}
                                        className="p-1 rounded border border-slate-800 bg-amber-100/80 hover:bg-amber-200 transition text-left cursor-pointer group"
                                        title={`${event.title} (${timeLabel})`}
                                      >
                                        <p className="font-extrabold text-[9px] sm:text-[10px] text-slate-950 truncate leading-tight group-hover:text-blue-900">
                                          {event.title}
                                        </p>
                                        {event.startTime && (
                                          <p className="text-[8.5px] font-bold text-slate-600">
                                            {timeLabel.split(' – ')[0]}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}

                                {cell.isCurrentMonth && cell.events.length > 2 && (
                                  <div className="text-[9.5px] font-bold text-blue-800 hover:underline">
                                    +{cell.events.length - 2} more
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
          )}

          {/* Bottom Summary Bar */}
          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <span className="font-bold text-slate-800">
              📅 {filteredEvents.length} activities scheduled for this month
            </span>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-bold text-amber-900 text-[11px]">
                ⭐ Classroom Theme (View 2)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BIGGER EVENT DETAIL MODAL (Matching User Request) */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEvent(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-3 border-slate-900 rounded-3xl shadow-2xl p-6 sm:p-10 max-w-2xl sm:max-w-3xl w-full text-slate-900 space-y-6 relative max-h-[90vh] flex flex-col justify-between"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-slate-900">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-200 border border-slate-900 text-slate-900">
                    {selectedEvent.category}
                  </span>
                  {selectedEvent.isFree ? (
                    <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-emerald-200 border border-slate-900 text-emerald-950">
                      Free Entry
                    </span>
                  ) : selectedEvent.cost ? (
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 border border-slate-900 text-slate-800">
                      {selectedEvent.cost}
                    </span>
                  ) : null}
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950 pt-2 leading-tight">
                  {selectedEvent.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center font-black text-lg transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Quick Metadata Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm bg-slate-50 border-2 border-slate-900 rounded-2xl p-4">
              <div className="flex items-center gap-2.5 font-bold">
                <span className="text-lg">⏰</span>
                <span>
                  {selectedEvent.startDate} • {formatEventTime(selectedEvent.startTime, selectedEvent.endTime)}
                </span>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-2.5 font-bold">
                  <span className="text-lg">📍</span>
                  <span className="truncate">{selectedEvent.location}</span>
                  <a
                    href={getDirectionsUrl(selectedEvent.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline font-black ml-auto shrink-0"
                  >
                    Directions ↗
                  </a>
                </div>
              )}

              {selectedEvent.ageRange && (
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">👶</span>
                  <span>Ages: <strong className="font-extrabold">{selectedEvent.ageRange}</strong></span>
                </div>
              )}

              {selectedEvent.cost && (
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🎟️</span>
                  <span>Price: <strong className="font-extrabold">{selectedEvent.cost}</strong></span>
                </div>
              )}
            </div>

            {/* Full Description */}
            {selectedEvent.description && (
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed overflow-y-auto max-h-[42vh] pr-2 whitespace-pre-line border-t-2 border-slate-900 pt-4">
                {selectedEvent.description}
              </div>
            )}

            {/* Footer Action Links */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t-2 border-slate-900">
              <div className="flex items-center gap-3">
                {selectedEvent.registrationUrl && (
                  <a
                    href={selectedEvent.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 border-2 border-slate-900 text-slate-950 font-black text-sm shadow-sm transition inline-flex items-center gap-1.5"
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
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-900 font-bold text-sm transition inline-flex items-center gap-1.5"
                  >
                    <span>Original Source</span>
                    <span>↗</span>
                  </a>
                )}
              </div>

              {selectedEvent.source?.name && (
                <span className="text-xs font-medium text-slate-500">
                  Curated via @{selectedEvent.source.handle || selectedEvent.source.name}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BIGGER DAY SCHEDULE MODAL (Matching User Request) */}
      {selectedCell && !selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedDateForList(null)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-3 border-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-2xl sm:max-w-3xl w-full text-slate-900 space-y-5 max-h-[85vh] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Schedule Overview • {selectedCell.events.length} {selectedCell.events.length === 1 ? 'activity' : 'activities'}
                </span>
                <h3 className="text-2xl font-black text-slate-950 mt-1">
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
                className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center font-black text-lg transition"
                aria-label="Close day schedule"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2 divide-y divide-slate-200">
              {selectedCell.events.map((event) => {
                const timeLabel = formatEventTime(event.startTime, event.endTime);

                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="pt-3.5 first:pt-0 cursor-pointer hover:bg-amber-50 p-3 rounded-2xl transition border border-transparent hover:border-slate-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg">
                          ⏰ {timeLabel}
                        </span>
                        <span className="font-black text-sm sm:text-base text-slate-950">
                          {event.title}
                        </span>
                      </div>

                      {event.isFree ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                          Free
                        </span>
                      ) : event.cost ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {event.cost}
                        </span>
                      ) : null}
                    </div>

                    {event.location && (
                      <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1 font-medium">
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
