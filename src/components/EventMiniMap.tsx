'use client';

import { useEffect, useRef, useState } from 'react';
import { geocodeLocation, Coordinates } from '@/lib/geocoder';
import { getDirectionsUrl, getEffectiveCoords } from '@/lib/location-utils';
import { getMapTileLayerConfig } from '@/lib/map-tile-utils';

interface EventMiniMapProps {
  title: string;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export default function EventMiniMap({
  title,
  location,
  latitude,
  longitude,
}: EventMiniMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // 1. Resolve coordinates from props or async geocoding
  useEffect(() => {
    let isMounted = true;

    async function resolveCoords() {
      setLoading(true);
      const directCoords = getEffectiveCoords({ latitude, longitude });
      if (directCoords) {
        if (isMounted) {
          setCoords(directCoords);
          setLoading(false);
        }
        return;
      }

      if (location) {
        const found = await geocodeLocation(location);
        if (isMounted) {
          setCoords(found);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setCoords(null);
        setLoading(false);
      }
    }

    resolveCoords();

    return () => {
      isMounted = false;
    };
  }, [location, latitude, longitude]);

  // 2. Ensure Leaflet is loaded in the browser
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

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

  // 3. Initialize mini Leaflet map when ready
  useEffect(() => {
    if (!leafletLoaded || !coords || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Clean up any existing map in this container
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false, // Prevents interfering with modal scrolling
        dragging: true,
        touchZoom: true,
      });

      // Carto Voyager basemap with authenticated API key (GitHub #2)
      const tileConfig = getMapTileLayerConfig({ style: 'voyager' });
      L.tileLayer(tileConfig.url, {
        ...tileConfig.options,
        maxZoom: 19,
      }).addTo(map);

      // Custom compact pin marker
      const pinHtml = `
        <div class="relative flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 border-2 border-white shadow-md">
          <svg class="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'custom-mini-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);

      mapInstanceRef.current = map;

      // Invalidate size after modal animation finishes
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    } catch (err) {
      console.error('Failed to initialize mini map:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, coords]);

  const directionsUrl = getDirectionsUrl(location, coords);

  // If there's no location at all, don't render anything
  if (!location && !coords && !loading) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-800 overflow-hidden bg-slate-950/80 relative shadow-inner">
      {/* Mini Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-36 sm:h-44 z-0"
        tabIndex={-1}
      />

      {/* Loading state placeholder */}
      {(loading || !leafletLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-10 text-slate-500 text-xs">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading map preview...</span>
          </div>
        </div>
      )}

      {/* When geocoding failed and no coords available */}
      {!loading && !coords && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 p-3 text-center text-xs text-slate-400">
          <p className="mb-1">Map preview not available</p>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:text-violet-300 underline font-medium"
          >
            Search on Google Maps ↗
          </a>
        </div>
      )}

      {/* Floating Action: Open Directions */}
      {coords && (
        <div className="absolute bottom-2 right-2 z-10">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-900/90 hover:bg-slate-800 text-violet-300 hover:text-violet-200 border border-slate-700/80 shadow-md backdrop-blur-sm transition active:scale-95"
          >
            <span>Directions</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
