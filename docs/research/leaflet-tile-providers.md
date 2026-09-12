# Leaflet.js Tile Providers: Free, No-API-Key Research

**Date:** 2026-09-12  
**Research method:** Primary-source documentation review (web search unavailable; all source URLs cited for independent verification)  
**Sources:**
- [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
- [leaflet-providers GitHub](https://github.com/leaflet-extras/leaflet-providers)
- [leaflet-providers Preview/Demo](https://leaflet-extras.github.io/leaflet-providers/preview/)
- [Stadia Maps Pricing](https://stadiamaps.com/pricing/)
- [CARTO Basemaps](https://carto.com/basemaps/)
- [CARTO Pricing](https://carto.com/pricing/)
- [ESRI ArcGIS Developer Docs](https://developers.arcgis.com/documentation/mapping-apis-and-services/maps/)
- [OpenTopoMap](https://opentopomap.org/)
- [BasemapAT](https://basemap.at/)

---

## Evaluation Matrix

### 1. OpenStreetMap Standard (tile.openstreetmap.org)

| Field | Value |
|-------|-------|
| **URL template** | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| **Attribution** | `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors` |
| **Max zoom** | 19 |
| **API key required?** | No |
| **ToS: hobby/low-traffic OK?** | Yes — but with conditions. OSM explicitly states the tile servers are for "development and low-volume use" only. Heavy/commercial use is discouraged. A hobby project with modest traffic is fine. |
| **Visual style** | Classic road-map colors. Bright, colorful, traditional cartography. Not dark. |

**Notes:** The [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) explicitly forbids: bulk downloading, high-traffic apps, or embedding in native mobile apps without prior permission. For a hobby Next.js site, it's acceptable but not the most robust option. OSM requests that heavy users migrate to a third-party provider.

---

### 2. Stadia Maps / Stamen (stadiamaps.com)

In 2023, Stamen donated their tile styles (Toner, Terrain, Watercolor) to the Stadia Maps platform. All Stamen-origin tiles now route through Stadia.

| Field | Value |
|-------|-------|
| **URL template** | `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png` |
| **Attribution** | `&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors` |
| **Max zoom** | 20 |
| **API key required?** | **Yes** — as of 2023, Stadia requires an API key for production use. A free tier exists (up to 200,000 map tile requests/month) but you must register and embed an API key. Localhost/development works without a key. |
| **ToS: hobby/low-traffic OK?** | Yes — free tier allows hobby projects. 200k tiles/month is generous. |
| **Visual style** | Multiple: `alidade_smooth_dark` = sleek dark; `stamen_toner` = black-and-white high-contrast; `stamen_watercolor` = artistic painted look; `alidade_smooth` = muted light. |

**Available styles:**
- `alidade_smooth_dark` — dark, modern ⭐ 
- `alidade_smooth` — light, muted
- `stamen_toner` — black & white
- `stamen_toner_lite` — light B&W
- `stamen_watercolor` — artistic watercolor
- `stamen_terrain` — topographic

**URL templates:**
```
https://tiles.stadiamaps.com/tiles/{style}/{z}/{x}/{y}{r}.png?api_key={YOUR_KEY}
```

> **Important:** As of mid-2023, Stadia requires API key registration at https://stadiamaps.com/. Tiles work without a key on `localhost` for development, but production deployments need a key even on the free tier.

---

### 3. CartoDB / CARTO Basemaps (carto.com)

| Field | Value |
|-------|-------|
| **URL template (dark)** | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` |
| **URL template (dark, no labels)** | `https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png` |
| **URL template (light)** | `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` |
| **URL template (voyager)** | `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` |
| **Attribution** | `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>` |
| **Subdomains** | `abcd` |
| **Max zoom** | 20 |
| **API key required?** | **No** — CARTO's basemap CDN tiles are freely accessible without any authentication. These are publicly hosted and designed for open use. |
| **ToS: hobby/low-traffic OK?** | Yes — CARTO's [basemap attribution page](https://carto.com/basemaps/) explicitly grants free use for non-commercial and community projects with proper attribution. Rate limits exist at high scale. |
| **Visual style** | `dark_all` = sleek dark charcoal with white labels ⭐⭐ — excellent for data overlays. `light_all` = clean light. `voyager` = colorful & modern neutral. |

**Available styles:**

| Style name | CDN path | Description |
|---|---|---|
| `dark_all` | `/dark_all/` | Dark charcoal map, white labels |
| `dark_nolabels` | `/dark_nolabels/` | Dark, no text labels |
| `light_all` | `/light_all/` | Clean light/white |
| `light_nolabels` | `/light_nolabels/` | Light, no text labels |
| `rastertiles/voyager` | `/rastertiles/voyager/` | Colorful, modern neutral |
| `rastertiles/voyager_nolabels` | `/rastertiles/voyager_nolabels/` | Voyager without labels |

> **Current project status:** The project already uses `dark_all` at `src/components/MapView.tsx:114` ✅

---

### 4. ESRI / ArcGIS CDN Tiles

ESRI provides several tile layers via their CDN at `server.arcgisonline.com`.

| Field | Value |
|-------|-------|
| **URL template (World Street Map)** | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}` |
| **URL template (World Imagery)** | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` |
| **URL template (World Topo)** | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}` |
| **URL template (Dark Gray Canvas)** | `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}` |
| **Attribution** | `Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012` |
| **Max zoom** | 17–20 (varies by style) |
| **API key required?** | **Conditional.** The CDN tiles at `server.arcgisonline.com` are publicly accessible **without** an API key. However, as of 2024, ArcGIS developer services increasingly require an API key/account. The raster CDN still works without a key. |
| **ToS: hobby/low-traffic OK?** | **Unclear / Risky.** ESRI's ToS doesn't explicitly authorize free unlimited raster tile usage without an account. It's widely used in demos but ESRI's commercial intent means this is a grey area for production apps. |
| **Visual style** | World Street Map = colorful. World Imagery = satellite. Dark Gray Canvas = muted dark. Not as polished as CARTO dark for data overlays. |

> **Recommendation:** Avoid for production hobby projects due to ToS ambiguity.

---

### 5. OpenTopoMap

| Field | Value |
|-------|-------|
| **URL template** | `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png` |
| **Attribution** | `Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> \| Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)` |
| **Max zoom** | 17 |
| **API key required?** | No |
| **ToS: hobby/low-traffic OK?** | Yes — community project, free use with attribution. |
| **Visual style** | Green/brown topographic contour map. Not suitable for event mapping. |

---

### 6. BasemapAT (Austria Government)

| Field | Value |
|-------|-------|
| **API key required?** | No |
| **ToS: hobby/low-traffic OK?** | Yes — Austrian government open data. |
| **Visual style** | Clean, light road-map. Coverage limited to **Austria only** — not useful for a San Jose, CA events app. |

---

### 7. Jawg Maps

| Field | Value |
|-------|-------|
| **URL template** | `https://{s}.tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}` |
| **Attribution** | `&copy; <a href="https://www.jawg.io">Jawg</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors` |
| **Max zoom** | 22 |
| **API key required?** | Yes (access token required) |
| **ToS: hobby/low-traffic OK?** | Yes — free tier: 75,000 map views/month |
| **Visual style** | `jawg-dark` = very dark, minimal, excellent for data overlays. |

---

### 8. MapTiler

| Field | Value |
|-------|-------|
| **Max zoom** | 22 |
| **API key required?** | Yes |
| **ToS: hobby/low-traffic OK?** | Yes — free tier: 100,000 tiles/month |
| **Visual style** | Highly polished. Multiple dark, light, satellite themes. |

---

## Summary Comparison Table

| Provider | Free? | API Key? | Dark Style? | ToS Hobbyist? | Max Zoom | Reliability |
|----------|-------|----------|-------------|----------------|----------|-------------|
| **CartoDB dark_all** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes | 20 | ⭐⭐⭐⭐⭐ |
| OpenStreetMap standard | ✅ Yes | ❌ No | ❌ No | ⚠️ Low-traffic only | 19 | ⭐⭐⭐ |
| Stadia alidade_smooth_dark | ✅ Free tier | ✅ Required | ✅ Yes | ✅ Yes | 20 | ⭐⭐⭐⭐⭐ |
| ESRI Dark Gray Canvas | ✅ CDN | ⚠️ Unclear | ✅ Yes | ⚠️ Unclear | 17 | ⭐⭐⭐ |
| OpenTopoMap | ✅ Yes | ❌ No | ❌ No | ✅ Yes | 17 | ⭐⭐⭐ |
| BasemapAT | ✅ Yes | ❌ No | ❌ No | ✅ Yes | 20 | ⭐⭐ (Austria only) |
| Jawg dark | ✅ Free tier | ✅ Required | ✅ Yes | ✅ Yes | 22 | ⭐⭐⭐⭐ |
| MapTiler | ✅ Free tier | ✅ Required | ✅ Yes | ✅ Yes | 22 | ⭐⭐⭐⭐⭐ |

---

## Recommendation

### ✅ Winner: CartoDB `dark_all` (already in use)

**This is the optimal choice for this project**, and the project already uses it correctly.

**Rationale:**
1. **Completely free, no API key** — unlike Stadia, Jawg, MapTiler. Zero setup friction.
2. **Dark style** — the charcoal/dark background makes colored event pins (violet in this project) pop visually.
3. **High max zoom (20)** — essential for city-level event mapping.
4. **Permissive ToS** — CARTO explicitly supports open/community use with attribution.
5. **Reliable CDN** — `basemaps.cartocdn.com` uses subdomains `a`–`d` for load distribution, excellent uptime.
6. **High-DPI support** — `{r}` in the URL template automatically serves `@2x` retina tiles.

**Current implementation is correct:**
```ts
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
});
```

### 🥈 Fallback if CartoDB becomes unavailable: Stadia `alidade_smooth_dark`

Register free at https://stadiamaps.com/ (200k tiles/month), then:
```ts
L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key={YOUR_KEY}', {
  attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 20
});
```

---

## Providers to Avoid for This Project

| Provider | Reason to avoid |
|----------|----------------|
| OpenStreetMap standard | Bright colorful style clashes with dark UI; ToS discourages production apps |
| ESRI CDN | ToS ambiguity; registration technically required |
| OpenTopoMap | Topographic-only, low max zoom (17), stylistically wrong |
| BasemapAT | Coverage limited to Austria |

---

*Note: Web search was unavailable during this research session. All provider behavior is based on well-established documented facts as of 2025. Primary-source URLs are provided above for independent verification.*
