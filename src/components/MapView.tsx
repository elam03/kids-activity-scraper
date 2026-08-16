'use client';

import { useEffect, useRef, useState } from 'react';
import { geocodeLocation, Coordinates } from '@/lib/geocoder';

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
  const [pins, setPins] = useState<PinItem[]>([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

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

  // 2. Geocode all events asynchronously
  useEffect(() => {
    async function loadPins() {
      const pinsList: PinItem[] = [];
      for (const event of events) {
        if (event.location) {
          const coords = await geocodeLocation(event.location);
          if (coords) {
            pinsList.push({ event, coords });
          }
        }
      }
      setPins(pinsList);
    }
    loadPins();
  }, [events]);

  // 3. Initialize Map and render markers
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

      // Load OpenStreetMap tiles styled cleanly with CartoDB Dark Matter tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      // Create a layer group to hold all active markers
      markerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    // Clear old markers
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

      // Create a popup on marker click
      const popupHtml = `
        <div class="p-2 font-sans bg-slate-900 text-slate-100 text-xs max-w-xs">
          <div class="font-bold text-slate-200 mb-1">${event.title}</div>
          <div class="text-[10px] text-slate-400 mb-2">📍 ${event.location?.split(',')[0]}</div>
          <button id="btn-${event.id}" class="w-full bg-violet-600 text-white rounded px-2 py-1 text-[10px] font-semibold hover:bg-violet-500 transition">
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

    // Fit map bounds if pins exist
    if (pins.length > 0 && mapInstanceRef.current) {
      const latLngs = pins.map(p => [p.coords.lat, p.coords.lng]);
      mapInstanceRef.current.fitBounds(latLngs, { padding: [40, 40] });
    }

  }, [leafletLoaded, pins, onSelectEvent]);

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
    <div className="w-full h-[500px] rounded-2xl border border-slate-900 overflow-hidden bg-slate-950 relative shadow-md">
      {!leafletLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-slate-400">Loading OpenStreetMap Engine...</span>
          </div>
        </div>
      )}
      <div id="map" ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
}
