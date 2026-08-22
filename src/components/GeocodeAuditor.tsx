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

export default function GeocodeAuditor() {
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
      <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Parsed Coordinates Auditor & Geocoding Debugger</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify map pin placements and correct geocoding failures or empty coordinates resolved during scraping.
            </p>
          </div>
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 disabled:opacity-50 transition text-xs font-semibold"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm italic">
            No active events found in the database. Add some sources or trigger ingestion.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-900 rounded-xl bg-slate-950/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-900/30 text-slate-400 font-semibold">
                  <th className="p-3">Source</th>
                  <th className="p-3">Event Title</th>
                  <th className="p-3">Parsed Location</th>
                  <th className="p-3">Latitude</th>
                  <th className="p-3">Longitude</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-900/10 transition">
                    <td className="p-3 font-semibold text-violet-400">@{ev.source.handle}</td>
                    <td className="p-3">
                      <div className="font-medium text-slate-200">{ev.title}</div>
                      <div className="text-[10px] text-slate-500">{ev.category}</div>
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs truncate" title={ev.location || ''}>
                      {ev.location || <span className="text-red-400 italic">None specified</span>}
                    </td>
                    {editingId === ev.id ? (
                      <>
                        <td className="p-3">
                          <input
                            type="text"
                            value={editLat}
                            onChange={(e) => setEditLat(e.target.value)}
                            className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 outline-none focus:border-violet-500 text-[11px] text-slate-200"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={editLng}
                            onChange={(e) => setEditLng(e.target.value)}
                            className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 outline-none focus:border-violet-500 text-[11px] text-slate-200"
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
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px]"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">
                          {ev.latitude !== null ? (
                            <span className="font-mono text-slate-300">{ev.latitude.toFixed(4)}</span>
                          ) : (
                            <span className="text-red-400 italic">Unmapped</span>
                          )}
                        </td>
                        <td className="p-3">
                          {ev.longitude !== null ? (
                            <span className="font-mono text-slate-300">{ev.longitude.toFixed(4)}</span>
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
                            className="px-2 py-1 border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition rounded text-[10px] font-semibold"
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
