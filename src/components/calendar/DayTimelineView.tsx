'use client';

import type { CalendarEvent } from '@/lib/calendar-query';

export interface DayTimelineViewProps {
  weekDates: Date[];
  getEventsForDate: (date: Date) => CalendarEvent[];
  onSelectDate: (date: Date) => void;
  activeTheme: any;
}

export default function DayTimelineView({
  weekDates,
  getEventsForDate,
  onSelectDate,
  activeTheme,
}: DayTimelineViewProps) {
  const visibleLimit = 3;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
      {weekDates.map((date, idx) => {
        const dayEvents = getEventsForDate(date);
        const isToday = new Date().toDateString() === date.toDateString();

        return (
          <div
            key={idx}
            className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col ${
              dayEvents.length === 0
                ? 'min-h-[90px] sm:h-72 sm:min-h-72'
                : 'h-64 sm:h-72 min-h-64 sm:min-h-72'
            } overflow-hidden backdrop-blur-sm transition hover:shadow-lg ${
              isToday
                ? `${activeTheme.todayBorder || 'border-violet-500/50'} ${activeTheme.todayBg || 'bg-violet-950/10'} shadow-md`
                : activeTheme.card
            }`}
          >
            {/* Day header */}
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-200/10">
              <div className="flex flex-col">
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-widest ${
                    isToday ? (activeTheme.todayText || 'text-violet-400') : (activeTheme.dayHeader || 'text-slate-400')
                  }`}
                >
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span
                  className={`text-base font-extrabold ${
                    isToday ? (activeTheme.todayText || 'text-violet-400') : (activeTheme.textHeading || 'text-slate-100')
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
              {dayEvents.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[8px] font-extrabold shadow-sm ${
                    isToday ? (activeTheme.todayBadge || activeTheme.badge) : activeTheme.badge
                  }`}
                >
                  {dayEvents.length} items
                </span>
              )}
            </div>

            {/* Events list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {dayEvents.length === 0 ? (
                <div
                  onClick={() => onSelectDate(date)}
                  className={`text-[10px] font-medium italic py-2 sm:py-6 text-center cursor-pointer transition opacity-75 hover:opacity-100 ${
                    activeTheme.textMuted || 'text-slate-400'
                  }`}
                >
                  No activities
                </div>
              ) : (
                <>
                  {dayEvents.slice(0, visibleLimit).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectDate(date)}
                      className={`p-2 sm:p-2.5 rounded-xl border cursor-pointer transition active:scale-[0.98] group ${
                        activeTheme.cardAlt || 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div
                        className={`text-[11px] font-bold line-clamp-2 leading-tight group-hover:text-violet-500 transition ${
                          activeTheme.cardText || 'text-slate-100'
                        }`}
                      >
                        {ev.title}
                      </div>
                      <div
                        className={`flex items-center gap-1.5 mt-1 text-[9px] ${
                          activeTheme.textMuted || 'text-slate-400'
                        }`}
                      >
                        <span>{ev.startTime || 'All day'}</span>
                        {ev.location && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[110px]">{ev.location.split(',')[0]}</span>
                          </>
                        )}
                        {ev.sources && ev.sources.length >= 2 && (
                          <span
                            title={`Verified by ${ev.sources.length} sources`}
                            className="ml-auto shrink-0 inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                          >
                            ✓ {ev.sources.length}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > visibleLimit && (
                    <button
                      onClick={() => onSelectDate(date)}
                      className={`w-full py-1.5 mt-0.5 rounded-lg text-[9px] font-bold transition active:scale-[0.98] ${activeTheme.btnMore}`}
                    >
                      +{dayEvents.length - visibleLimit} more
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
