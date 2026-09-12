'use client';

import { useState, useEffect } from 'react';
import { REPORT_REASONS, ReportReasonId, toggleLikedEventId } from '@/lib/feedback-utils';

const LIKED_STORAGE_KEY = 'kids-calendar-liked-events';

function getLikedEventsFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIKED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLikedEventsToStorage(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save liked events to storage', e);
  }
}

interface EventFeedbackButtonsProps {
  eventId: string;
  initialLikes?: number;
  activeTheme?: any;
}

export default function EventFeedbackButtons({
  eventId,
  initialLikes = 0,
  activeTheme,
}: EventFeedbackButtonsProps) {
  const [likes, setLikes] = useState<number>(initialLikes);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isLiking, setIsLiking] = useState<boolean>(false);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<ReportReasonId>('wrong_date');
  const [reportComment, setReportComment] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);

  useEffect(() => {
    const likedList = getLikedEventsFromStorage();
    setIsLiked(likedList.includes(eventId));
    setLikes(initialLikes);
  }, [eventId, initialLikes]);

  const handleToggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const nextIsLiked = !isLiked;
    const nextLikes = nextIsLiked ? likes + 1 : Math.max(0, likes - 1);

    // Optimistic UI update
    setIsLiked(nextIsLiked);
    setLikes(nextLikes);

    const stored = getLikedEventsFromStorage();
    const updated = toggleLikedEventId(stored, eventId);
    saveLikedEventsToStorage(updated);

    try {
      const res = await fetch('/api/events/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          type: nextIsLiked ? 'like' : 'unlike',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.likes === 'number') {
          setLikes(data.likes);
        }
      }
    } catch (err) {
      console.error('Failed to submit like:', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);

    try {
      const res = await fetch('/api/events/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          type: 'report_inaccurate',
          reason: reportReason,
          comment: reportComment,
        }),
      });

      if (res.ok) {
        setReportSubmitted(true);
        setTimeout(() => {
          setShowReportModal(false);
          setReportSubmitted(false);
          setReportComment('');
        }, 2200);
      }
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Heart / Upvote Button */}
      <button
        onClick={handleToggleLike}
        disabled={isLiking}
        aria-label={isLiked ? 'Unlike event' : 'Like event'}
        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition active:scale-95 shadow-sm ${
          isLiked
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
            : `${activeTheme?.cardAlt || 'bg-slate-900/60'} ${activeTheme?.border || 'border-slate-800'} text-slate-400 hover:text-rose-400 hover:border-rose-500/30`
        }`}
      >
        <svg
          className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${
            isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'fill-none stroke-current stroke-2'
          }`}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span className="font-semibold">{likes > 0 ? likes : 'Helpful'}</span>
      </button>

      {/* Report Inaccurate Button */}
      <button
        onClick={() => setShowReportModal(true)}
        aria-label="Report inaccurate details"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition active:scale-95 text-slate-400 hover:text-amber-500 ${
          activeTheme?.cardAlt || 'bg-slate-900/60'
        } ${activeTheme?.border || 'border-slate-800'} hover:border-amber-500/30`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Report issue</span>
      </button>

      {/* Report Inaccurate Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 relative animate-in fade-in zoom-in duration-150 shadow-2xl ${
              activeTheme?.modal || 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            {reportSubmitted ? (
              <div className="text-center py-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className={`text-base font-bold ${activeTheme?.modalTitle || 'text-slate-100'}`}>
                  Report Submitted
                </h3>
                <p className={`text-xs mt-1.5 ${activeTheme?.textMuted || 'text-slate-400'}`}>
                  Thank you! Our community verification system will review this event promptly.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-800/60">
                  <div>
                    <h3 className={`text-base font-bold ${activeTheme?.modalTitle || 'text-slate-100'}`}>
                      Report Inaccurate Details
                    </h3>
                    <p className={`text-xs mt-0.5 ${activeTheme?.textMuted || 'text-slate-400'}`}>
                      Help keep Bay Area kids activities accurate.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleReportSubmit} className="mt-4 space-y-3.5 text-xs">
                  <div>
                    <label className={`block text-[11px] font-bold mb-2 ${activeTheme?.textMuted || 'text-slate-300'}`}>
                      What is inaccurate?
                    </label>
                    <div className="space-y-2">
                      {REPORT_REASONS.map(reason => (
                        <label
                          key={reason.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                            reportReason === reason.id
                              ? 'border-violet-500 bg-violet-500/10 text-violet-400 font-semibold'
                              : `${activeTheme?.cardAlt || 'bg-slate-950/40'} ${activeTheme?.border || 'border-slate-800'} hover:border-slate-700`
                          }`}
                        >
                          <input
                            type="radio"
                            name="reportReason"
                            value={reason.id}
                            checked={reportReason === reason.id}
                            onChange={() => setReportReason(reason.id as ReportReasonId)}
                            className="text-violet-600 focus:ring-violet-500"
                          />
                          <span>{reason.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${activeTheme?.textMuted || 'text-slate-300'}`}>
                      Additional details (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={reportComment}
                      onChange={e => setReportComment(e.target.value)}
                      placeholder="e.g. They announced on Instagram that this starts at 11am instead..."
                      className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                        activeTheme?.input || 'bg-slate-950 border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                        activeTheme?.textMuted || 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReport}
                      className="px-4 py-1.5 rounded-xl font-semibold bg-violet-600 hover:bg-violet-500 text-white transition active:scale-95 shadow-md shadow-violet-500/20 disabled:opacity-50"
                    >
                      {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
