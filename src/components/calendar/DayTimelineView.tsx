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
                ? 'border-violet-500/50 bg-violet-950/10 shadow-md shadow-violet-500/10'
                : activeTheme.card
            }`}
          >
            {/* Day header */}
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-200/10">
              <div className="flex flex-col">
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-widest ${
                    isToday ? 'text-violet-500' : 'text-slate-500'
                  }`}
                >
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span
                  className={`text-base font-extrabold ${
                    isToday ? 'text-violet-500' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
              {dayEvents.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[8px] font-extrabold shadow-sm ${activeTheme.badge}`}
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
                  className="text-[10px] text-slate-500 italic py-2 sm:py-6 text-center cursor-pointer hover:text-violet-400 transition"
                >
                  No activities
                </div>
              ) : (
                <>
                  {dayEvents.slice(0, visibleLimit).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectDate(date)}
                      className="p-2 sm:p-2.5 rounded-xl border border-slate-300/40 dark:border-slate-800 bg-white/70 dark:bg-slate-950/80 cursor-pointer transition hover:border-slate-400 dark:hover:border-slate-700 active:scale-[0.98] group"
                    >
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                        {ev.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500">
                        <span>{ev.startTime || 'All day'}</span>
                        {ev.location && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[110px]">{ev.location.split(',')[0]}</span>
                          </>
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
