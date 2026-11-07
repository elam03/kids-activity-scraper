'use client';

import { useState, useEffect } from 'react';
import {
  cleanHandle,
  formatInstagramUrl,
  generateCreatorOutreachText,
} from '@/lib/curator-utils';

interface SourceWithEvents {
  id: string;
  name: string;
  handle: string;
  events?: Array<{
    id: string;
    title: string;
    createdAt: string;
  }>;
}

interface CreatorOutreachKitProps {
  activeTheme: any;
}

export default function CreatorOutreachKit({ activeTheme }: CreatorOutreachKitProps) {
  const [sources, setSources] = useState<SourceWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function loadSources() {
      try {
        const res = await fetch('/api/admin/sources');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.sources)) {
            setSources(data.sources);
            if (data.sources.length > 0) {
              const first = data.sources[0];
              setSelectedSourceId(first.id);
              if (first.events && first.events.length > 0) {
                setSelectedEventId(first.events[0].id);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load sources for outreach kit:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSources();
  }, []);

  const selectedSource = sources.find((s) => s.id === selectedSourceId);
  const selectedEvent = selectedSource?.events?.find((e) => e.id === selectedEventId) || selectedSource?.events?.[0];

  const handleSourceChange = (id: string) => {
    setSelectedSourceId(id);
    const src = sources.find((s) => s.id === id);
    if (src?.events && src.events.length > 0) {
      setSelectedEventId(src.events[0].id);
    } else {
      setSelectedEventId('');
    }
  };

  const clean = selectedSource ? cleanHandle(selectedSource.handle) : '';
  const instagramUrl = selectedSource ? formatInstagramUrl(selectedSource.handle) : '';
  const curatorProfileUrl = `https://www.littledaysout.com/curators/${clean}`;
  const eventUrl = selectedEvent
    ? `https://www.littledaysout.com/?event=${selectedEvent.id}`
    : curatorProfileUrl;

  const outreach = generateCreatorOutreachText({
    curatorName: selectedSource?.name || `@${clean}`,
    handle: clean,
    featuredEventTitle: selectedEvent?.title || 'Weekend Family Activities',
    eventUrl,
  });

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // Fallback
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]" />
        <p className="mt-2 text-xs">Loading creators & sources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className={`p-5 rounded-2xl border ${activeTheme.card}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🤝</span>
          <h3 className={`text-base font-bold ${activeTheme.textHeading}`}>
            Instagram Creator Flywheel Outreach Kit (Pillar 3)
          </h3>
        </div>
        <p className={`text-xs ${activeTheme.textMuted} leading-relaxed max-w-3xl`}>
          When we feature an event from a local Bay Area creator, reaching out via a quick Instagram DM builds goodwill and prompts them to share <em>Little Days Out</em> on their Instagram Stories—driving hundreds of their local parent followers to our calendar for free.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className={`p-5 rounded-2xl border ${activeTheme.card} flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between`}>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              1. Select Creator:
            </label>
            <select
              value={selectedSourceId}
              onChange={(e) => handleSourceChange(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-xs outline-none transition w-full sm:w-64 cursor-pointer ${activeTheme.input}`}
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (@{cleanHandle(s.handle)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              2. Featured Activity:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-xs outline-none transition w-full sm:w-72 cursor-pointer ${activeTheme.input}`}
            >
              {selectedSource?.events && selectedSource.events.length > 0 ? (
                selectedSource.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title.slice(0, 45)}
                  </option>
                ))
              ) : (
                <option value="">(No events found for this source)</option>
              )}
            </select>
          </div>
        </div>

        {selectedSource && (
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white transition shadow-sm inline-flex items-center gap-1.5"
            >
              <span>📸</span>
              <span>Open @{clean} on IG</span>
            </a>
            <a
              href={`/curators/${clean}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${activeTheme.navBtn} inline-flex items-center gap-1.5`}
            >
              <span>🌟</span>
              <span>Public Profile</span>
            </a>
          </div>
        )}
      </div>

      {/* Templates Output Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template 1: Direct Instagram DM */}
        <div className={`p-5 rounded-2xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                <span>💬</span>
                <span>Instagram Direct Message (Recommended)</span>
              </span>
              <button
                onClick={() => copyToClipboard(outreach.instagramDm, 'dm')}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition shadow-sm flex items-center gap-1"
              >
                <span>{copiedField === 'dm' ? '✅ Copied!' : '📋 Copy DM'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed select-all">
              {outreach.instagramDm}
            </pre>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Send directly to @{clean} on Instagram via DM. High response rate because it credits their work.
          </p>
        </div>

        {/* Template 2: Instagram Story Template */}
        <div className={`p-5 rounded-2xl border ${activeTheme.card} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <span>📱</span>
                <span>Story Shoutout Copy (Share-Back)</span>
              </span>
              <button
                onClick={() => copyToClipboard(outreach.storyShoutout, 'story')}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition shadow-sm flex items-center gap-1"
              >
                <span>{copiedField === 'story' ? '✅ Copied!' : '📋 Copy Story'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed select-all">
              {outreach.storyShoutout}
            </pre>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Pre-formatted text they can paste directly into an Instagram Story sticker or caption.
          </p>
        </div>
      </div>
    </div>
  );
}
