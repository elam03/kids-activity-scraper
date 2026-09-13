'use client';

import { useEffect, useState } from 'react';
import { KOFI_DONATION_URL, isEscapeKey } from '@/lib/event-utils';
import {
  FEEDBACK_EMAIL,
  buildFeedbackMailtoUrl,
  getAboutContent,
} from '@/lib/about-utils';

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTheme: any;
}

export default function AboutModal({
  isOpen,
  onClose,
  activeTheme,
}: AboutModalProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const content = getAboutContent();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEscapeKey(e)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(FEEDBACK_EMAIL);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      window.location.href = buildFeedbackMailtoUrl();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div
        className={`w-full max-w-xl rounded-2xl border p-5 sm:p-7 shadow-2xl transition-all my-auto max-h-[90vh] overflow-y-auto custom-scrollbar ${activeTheme.modal || 'bg-slate-900 border-slate-800 text-slate-100'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-start pb-4 mb-4 border-b border-slate-200/10">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl" role="img" aria-label="family">
              👨‍👩‍👧‍👦
            </span>
            <div>
              <h2
                id="about-modal-title"
                className={`text-xl sm:text-2xl font-black tracking-tight ${activeTheme.modalTitle || 'text-slate-100'}`}
              >
                About Little Days Out
              </h2>
              <p className={`text-xs sm:text-sm font-medium ${activeTheme.textMuted || 'text-slate-400'}`}>
                A parent-built community calendar for Bay Area families
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${activeTheme.closeBtn || 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Narrative & Story */}
        <div className="space-y-4 text-xs sm:text-sm leading-relaxed">
          <div className={`p-4 rounded-xl border ${activeTheme.modalInner || 'bg-slate-950/40 border-slate-800'}`}>
            <h3 className="font-bold text-sm sm:text-base mb-2 flex items-center gap-2">
              <span>🌿</span> Why We Built This
            </h3>
            <p className="whitespace-pre-line mb-3 opacity-95">
              {content.familyBlurb}
            </p>
          </div>

          {/* Tipping & Appreciation */}
          <div className={`p-4 rounded-xl border ${activeTheme.modalInner || 'bg-slate-950/40 border-slate-800'}`}>
            <h3 className="font-bold text-sm sm:text-base mb-2 flex items-center gap-2">
              <span>☕</span> Support & Appreciation
            </h3>
            <p className="mb-4 opacity-95">
              {content.tippingAppreciation}
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <a
                href={KOFI_DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#FF5E5B] hover:bg-[#ff4441] text-white shadow-md transition transform active:scale-95"
              >
                <span>☕</span>
                <span>Tip a Coffee on Ko-fi</span>
              </a>
              <span className={`text-[11px] font-medium ${activeTheme.textMuted || 'text-slate-400'}`}>
                Every single tip helps keep the site running!
              </span>
            </div>
          </div>

          {/* Feedback Section */}
          <div className={`p-4 rounded-xl border ${activeTheme.modalInner || 'bg-slate-950/40 border-slate-800'}`}>
            <h3 className="font-bold text-sm sm:text-base mb-2 flex items-center gap-2">
              <span>💬</span> We Love Community Feedback
            </h3>
            <p className="mb-4 opacity-95">
              {content.feedbackNote}
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
              <a
                href={buildFeedbackMailtoUrl()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md transition transform active:scale-95"
              >
                <span>✉️</span>
                <span>Give Feedback</span>
              </a>
              <button
                onClick={handleCopyEmail}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn || 'border-slate-800 hover:border-slate-700'}`}
              >
                <span>📋</span>
                <span>{copiedEmail ? 'Copied to Clipboard!' : `Copy: ${FEEDBACK_EMAIL}`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 pt-3 border-t border-slate-200/10 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${activeTheme.activeTab || 'bg-violet-600 text-white'}`}
          >
            Back to Calendar
          </button>
        </div>
      </div>
    </div>
  );
}
