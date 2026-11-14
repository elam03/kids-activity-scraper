'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import FlyerUpload from '@/components/FlyerUpload';
import EventsManager from '@/components/EventsManager';
import SourcesManager from '@/components/SourcesManager';
import UrlIngestionManager from '@/components/UrlIngestionManager';
import MonitoringDashboard from '@/components/admin/MonitoringDashboard';
import TrafficAnalyticsView from '@/components/admin/TrafficAnalyticsView';
import {
  DEFAULT_CALENDAR_THEME,
  resolveCalendarTheme,
  type CalendarThemeName,
} from '@/lib/calendar-query';
import {
  getTheme,
  listThemes,
  isRegisteredTheme,
} from '@/lib/themes';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'analytics' | 'sources' | 'url_ingestion' | 'upload' | 'events'>('monitoring');
  const [theme, setTheme] = useState<CalendarThemeName>(DEFAULT_CALENDAR_THEME);
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
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryTheme = params.get('theme');
      if (queryTheme && isRegisteredTheme(queryTheme)) {
        setTheme(queryTheme as CalendarThemeName);
      } else {
        const savedTheme = localStorage.getItem('calendar-theme');
        if (savedTheme) {
          setTheme(resolveCalendarTheme(savedTheme));
        }
      }
    }
    fetchPendingCount();
  }, []);

  const changeTheme = (newTheme: CalendarThemeName) => {
    setTheme(newTheme);
    localStorage.setItem('calendar-theme', newTheme);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('theme', newTheme);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const activeTheme = getTheme(theme);

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
            <div className={`inline-flex rounded-xl border p-0.5 shadow-sm overflow-x-auto max-w-full ${activeTheme.themePicker}`}>
              {listThemes().map((t) => {
                const isActive = theme === t.name;
                const activeBtnStyle =
                  t.name === 'cosmo'
                    ? 'bg-violet-600 text-white'
                    : t.name === 'bubblegum'
                    ? 'bg-purple-700 text-white'
                    : t.name === 'jungle'
                    ? 'bg-emerald-700 text-white'
                    : t.name === 'sunshine'
                    ? 'bg-amber-600 text-white'
                    : t.name === 'ocean'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-violet-600 text-white';

                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => changeTheme(t.name)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition whitespace-nowrap ${
                      isActive ? `${activeBtnStyle} shadow-sm` : activeTheme.themePickerInactive
                    }`}
                  >
                    {t.displayName}
                  </button>
                );
              })}
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
            onClick={() => setActiveTab('monitoring')}
            className={`py-4 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'monitoring' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
            }`}
          >
            <span>📊 Health & Monitoring</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'analytics' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
            }`}
          >
            <span>📈 Traffic & Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-4 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'sources' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
            }`}
          >
            Sources & Ingestion
          </button>
          <button
            onClick={() => setActiveTab('url_ingestion')}
            className={`py-4 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'url_ingestion' ? activeTheme.activeSubTab : activeTheme.inactiveSubTab
            }`}
          >
            URL Ingestion
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
        {activeTab === 'monitoring' && (
          <MonitoringDashboard
            activeTheme={activeTheme}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'analytics' && <TrafficAnalyticsView activeTheme={activeTheme} />}
        {activeTab === 'sources' && <SourcesManager activeTheme={activeTheme} />}
        {activeTab === 'url_ingestion' && (
          <UrlIngestionManager activeTheme={activeTheme} onRefreshNeeded={fetchPendingCount} />
        )}
        {activeTab === 'upload' && <FlyerUpload onSuccess={() => {}} activeTheme={activeTheme} />}
        {activeTab === 'events' && <EventsManager activeTheme={activeTheme} onRefreshNeeded={fetchPendingCount} />}
      </main>
    </div>
  );
}
