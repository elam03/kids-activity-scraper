'use client';

import { useState, useRef, useEffect } from 'react';
import { getUserInitials, getUserFirstName } from '@/lib/bookmark-utils';
import type { SessionUser } from '@/lib/auth';

interface UserMenuProps {
  user: SessionUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  bookmarkCount?: number;
  isSavedFilterActive?: boolean;
  onToggleSavedFilter?: () => void;
  themeClasses?: {
    navBtn?: string;
    modal?: string;
    card?: string;
  };
}

export default function UserMenu({
  user,
  onSignIn,
  onSignOut,
  bookmarkCount = 0,
  isSavedFilterActive = false,
  onToggleSavedFilter,
  themeClasses,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) {
    return (
      <button
        onClick={onSignIn}
        type="button"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold border transition shadow-sm ${
          themeClasses?.navBtn || 'bg-white/10 hover:bg-white/20 border-slate-700 text-slate-100'
        }`}
        title="Sign in with Google"
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  const initials = getUserInitials(user);
  const firstName = getUserFirstName(user);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`inline-flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-full sm:rounded-xl border transition shadow-sm ${
          themeClasses?.navBtn || 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
        } ${isSavedFilterActive ? 'ring-2 ring-amber-400' : ''}`}
        title={`Logged in as ${user.name || user.email}`}
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || 'User avatar'}
            className="w-6 h-6 rounded-full object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
            {initials}
          </div>
        )}
        <span className="hidden sm:inline text-xs font-semibold">{firstName}</span>
        {bookmarkCount > 0 && (
          <span className="hidden sm:inline-flex items-center justify-center bg-amber-400/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-400/30">
            ⭐ {bookmarkCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-800 mb-1">
            <p className="text-xs font-bold truncate">{user.name || 'Parent'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>

          {onToggleSavedFilter && (
            <button
              onClick={() => {
                onToggleSavedFilter();
                setIsOpen(false);
              }}
              type="button"
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                isSavedFilterActive
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span>My Saved Events</span>
              </div>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {bookmarkCount}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            type="button"
            className="w-full text-left px-3 py-2 mt-1 rounded-xl text-xs font-medium hover:bg-red-500/10 text-red-400 hover:text-red-300 transition flex items-center gap-2"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
