'use client';

import dynamicNext from 'next/dynamic';
import EventFeedbackButtons from '@/components/EventFeedbackButtons';
import type { CalendarEvent } from '@/lib/calendar-query';

const EventMiniMap = dynamicNext(() => import('@/components/EventMiniMap'), {
  ssr: false,
});

export interface EventDetailModalProps {
  event: CalendarEvent;
  categoryColors: Record<string, string>;
  activeTheme: any;
  isFromDayModal: boolean;
  onClose: () => void;
  onBackToDay: () => void;
}

export default function EventDetailModal({
  event,
  categoryColors,
  activeTheme,
  isFromDayModal,
  onClose,
  onBackToDay,
}: EventDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border p-6 relative animate-in fade-in zoom-in duration-200 ${activeTheme.modal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition ${activeTheme.closeBtn}`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div>
          <div className="flex items-center justify-between gap-2 mb-3 pr-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-block border px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                  categoryColors[event.category] || categoryColors.other
                }`}
              >
                {event.category}
              </span>
              <span className="text-xs text-slate-500 font-medium">via @{event.source.handle}</span>
            </div>
            <EventFeedbackButtons
              eventId={event.id}
              initialLikes={event.likes || 0}
              activeTheme={activeTheme}
            />
          </div>
          <h3 className={`text-xl ${activeTheme.modalTitle}`}>{event.title}</h3>
        </div>

        <div className="mt-6 space-y-4 text-xs">
          <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border ${activeTheme.modalInner}`}>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">When</div>
              <div className={`font-semibold ${activeTheme.accentText}`}>
                {event.startDate}
                {event.endDate && ` to ${event.endDate}`}
              </div>
              <div className="text-slate-500 mt-0.5 font-medium">
                {event.startTime ? `${event.startTime} - ${event.endTime || 'End'}` : 'All day'}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Pricing & Age
              </div>
              <div className={`font-semibold ${activeTheme.accentText}`}>{event.cost || 'Free'}</div>
              <div className="text-slate-500 mt-0.5 font-medium">Age: {event.ageRange || 'All ages'}</div>
            </div>
          </div>

          {(event.location || event.latitude) && (
            <div>
              <h4 className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Where</h4>
              {event.location && (
                <div className={`flex gap-2 items-center font-semibold ${activeTheme.accentText}`}>
                  <svg
                    className="h-4 w-4 text-violet-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{event.location}</span>
                </div>
              )}
              <EventMiniMap
                title={event.title}
                location={event.location}
                latitude={event.latitude}
                longitude={event.longitude}
              />
            </div>
          )}

          <div className="border-t border-slate-200/10 pt-4">
            <h4 className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Details</h4>
            <p
              className={`leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap pr-1 custom-scrollbar ${activeTheme.cardText}`}
            >
              {event.description}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200/10 flex justify-between items-center gap-4">
          {/* Back button — only shown when navigated from the day modal */}
          {isFromDayModal ? (
            <button
              onClick={onBackToDay}
              className={`flex items-center gap-1.5 text-xs font-semibold transition ${activeTheme.closeBtn} px-3 py-1.5 rounded-lg`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Back to day
            </button>
          ) : (
            <a
              href={event.rawPostUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 underline"
            >
              View Original Instagram Post
            </a>
          )}
          <div className="flex items-center gap-3">
            {isFromDayModal && (
              <a
                href={event.rawPostUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 underline"
              >
                View post
              </a>
            )}
            {event.registrationUrl && (
              <a
                href={event.registrationUrl}
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
    </div>
  );
}
