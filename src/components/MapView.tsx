'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { geocodeLocation, Coordinates } from '@/lib/geocoder';
import { calculateDistanceMiles, formatDistanceMiles } from '@/lib/location-utils';

interface Event {
  id: string;
  sourceId: string;
  source: {
    handle: string;
    name: string;
  };
  rawPostUrl: string;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  ageRange: string | null;
  category: string;
  cost: string | null;
  isFree: boolean;
  registrationUrl: string | null;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface MapViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

interface PinItem {
  event: Event;
  coords: Coordinates;
}

export default function MapView({ events, onSelectEvent }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const userLayerRef = useRef<any>(null);
  const hasUserLocatedRef = useRef(false);

  const [pins, setPins] = useState<PinItem[]>([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'located' | 'denied' | 'unavailable' | 'timeout'>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);

  // 1. Dynamic script loader for Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Leaflet stylesheet is already loaded
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Check if Leaflet script is already loaded
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.head.appendChild(script);
    }
  }, []);

  // 2. Geocode all events asynchronously or read database coordinates
  useEffect(() => {
    async function loadPins() {
      const pinsList: PinItem[] = [];
      for (const event of events) {
        let coords: Coordinates | null = null;
        
        if (event.latitude !== undefined && event.latitude !== null && event.longitude !== undefined && event.longitude !== null) {
          coords = { lat: event.latitude, lng: event.longitude };
        } else if (event.location) {
          coords = await geocodeLocation(event.location);
        }

        if (coords) {
          pinsList.push({ event, coords });
        }
      }
      setPins(pinsList);
    }
    loadPins();
  }, [events]);

  // 3. User Geolocation Handler
  const handleLocateUser = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatus('unavailable');
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoStatus('locating');
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude, accuracy });
        setGeoStatus('located');
        hasUserLocatedRef.current = true;

        if (mapInstanceRef.current && (window as any).L) {
          const L = (window as any).L;

          // Smoothly fly camera to user's position
          mapInstanceRef.current.flyTo([latitude, longitude], 13, {
            animate: true,
            duration: 1.5,
            easeLinearity: 0.25,
          });

          // Render or update user location marker
          if (!userLayerRef.current) {
            userLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
          } else {
            userLayerRef.current.clearLayers();
          }

          // Custom pulsing user location marker
          const userMarkerHtml = `
            <div class="relative flex h-6 w-6 items-center justify-center">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-sky-500 border-2 border-white shadow-lg"></span>
            </div>
          `;

          const userIcon = L.divIcon({
            html: userMarkerHtml,
            className: 'custom-user-location-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1000 })
            .bindPopup('<div class="p-1 font-sans text-xs text-slate-200 font-semibold">📍 You are here</div>')
            .addTo(userLayerRef.current);

          // Render accuracy radius circle if reasonable (< 5000 meters)
          if (accuracy && accuracy < 5000) {
            L.circle([latitude, longitude], {
              radius: accuracy,
              color: '#38bdf8',
              fillColor: '#38bdf8',
              fillOpacity: 0.1,
              weight: 1,
            }).addTo(userLayerRef.current);
          }
        }
      },
      (error) => {
        if (error.code === 1) { // PERMISSION_DENIED
          setGeoStatus('denied');
          setGeoError('Location permission denied. Please allow location access in your browser settings.');
        } else if (error.code === 3) { // TIMEOUT
          setGeoStatus('timeout');
          setGeoError('Location request timed out. Please try again.');
        } else {
          setGeoStatus('unavailable');
          setGeoError('Location unavailable. Please check your network or device settings.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // 4. Initialize Map and render markers
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // If map isn't initialized yet, create it
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [37.3387, -121.8853], // Center on San Jose, CA
        zoom: 11,
      });

      // Load OpenStreetMap tiles styled cleanly with CartoDB Dark Matter tiles (free CDN raster tiles)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      // Create layer groups
      markerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      userLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    // Clear old event markers
    if (markerGroupRef.current) {
      markerGroupRef.current.clearLayers();
    }

    // Custom CSS styling for the pins using Leaflet divIcon
    pins.forEach(({ event, coords }) => {
      const markerHtml = `
        <div class="relative flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 border-2 border-white shadow-lg cursor-pointer transform hover:scale-110 transition duration-150">
          <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });

      // Compute distance from user if user location is known
      let distanceLabel = '';
      if (userCoords) {
        const miles = calculateDistanceMiles(userCoords.lat, userCoords.lng, coords.lat, coords.lng);
        distanceLabel = `<span class="ml-1 text-violet-400 font-semibold">(${formatDistanceMiles(miles)} away)</span>`;
      }

      // Create a popup on marker click
      const popupHtml = `
        <div class="p-2.5 font-sans bg-slate-900 text-slate-100 text-xs max-w-xs rounded-lg">
          <div class="font-bold text-slate-200 mb-1 leading-snug">${event.title}</div>
          <div class="text-[10px] text-slate-400 mb-2">📍 ${event.location?.split(',')[0] || 'Event location'}${distanceLabel}</div>
          <button id="btn-${event.id}" class="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition active:scale-[0.98]">
            View Details
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: 'custom-leaflet-popup'
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-${event.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectEvent(event);
            marker.closePopup();
          };
        }
      });

      marker.addTo(markerGroupRef.current);
    });

    // Fit map bounds if pins exist AND user hasn't actively located themselves
    if (pins.length > 0 && mapInstanceRef.current && !hasUserLocatedRef.current) {
      const latLngs = pins.map(p => [p.coords.lat, p.coords.lng]);
      mapInstanceRef.current.fitBounds(latLngs, { padding: [40, 40] });
    }

  }, [leafletLoaded, pins, onSelectEvent, userCoords]);

  // Clean up map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-[520px] rounded-2xl border border-slate-900 overflow-hidden bg-slate-950 relative shadow-md">
      {/* Loading Overlay */}
      {!leafletLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-20">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-slate-400">Loading Map Engine...</span>
          </div>
        </div>
      )}

      {/* Floating Toolbar: Locate Me Button */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
        <button
          onClick={handleLocateUser}
          disabled={!leafletLoaded || geoStatus === 'locating'}
          aria-label="Locate me on the map"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md border transition active:scale-95 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {geoStatus === 'locating' ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-sky-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Locating...</span>
            </>
          ) : geoStatus === 'located' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-300">Near Me</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5 text-sky-400 group-hover:scale-110 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Near Me</span>
            </>
          )}
        </button>
      </div>

      {/* Geolocation Notice / Error Banner */}
      {geoError && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-10 bg-slate-900/95 border border-amber-500/30 text-amber-200 text-xs p-3 rounded-xl shadow-xl backdrop-blur-md flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="leading-snug">{geoError}</p>
          </div>
          <button
            onClick={() => setGeoError(null)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition"
            aria-label="Dismiss notice"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Leaflet DOM container */}
      <div id="map" ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}

