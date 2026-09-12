# Geolocation API + Leaflet "Locate Me" UX Research

**Date:** 2026-09-12
**Sources:**
- [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [MDN getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)
- [MDN GeolocationPositionError](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError)
- [Leaflet 1.9 Reference – Map methods](https://leafletjs.com/reference.html#map-methods-for-modifying-map-state)
- [Next.js 14 – Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [web.dev – User Location](https://web.dev/articles/user-location)
- Codebase: `src/components/MapView.tsx`, `src/lib/geocoder.ts`, `src/app/page.tsx`

---

## 1. `navigator.geolocation.getCurrentPosition` in a React `useEffect`

### API Signature (MDN)

```ts
navigator.geolocation.getCurrentPosition(
  successCallback: PositionCallback,
  errorCallback?: PositionErrorCallback,
  options?: PositionOptions
)
```

- `successCallback` receives a `GeolocationPosition` with:
  - `coords.latitude` / `coords.longitude` (degrees, WGS-84)
  - `coords.accuracy` (metres, 95% confidence radius)
  - `coords.altitude`, `coords.altitudeAccuracy`, `coords.heading`, `coords.speed` (may be `null`)
  - `timestamp` (DOMTimeStamp, milliseconds)

- `errorCallback` receives a `GeolocationPositionError`:
  | `code` | Constant | Meaning |
  |--------|----------|---------|
  | `1` | `PERMISSION_DENIED` | User denied or browser policy blocked the request |
  | `2` | `POSITION_UNAVAILABLE` | Device couldn't determine position (no GPS fix, network error) |
  | `3` | `TIMEOUT` | Request exceeded `options.timeout` before a position was returned |

### Idiomatic React `useCallback` pattern (button-triggered)

```tsx
'use client';

import { useCallback, useState } from 'react';

type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'located'; lat: number; lng: number; accuracy: number }
  | { status: 'denied' }
  | { status: 'unavailable'; message: string }
  | { status: 'timeout' };

export function useGeolocation() {
  const [geoState, setGeoState] = useState<GeoState>({ status: 'idle' });

  const locate = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoState({ status: 'unavailable', message: 'Geolocation not supported' });
      return;
    }

    setGeoState({ status: 'locating' });

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 60_000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoState({
          status: 'located',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoState({ status: 'denied' });
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoState({ status: 'unavailable', message: error.message });
            break;
          case error.TIMEOUT:
            setGeoState({ status: 'timeout' });
            break;
          default:
            setGeoState({ status: 'unavailable', message: 'Unknown error' });
        }
      },
      options,
    );
  }, []);

  return { geoState, locate };
}
```

**Key notes:**
- The `typeof window === 'undefined'` guard is critical — see §5.
- Do **not** call `getCurrentPosition` inside `useEffect` on mount; trigger it from user interaction (see §2).
- Error constants (`PERMISSION_DENIED`, etc.) live **on the error instance**, not statically.

---

## 2. UX Pattern: Button-Triggered ("Lazy Locate Me") vs Auto-Prompt on Load

### Recommendation: **Button-triggered only**

**Source:** [web.dev – User Location](https://web.dev/articles/user-location), MDN Geolocation API

> "Don't prompt the user at page load, as they have no context for why you need their location."
> — web.dev (Google)

**Why auto-prompting is harmful:**
1. **Context-free permission prompt** — users reflexively deny. A denied permission persists until the user manually re-enables in browser settings.
2. **Higher conversion with in-page context** — Showing *why* location is needed before the OS prompt dramatically increases grant rate.
3. **Safari/iOS restriction** — Safari silently suppresses the permission prompt if the request doesn't originate from a user gesture. Auto-`useEffect` calls won't show a prompt at all on iOS.
4. **HTTPS required** — `navigator.geolocation` only works on secure origins (HTTPS or localhost).

**Recommended UI pattern:**
```
[📍 Near Me]  ← visible button, always present in map toolbar
     │
     ▼ (onClick)
[Loading spinner in button]
     │
  success ──→ flyTo(lat, lng, 13) + show accuracy circle
  denied  ──→ inline banner: "Location access denied. Enable in browser settings."
  timeout ──→ inline banner: "Couldn't get location. Try again."
  unavail ──→ inline banner: "Location unavailable on this device."
```

The button remains visible and re-clickable after any error.

---

## 3. `PositionOptions` for a Mapping App

```ts
const options: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};
```

| Option | Value | Rationale |
|--------|-------|-----------|
| `enableHighAccuracy` | `true` | Requests GPS on mobile. Slower (up to a few seconds) but street-level accuracy. For a kids-activity map, knowing the user's precise neighbourhood matters. On desktop, falls back to IP-based anyway. |
| `timeout` | `10_000` (10 s) | Gives GPS time to get a fix. Below 5 s causes frequent `TIMEOUT` errors; above 15 s feels unresponsive. |
| `maximumAge` | `60_000` (1 min) | Allows the browser to return a cached position ≤ 60 seconds old. Eliminates double-prompting on re-click. |

---

## 4. `map.flyTo()` vs `map.setView()` — Which to Use

### `map.setView(latlng, zoom, options?)`
- **Instant** pan + zoom, no animation by default.
- Use for: initial map render, programmatic resets.

### `map.flyTo(latlng, zoom, options?)`
- **Animated** pan + zoom in a smooth arc — zooms out then back in for large distances.
- Options: `{ animate: true, duration: 1.5, easeLinearity: 0.25 }`

### Recommendation for "Locate Me": **`flyTo`**

`flyTo` is correct for a button-triggered locate action:
1. **Spatial orientation** — the animated arc shows the user where they are relative to the current view.
2. **Delight** — smooth animation matches Google Maps, Apple Maps, Mapbox UX conventions.
3. **Distance handling** — gracefully handles large jumps (e.g., map showing San Jose, user is in San Francisco).

```ts
// In the locate success callback:
map.flyTo([lat, lng], 13, {
  animate: true,
  duration: 1.2,
  easeLinearity: 0.3,
});

// Accuracy circle
const L = (window as any).L;
L.circle([lat, lng], {
  radius: accuracy,
  color: '#7c3aed',       // violet-600 — matches existing theme
  fillColor: '#7c3aed',
  fillOpacity: 0.1,
  weight: 1,
}).addTo(map);
```

### `map.locate()` — Leaflet's built-in helper

Leaflet has `map.locate(options)` that wraps `navigator.geolocation`. However, in this project Leaflet is CDN-loaded and `map.locate()` fires automatically — this conflicts with the button-triggered pattern and makes React state harder to manage. **Prefer manual `navigator.geolocation.getCurrentPosition`.**

---

## 5. Next.js 14 App Router Gotchas

### 5.1 `'use client'` directive required
`MapView.tsx` already has this ✅.

### 5.2 `typeof window === 'undefined'` guard
Next.js pre-renders Client Components on the server. `window`, `navigator`, `document` don't exist server-side — accessing them throws `ReferenceError`. Always guard. Already used in `MapView.tsx` line 49 ✅.

### 5.3 `useEffect` timing with CDN-loaded Leaflet
The map is only initialized once `leafletLoaded === true`. Geolocation UI (the "Locate Me" button) should be disabled until `leafletLoaded && mapInstanceRef.current`:

```tsx
disabled={!leafletLoaded || !mapInstanceRef.current}
```

### 5.4 `next/dynamic` with `ssr: false`
`page.tsx` already wraps `MapView` with `dynamic(..., { ssr: false })` ✅. All geolocation code inside `MapView` is browser-only and safe.

### 5.5 `navigator.permissions` API (optional pre-check)
Before calling `getCurrentPosition`, optionally check existing permission state to avoid unnecessary spinner:

```ts
if ('permissions' in navigator) {
  const perm = await navigator.permissions.query({ name: 'geolocation' });
  if (perm.state === 'denied') {
    setGeoState({ status: 'denied' });
    return;
  }
}
```

---

## 6. Graceful Degradation When Geolocation Is Denied

| State | UI Behaviour |
|-------|-------------|
| `idle` | Map renders centred on San Jose (existing default) |
| `locating` | "Near Me" button shows spinner; map stays put |
| `located` | `flyTo` to user's position; add accuracy circle; button returns to normal |
| `denied` | Inline banner: "Location access denied. Enable in browser settings." |
| `unavailable` | Inline banner: "Location unavailable — try again later." Keep default centre |
| `timeout` | Inline banner: "Location timed out. Try again." Re-enable button immediately |

**Do NOT:**
- Block the map from loading until geolocation resolves.
- Show a modal forcing the user to grant permission.
- Remove the "Locate Me" button after denial (allow retry after settings change).

**Accuracy circle:** Always render with `radius: position.coords.accuracy` (metres) and low fill opacity (0.1–0.15) to honestly communicate GPS precision.

---

## 7. Recommended Implementation Plan for This Codebase

Given `MapView.tsx` already:
- Loads Leaflet via CDN script tag with `leafletLoaded` state ✅
- Has `mapInstanceRef` for the L.Map instance ✅
- Guards with `typeof window === 'undefined'` ✅
- Is wrapped in `dynamic(..., { ssr: false })` in `page.tsx` ✅

**The minimal addition is:**

1. Add `geoState` state and `locate()` callback inside `MapView.tsx`.
2. Add a `📍 Near Me` button overlaid on the map (absolute-positioned, top-right, `z-10`), disabled until `leafletLoaded`.
3. On click: call `getCurrentPosition` → on success: `map.flyTo([lat, lng], 13)` + draw accuracy circle.
4. Show error state via inline banner inside the map container (no external library needed).
5. Keep existing `fitBounds` for event pins — "Locate Me" is purely additive.

```
Map container (relative)
├── Leaflet map tiles (z-0)
├── Leaflet markers + popups
├── [📍 Near Me] button (absolute top-2 right-2, z-10)
└── Error banner (absolute bottom-2 left-2, z-10, conditional)
```

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Auto-prompt or button? | **Button only** — user gesture required for UX + iOS Safari |
| `enableHighAccuracy` | **`true`** |
| `timeout` | **`10_000` ms** |
| `maximumAge` | **`60_000` ms** |
| `flyTo` or `setView`? | **`flyTo`** for locate; `setView` for initial mount |
| Zoom level on locate | **13** (neighbourhood level) |
| SSR guard needed? | **Yes** — `typeof window === 'undefined'` |
| `ssr: false` on MapView? | **Already done** ✅ |
| Denied fallback | Stay on default San Jose centre; show dismissible banner |
| `map.locate()` vs manual? | Prefer **manual `getCurrentPosition`** for React state control |
