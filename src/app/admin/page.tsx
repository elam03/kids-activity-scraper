'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import FlyerUpload from '@/components/FlyerUpload';
import EventsManager from '@/components/EventsManager';
import SourcesManager from '@/components/SourcesManager';

const themeClasses: Record<string, any> = {
  cosmo: {
    bg: 'min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 px-4 py-8 sm:px-6 lg:px-8 text-slate-100 transition-all duration-300',
    text: 'text-slate-100',
    textHeading: 'text-slate-100',
    textMuted: 'text-slate-400',
    card: 'bg-slate-900/10 border-slate-900 hover:border-slate-800',
    cardAlt: 'bg-slate-950/80 border-slate-800 hover:border-slate-700',
    cardBorder: 'border-slate-900',
    cardText: 'text-slate-300',
    headerText: 'bg-clip-text text-transparent bg-gradient-to-r from-violet-200 to-indigo-200',
    navBtn: 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    activeTab: 'bg-violet-600 text-white',
    inactiveTab: 'text-slate-400 hover:text-slate-200',
    border: 'border-slate-900',
    activeSubTab: 'border-violet-500 text-violet-400 font-bold',
    inactiveSubTab: 'border-transparent text-slate-400 hover:text-slate-200',
    input: 'border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:border-violet-500',
    deepScrapeBtn: 'bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300',
    themePicker: 'bg-slate-900/60 border-slate-800/40',
    themePickerInactive: 'text-slate-400 hover:text-slate-200',
    modal: 'bg-slate-900 border-slate-800 text-slate-100 shadow-2xl shadow-slate-950/50',
    modalTitle: 'text-slate-100 font-bold',
    modalInner: 'bg-slate-950/60 border-slate-800 text-slate-300',
    closeBtn: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
    accentText: 'text-violet-400',
    tableHeader: 'bg-slate-950/60 text-slate-400 border-slate-800 font-bold',
    tableDivide: 'divide-slate-800/60',
    tableRowHover: 'hover:bg-slate-900/50',
    tableText: 'text-slate-200',
    tableMuted: 'text-slate-400',
  },
  bubblegum: {
    bg: 'min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-100 via-purple-50 to-indigo-100 px-4 py-8 sm:px-6 lg:px-8 text-slate-900 transition-all duration-300',
    text: 'text-slate-900',
    textHeading: 'text-purple-950 font-bold',
    textMuted: 'text-purple-900 font-medium',
    card: 'bg-white border-purple-200 shadow-md shadow-purple-500/5 hover:border-purple-300',
    cardAlt: 'bg-purple-50/80 border-purple-200 hover:border-purple-300',
    cardBorder: 'border-purple-200',
    cardText: 'text-slate-800 font-medium',
    headerText: 'bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 font-extrabold',
    navBtn: 'bg-white border-purple-200 hover:border-purple-300 text-purple-900 font-semibold shadow-sm',
    badge: 'bg-purple-100 text-purple-800 border-purple-200 font-bold',
    activeTab: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
    inactiveTab: 'text-purple-700 hover:text-purple-900',
    border: 'border-purple-200',
    activeSubTab: 'border-purple-600 text-purple-900 font-bold',
    inactiveSubTab: 'border-transparent text-purple-700/80 hover:text-purple-950',
    input: 'border-purple-200 bg-white text-purple-950 placeholder:text-purple-400 focus:border-purple-500',
    deepScrapeBtn: 'bg-white border border-purple-200 hover:border-purple-400 text-purple-900 font-semibold shadow-sm',
    themePicker: 'bg-white/80 border-purple-200 shadow-sm',
    themePickerInactive: 'text-purple-700 hover:text-purple-950',
    modal: 'bg-white border-purple-300 text-slate-900 shadow-2xl shadow-purple-500/20',
    modalTitle: 'text-purple-950 font-bold',
    modalInner: 'bg-purple-50 border-purple-200 text-purple-950 font-medium',
    closeBtn: 'text-purple-500 hover:text-purple-700 hover:bg-purple-100/70',
    accentText: 'text-purple-900 font-bold',
    tableHeader: 'bg-purple-100/90 text-purple-950 border-purple-200 font-bold',
    tableDivide: 'divide-purple-200/80',
    tableRowHover: 'hover:bg-purple-50/90',
    tableText: 'text-slate-900 font-medium',
    tableMuted: 'text-purple-900/80 font-medium',
  },
  jungle: {
    bg: 'min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100 via-yellow-50 to-amber-100 px-4 py-8 sm:px-6 lg:px-8 text-emerald-950 transition-all duration-300',
    text: 'text-emerald-950',
    textHeading: 'text-emerald-950 font-bold',
    textMuted: 'text-emerald-900 font-medium',
    card: 'bg-white border-emerald-200 shadow-md shadow-emerald-500/5 hover:border-emerald-300',
    cardAlt: 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-300',
    cardBorder: 'border-emerald-200',
    cardText: 'text-emerald-950 font-medium',
    headerText: 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-amber-700 font-extrabold',
    navBtn: 'bg-white border-emerald-200 hover:border-emerald-300 text-emerald-900 font-semibold shadow-sm',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold',
    activeTab: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
    inactiveTab: 'text-emerald-800 hover:text-emerald-950',
    border: 'border-emerald-200',
    activeSubTab: 'border-emerald-600 text-emerald-950 font-bold',
    inactiveSubTab: 'border-transparent text-emerald-800/80 hover:text-emerald-950',
    input: 'border-emerald-200 bg-white text-emerald-950 placeholder:text-emerald-500 focus:border-emerald-500',
    deepScrapeBtn: 'bg-white border border-emerald-200 hover:border-emerald-400 text-emerald-900 font-semibold shadow-sm',
    themePicker: 'bg-white/80 border-emerald-200 shadow-sm',
    themePickerInactive: 'text-emerald-800 hover:text-emerald-950',
    modal: 'bg-white border-emerald-300 text-emerald-950 shadow-2xl shadow-emerald-500/20',
    modalTitle: 'text-emerald-950 font-bold',
    modalInner: 'bg-emerald-50 border-emerald-200 text-emerald-950 font-medium',
    closeBtn: 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/70',
    accentText: 'text-emerald-900 font-bold',
    tableHeader: 'bg-emerald-100/90 text-emerald-950 border-emerald-200 font-bold',
    tableDivide: 'divide-emerald-200/80',
    tableRowHover: 'hover:bg-emerald-50/90',
    tableText: 'text-emerald-950 font-medium',
    tableMuted: 'text-emerald-900/80 font-medium',
  },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'sources' | 'upload' | 'events'>('sources');
  const [theme, setTheme] = useState<'cosmo' | 'bubblegum' | 'jungle'>('cosmo');
  const [pendingCount, setPendingCount] = useState<number>(0);

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/admin/events?status=pending&countOnly=true');
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch pending count:', err);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('calendar-theme');
    if (savedTheme && ['cosmo', 'bubblegum', 'jungle'].includes(savedTheme)) {
      setTheme(savedTheme as any);
    }
    fetchPendingCount();
  }, []);

  const changeTheme = (newTheme: 'cosmo' | 'bubblegum' | 'jungle') => {
    setTheme(newTheme);
    localStorage.setItem('calendar-theme', newTheme);
  };

  const activeTheme = themeClasses[theme] || themeClasses.cosmo;

  return (
    <div className={activeTheme.bg}>
      {/* Top Navbar */}
      <header className={`border-b ${activeTheme.border} bg-slate-950/20 sticky top-0 z-10 backdrop-blur-md`}>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-md shadow-violet-500/10">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className={`text-xl font-bold tracking-tight ${activeTheme.textHeading}`}>
              Kids Calendar Admin
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Theme Selector */}
            <div className={`inline-flex rounded-xl border p-0.5 shadow-sm ${activeTheme.themePicker}`}>
              <button
                onClick={() => changeTheme('cosmo')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${theme === 'cosmo' ? 'bg-violet-600 text-white' : activeTheme.themePickerInactive}`}
              >
                🌌 Cosmo
              </button>
              <button
                onClick={() => changeTheme('bubblegum')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${theme === 'bubblegum' ? 'bg-pink-500 text-white' : activeTheme.themePickerInactive}`}
              >
                🍬 Playful
              </button>
              <button
                onClick={() => changeTheme('jungle')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${theme === 'jungle' ? 'bg-emerald-600 text-white' : activeTheme.themePickerInactive}`}
              >
                🌴 Jungle
              </button>
            </div>

            <nav className="flex items-center gap-3">
              <Link href="/" className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn}`}>
                Calendar
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Sub-navigation Tabs */}
      <div className={`border-b ${activeTheme.border} bg-slate-950/10 mb-6`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-4 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'sources' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
            }`}
          >
            Sources & Ingestion
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-4 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'upload' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
            }`}
          >
            Flyer Image Ingestion
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-4 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'events' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
            }`}
          >
            <span>Calendar Events Manager</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 pb-12">
        {activeTab === 'sources' && <SourcesManager activeTheme={activeTheme} />}
        {activeTab === 'upload' && <FlyerUpload onSuccess={() => {}} activeTheme={activeTheme} />}
        {activeTab === 'events' && <EventsManager activeTheme={activeTheme} onRefreshNeeded={fetchPendingCount} />}
      </main>
    </div>
  );
}
