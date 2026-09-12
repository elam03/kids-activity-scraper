'use client';

import type { CalendarEvent } from '@/lib/calendar-query';

export interface DayDetailModalProps {
  date: Date;
  events: CalendarEvent[];
  activeTheme: any;
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

/** Parse "HH:MM AM/PM" or "HH:MM" → 24h integer for slot bucketing */
function parseHour(t: string | null): number | null {
  if (!t) return null;
  const upper = t.toUpperCase();
  const match = upper.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const period = match[3];
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h;
}

export default function DayDetailModal({
  date,
  events,
  activeTheme,
  onClose,
  onSelectEvent,
}: DayDetailModalProps) {
  const allDay = events.filter((e) => e.startTime === null);
  const morning = events.filter((e) => {
    const h = parseHour(e.startTime);
    return h !== null && h < 12;
  });
  const afternoon = events.filter((e) => {
    const h = parseHour(e.startTime);
    return h !== null && h >= 12 && h < 17;
  });
  const evening = events.filter((e) => {
    const h = parseHour(e.startTime);
    return h !== null && h >= 17;
  });

  const slots: { label: string; emoji: string; evs: CalendarEvent[] }[] = [
    { label: 'All Day', emoji: '🌤️', evs: allDay },
    { label: 'Morning', emoji: '🌅', evs: morning },
    { label: 'Afternoon', emoji: '☀️', evs: afternoon },
    { label: 'Evening', emoji: '🌙', evs: evening },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 relative animate-in fade-in zoom-in duration-200 ${activeTheme.modal} max-h-[85vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition ${activeTheme.closeBtn}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="mb-4 pr-8">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-violet-500 mb-0.5">
            {date.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <h3 className={`text-xl ${activeTheme.modalTitle}`}>
            {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${activeTheme.badge}`}>
            {events.length} {events.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>

        {/* Scrollable Content: Time Slots */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {events.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 italic">
              No activities scheduled for this day.
            </div>
          ) : (
            slots
              .filter((slot) => slot.evs.length > 0)
              .map((slot) => (
                <div key={slot.label} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    <span>{slot.emoji}</span>
                    <span>{slot.label}</span>
                    <span className="text-[9px] text-slate-600">({slot.evs.length})</span>
                  </div>
                  <div className="space-y-1">
                    {slot.evs.map((ev) => {
                      const costLabel = ev.isFree ? 'Free' : ev.cost || null;
                      const isFreeTag = ev.isFree || !ev.cost;

                      return (
                        <button
                          key={ev.id}
                          onClick={() => onSelectEvent(ev)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition active:scale-[0.98] group ${activeTheme.cardAlt}`}
                        >
                          {ev.startTime && (
                            <span className="shrink-0 px-2 py-0.5 rounded-lg bg-violet-600/20 text-violet-400 text-[10px] font-bold tabular-nums border border-violet-500/20 whitespace-nowrap">
                              {ev.startTime}
                            </span>
                          )}
                          <span
                            className={`flex-1 text-xs font-semibold truncate group-hover:text-violet-500 transition ${activeTheme.textHeading}`}
                          >
                            {ev.title}
                          </span>
                          {costLabel && (
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${
                                isFreeTag
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {costLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
