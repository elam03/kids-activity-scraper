'use client';

import { useEffect } from 'react';
import dynamicNext from 'next/dynamic';
import EventFeedbackButtons from '@/components/EventFeedbackButtons';
import type { CalendarEvent } from '@/lib/calendar-query';
import { useBodyScrollLock } from '@/lib/modal-scroll-lock';
import { getEventVerificationInfo } from '@/lib/event-utils';
import { analytics } from '@/lib/analytics';

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
  isBookmarked?: boolean;
  onToggleBookmark?: (eventId: string) => void;
}

export default function EventDetailModal({
  event,
  categoryColors,
  activeTheme,
  isFromDayModal,
  onClose,
  onBackToDay,
  isBookmarked = false,
  onToggleBookmark,
}: EventDetailModalProps) {
  useBodyScrollLock();
  const verification = getEventVerificationInfo(event);

  useEffect(() => {
    analytics.viewEventDetail({
      id: event.id,
      title: event.title,
      category: event.category,
      isFree: event.isFree,
    });
  }, [event.id, event.title, event.category, event.isFree]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border p-4 sm:p-6 relative animate-in fade-in zoom-in duration-200 ${activeTheme.modal} max-h-[90vh] flex flex-col overflow-hidden overscroll-contain`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(event.id)}
              className={`p-1.5 rounded-lg transition ${
                isBookmarked
                  ? 'text-amber-400 bg-amber-400/20 border border-amber-400/30'
                  : `${activeTheme.closeBtn} opacity-75 hover:opacity-100`
              }`}
              title={isBookmarked ? 'Saved to bookmarks' : 'Save event'}
              type="button"
            >
              <span className="text-base leading-none">{isBookmarked ? '★' : '☆'}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition ${activeTheme.closeBtn}`}
            type="button"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-shrink-0 pr-8">
          <div className="flex items-center justify-between gap-2 mb-2 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-block border px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                  categoryColors[event.category] || categoryColors.other
                }`}
              >
                {event.category}
              </span>
              {verification.isVerified ? (
                <span className="inline-flex items-center gap-1 border px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Verified ({verification.sourceCount} sources)
                </span>
              ) : (
                <span className="text-xs text-slate-500 font-medium">via @{event.source.handle}</span>
              )}
            </div>
            <EventFeedbackButtons
              eventId={event.id}
              initialLikes={event.likes || 0}
              activeTheme={activeTheme}
            />
          </div>
          <h3 className={`text-lg sm:text-xl font-bold ${activeTheme.modalTitle}`}>{event.title}</h3>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain pr-1 space-y-4 text-xs my-3 custom-scrollbar">
          {verification.isVerified && (
            <div className={`p-3 rounded-xl border ${activeTheme.modalInner} space-y-2`}>
              <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Confirmed Across {verification.sourceCount} Sources
                </span>
                <span className="text-[10px] text-slate-500 tabular-nums">
                  {Math.round(verification.confidence * 100)}% Confidence
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {verification.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300/60 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-[11px] text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition"
                  >
                    <span>{src.type === 'instagram' ? '📷' : '🌐'}</span>
                    <span className="font-medium">{src.label}</span>
                    {src.badge && (
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-semibold">
                        ({src.badge})
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className={`grid grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border ${activeTheme.modalInner}`}>
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

        <div className="mt-2 pt-3 sm:pt-4 border-t border-slate-200/10 flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
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
              onClick={() => analytics.clickOutboundSource(event.id, event.source?.handle)}
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
                onClick={() => analytics.clickOutboundSource(event.id, event.source?.handle)}
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
                onClick={() => analytics.clickOutboundTicket(event.id, event.registrationUrl!)}
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
