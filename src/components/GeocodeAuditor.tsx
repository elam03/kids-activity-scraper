'use client';

import { useState, useEffect } from 'react';

interface Event {
  id: string;
  source: {
    handle: string;
  };
  title: string;
  category: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface GeocodeAuditorProps {
  activeTheme: any;
}

export default function GeocodeAuditor({ activeTheme }: GeocodeAuditorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const resPending = await fetch('/api/admin/events?status=pending');
      const dataPending = await resPending.json();
      const resApproved = await fetch('/api/admin/events?status=approved');
      const dataApproved = await resApproved.json();

      setEvents([
        ...(dataPending.events || []),
        ...(dataApproved.events || [])
      ]);
    } catch (err) {
      console.error('Failed to load geocode audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const saveOverride = async (id: string) => {
    try {
      const latVal = editLat === '' ? null : Number(editLat);
      const lngVal = editLng === '' ? null : Number(editLng);

      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          latitude: latVal,
          longitude: lngVal
        })
      });

      if (res.ok) {
        setEditingId(null);
        await fetchEvents();
      }
    } catch (err) {
      console.error('Failed to override coordinates:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className={`rounded-2xl border p-6 shadow-md ${activeTheme.card}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={`text-lg font-semibold ${activeTheme.textHeading}`}>Parsed Coordinates Auditor &amp; Geocoding Debugger</h2>
            <p className={`text-xs mt-0.5 ${activeTheme.textMuted}`}>
              Verify map pin placements and correct geocoding failures or empty coordinates resolved during scraping.
            </p>
          </div>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg border disabled:opacity-50 transition text-xs font-semibold ${activeTheme.deepScrapeBtn}`}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {events.length === 0 ? (
          <div className={`text-center py-20 text-sm italic ${activeTheme.textMuted}`}>
            No active events found in the database. Add some sources or trigger ingestion.
          </div>
        ) : (
          <div className={`overflow-x-auto border rounded-xl ${activeTheme.cardAlt}`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b ${activeTheme.border} ${activeTheme.cardAlt} font-semibold`}>
                  <th className={`p-3 ${activeTheme.textMuted}`}>Source</th>
                  <th className={`p-3 ${activeTheme.textMuted}`}>Event Title</th>
                  <th className={`p-3 ${activeTheme.textMuted}`}>Parsed Location</th>
                  <th className={`p-3 ${activeTheme.textMuted}`}>Latitude</th>
                  <th className={`p-3 ${activeTheme.textMuted}`}>Longitude</th>
                  <th className={`p-3 text-right ${activeTheme.textMuted}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${activeTheme.border}`}>
                {events.map((ev) => (
                  <tr key={ev.id} className="transition hover:opacity-80">
                    <td className={`p-3 font-semibold ${activeTheme.accentText}`}>@{ev.source.handle}</td>
                    <td className="p-3">
                      <div className={`font-medium ${activeTheme.textHeading}`}>{ev.title}</div>
                      <div className={`text-[10px] ${activeTheme.textMuted}`}>{ev.category}</div>
                    </td>
                    <td className={`p-3 max-w-xs truncate ${activeTheme.cardText}`} title={ev.location || ''}>
                      {ev.location || <span className="text-red-400 italic">None specified</span>}
                    </td>
                    {editingId === ev.id ? (
                      <>
                        <td className="p-3">
                          <input
                            type="text"
                            value={editLat}
                            onChange={(e) => setEditLat(e.target.value)}
                            className={`w-24 border rounded px-2 py-1 outline-none text-[11px] ${activeTheme.input}`}
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={editLng}
                            onChange={(e) => setEditLng(e.target.value)}
                            className={`w-24 border rounded px-2 py-1 outline-none text-[11px] ${activeTheme.input}`}
                          />
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => saveOverride(ev.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[10px]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className={`px-2.5 py-1 rounded text-[10px] ${activeTheme.deepScrapeBtn}`}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">
                          {ev.latitude !== null ? (
                            <span className={`font-mono ${activeTheme.cardText}`}>{ev.latitude.toFixed(4)}</span>
                          ) : (
                            <span className="text-red-400 italic">Unmapped</span>
                          )}
                        </td>
                        <td className="p-3">
                          {ev.longitude !== null ? (
                            <span className={`font-mono ${activeTheme.cardText}`}>{ev.longitude.toFixed(4)}</span>
                          ) : (
                            <span className="text-red-400 italic">Unmapped</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setEditingId(ev.id);
                              setEditLat(ev.latitude !== null ? String(ev.latitude) : '');
                              setEditLng(ev.longitude !== null ? String(ev.longitude) : '');
                            }}
                            className={`px-2 py-1 border rounded text-[10px] font-semibold transition ${activeTheme.deepScrapeBtn}`}
                          >
                            Edit Coords
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
