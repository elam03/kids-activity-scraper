'use client';

import type { CalendarEvent } from '@/lib/calendar-query';

export interface OngoingProgramsListProps {
  events: CalendarEvent[];
  categoryColors: Record<string, string>;
  activeTheme: any;
  onSelectEvent: (event: CalendarEvent) => void;
}

export default function OngoingProgramsList({
  events,
  categoryColors,
  activeTheme,
  onSelectEvent,
}: OngoingProgramsListProps) {
  return (
    <div className="lg:col-span-1 space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Ongoing Programs</h2>
        <p className="text-[10px] text-slate-500 mt-0.5">Camps, museum exhibits, and season runs</p>
      </div>

      {events.length === 0 ? (
        <div
          className={`text-center py-10 border border-dashed ${activeTheme.border} rounded-2xl text-slate-500 text-xs`}
        >
          No active multi-day programs in this range.
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {events.map((ev) => (
            <div
              key={ev.id}
              onClick={() => onSelectEvent(ev)}
              className={`p-4 rounded-2xl border cursor-pointer shadow-md transition group ${activeTheme.card}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-block border px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider ${
                    categoryColors[ev.category] || categoryColors.other
                  }`}
                >
                  {ev.category}
                </span>
                <span className="text-[9px] text-slate-500 font-medium">
                  {ev.startDate} to {ev.endDate}
                </span>
              </div>
              <h4
                className={`text-xs font-bold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition leading-snug ${activeTheme.textHeading}`}
              >
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
  );
}
