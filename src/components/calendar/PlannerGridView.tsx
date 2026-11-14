'use client';

import { useMemo } from 'react';
import type { CalendarEvent } from '@/lib/calendar-query';
import type { ThemeTokens } from '@/lib/themes';
import {
  formatDateToIsoDate,
  formatEventTime,
  getPlannerMonthCells,
  PLANNER_WEEKDAYS,
} from '@/lib/lean-calendar';
import {
  getEventHighlighterStyle,
  getPlannerCellStatus,
  formatPlannerMonthTitle,
} from '@/lib/planner-view-utils';

export interface PlannerGridViewProps {
  currentPivotDate: Date;
  events: CalendarEvent[];
  activeTheme: ThemeTokens;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDate: (date: Date) => void;
}

export default function PlannerGridView({
  currentPivotDate,
  events,
  activeTheme,
  onSelectEvent,
  onSelectDate,
}: PlannerGridViewProps) {
  const isDark = activeTheme.mode === 'dark';
  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateToIsoDate(todayDate), [todayDate]);

  const monthCells = useMemo(() => {
    return getPlannerMonthCells(currentPivotDate, events, todayStr);
  }, [currentPivotDate, events, todayStr]);

  const monthTitle = useMemo(() => {
    return formatPlannerMonthTitle(currentPivotDate);
  }, [currentPivotDate]);

  const yearString = currentPivotDate.getFullYear();

  return (
    <div
      className={
        isDark
          ? 'bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-6 shadow-xl transition-all'
          : 'bg-white border border-[#cbd5e1] rounded-2xl p-3 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.02)] transition-all'
      }
    >
      {/* Month Header Banner */}
      <div className="text-center pb-4 sm:pb-6 border-b border-[#cbd5e1]/60 select-none">
        <h3
          className={`font-serif text-2xl sm:text-4xl md:text-5xl font-normal tracking-[0.25em] sm:tracking-[0.35em] uppercase ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {monthTitle}
        </h3>
        <p className="text-xs sm:text-sm font-sans font-medium text-slate-500 tracking-widest mt-1">
          {yearString} • DESK BLOTTER PLANNER
        </p>
      </div>

      {/* Calendar Grid Container */}
      <div className="overflow-x-auto mt-4">
        <div className="min-w-[680px]">
          {/* Weekday Header Row */}
          <div
            className={`grid grid-cols-7 border-b ${
              isDark ? 'border-slate-800 bg-slate-950/80' : 'border-[#cbd5e1] bg-slate-50/80'
            }`}
          >
            {PLANNER_WEEKDAYS.map((weekday) => (
              <div
                key={weekday.name}
                className={`py-2 px-1 sm:px-2 text-center border-r last:border-r-0 ${
                  isDark ? 'border-slate-800' : 'border-[#cbd5e1]'
                }`}
              >
                <span
                  className={`font-serif tracking-[0.2em] text-[10px] sm:text-xs font-bold uppercase ${
                    isDark ? 'text-slate-300' : 'text-[#1e3a8a]'
                  }`}
                >
                  {weekday.short}
                </span>
              </div>
            ))}
          </div>

          {/* Month Cells Grid */}
          <div className={`grid grid-cols-7 divide-y ${isDark ? 'divide-slate-800' : 'divide-[#cbd5e1]'}`}>
            {Array.from({ length: Math.ceil(monthCells.length / 7) }).map((_, rowIdx) => {
              const rowCells = monthCells.slice(rowIdx * 7, rowIdx * 7 + 7);

              return (
                <div key={rowIdx} className="col-span-7 grid grid-cols-7">
                  {rowCells.map((cell) => {
                    const cellBg = getPlannerCellStatus(cell, isDark);

                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => {
                          if (cell.events.length > 0) {
                            onSelectDate(cell.dateObj);
                          }
                        }}
                        className={`border-r last:border-r-0 min-h-[105px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors relative ${
                          isDark ? 'border-slate-800' : 'border-[#cbd5e1]'
                        } ${cellBg} ${cell.events.length > 0 ? 'cursor-pointer' : ''}`}
                      >
                        {/* Cell Header: Today dot & Day number */}
                        <div className="flex items-center justify-between">
                          {cell.isToday ? (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs ring-2 ring-emerald-400/30"
                              title="Today"
                            />
                          ) : (
                            <span />
                          )}

                          {cell.isCurrentMonth && (
                            <span
                              className={`font-serif text-xs sm:text-sm font-bold ${
                                isDark ? 'text-slate-200' : 'text-slate-900'
                              }`}
                            >
                              {cell.dayNumber}
                            </span>
                          )}
                        </div>

                        {/* Events List (Highlighter Marker Style) */}
                        <div className="space-y-1 my-1 flex-1 overflow-hidden">
                          {cell.isCurrentMonth &&
                            cell.events.slice(0, 3).map((event) => {
                              const style = getEventHighlighterStyle(event, isDark);
                              const timeFormatted = formatEventTime(event.startTime, event.endTime);

                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectEvent(event);
                                  }}
                                  className="text-left group cursor-pointer block"
                                  title={`${event.title} (${timeFormatted})`}
                                >
                                  {event.startTime && (
                                    <div
                                      className={`text-[8.5px] sm:text-[9.5px] font-sans font-bold leading-tight ${
                                        isDark ? 'text-slate-400' : 'text-[#1e3a8a]'
                                      }`}
                                    >
                                      {timeFormatted.split(' – ')[0]}
                                    </div>
                                  )}

                                  <div className="inline">
                                    <span
                                      className={`inline-block font-sans font-bold uppercase tracking-tight text-[8.5px] sm:text-[9.5px] px-1 py-0.5 rounded-[2px] leading-tight transition-transform group-hover:scale-[1.02] shadow-xs truncate max-w-full ${style.className}`}
                                    >
                                      {event.title}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                          {/* Overflow badge */}
                          {cell.isCurrentMonth && cell.events.length > 3 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDate(cell.dateObj);
                              }}
                              className={`text-[9.5px] font-serif font-bold hover:underline cursor-pointer ${
                                isDark ? 'text-violet-400' : 'text-blue-900/90'
                              }`}
                            >
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

      {/* Bottom Planner Legend */}
      <div className="mt-4 pt-3 border-t border-[#cbd5e1]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 font-sans text-[10px] sm:text-[11px] font-bold tracking-wide text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#fef08a] border border-[#facc15]" />
            <span className={isDark ? 'text-slate-300' : 'text-[#713f12]'}>Free</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#fbcfe8] border border-[#f472b6]" />
            <span className={isDark ? 'text-slate-300' : 'text-[#831843]'}>Arts & Music</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#86efac] border border-[#4ade80]" />
            <span className={isDark ? 'text-slate-300' : 'text-[#14532d]'}>Sports & Nature</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#fed7aa] border border-[#fb923c]" />
            <span className={isDark ? 'text-slate-300' : 'text-[#7c2d12]'}>Science & Camps</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#bae6fd] border border-[#38bdf8]" />
            <span className={isDark ? 'text-slate-300' : 'text-[#0c4a6e]'}>Festivals</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Green dot indicates today</span>
        </div>
      </div>
    </div>
  );
}
