'use client';

import type { CalendarEvent } from '@/lib/calendar-query';

export interface MonthGridViewProps {
  monthDates: Date[];
  currentPivotDate: Date;
  getEventsForDate: (date: Date) => CalendarEvent[];
  onSelectDate: (date: Date) => void;
  activeTheme: any;
}

export default function MonthGridView({
  monthDates,
  currentPivotDate,
  getEventsForDate,
  onSelectDate,
  activeTheme,
}: MonthGridViewProps) {
  const visibleLimit = 2;

  return (
    <div
      className={`grid grid-cols-7 border ${activeTheme.border} rounded-2xl overflow-hidden bg-slate-950/20 divide-y ${activeTheme.border.replace(
        'border-',
        'divide-'
      )} divide-x ${activeTheme.border.replace('border-', 'divide-')} shadow-md`}
    >
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div
          key={day}
          className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-950/40"
        >
          {day}
        </div>
      ))}

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
              <span
                className={`text-[10px] font-bold ${
                  isToday ? 'text-violet-500' : 'text-slate-500'
                }`}
              >
                {date.getDate()}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {dayEvents.slice(0, visibleLimit).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onSelectDate(date)}
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium border border-slate-300/40 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 transition"
                  title={ev.title}
                >
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > visibleLimit && (
                <button
                  onClick={() => onSelectDate(date)}
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
  );
}
