/**
 * Map tile and Carto basemap configuration utilities.
 * Handles API key injection, URL templates, and Leaflet attribution.
 */

export const DEFAULT_CARTO_KEY = 'cb1_3iop_1_315a1f76eca6cd80f7b3b86f';

export type CartoStyle = 'voyager' | 'dark_all' | 'light_all';

export interface CartoTileOptions {
  style?: CartoStyle;
  key?: string;
}

export interface LeafletTileConfig {
  url: string;
  options: {
    attribution: string;
    subdomains: string;
    maxZoom: number;
  };
}

/**
 * Returns the effective Carto API key from environment variable or default fallback.
 */
export function getCartoApiKey(overrideKey?: string): string {
  if (overrideKey) return overrideKey;
  return process.env.NEXT_PUBLIC_CARTO_API_KEY || DEFAULT_CARTO_KEY;
}

/**
 * Generates the tile template URL for Carto raster tiles with authentication key.
 */
export function getCartoTileUrl(options?: CartoTileOptions): string {
  const style = options?.style || 'voyager';
  const key = getCartoApiKey(options?.key);

  const basePath = style === 'voyager'
    ? 'rastertiles/voyager'
    : style;

  return `https://{s}.basemaps.cartocdn.com/${basePath}/{z}/{x}/{y}{r}.png?key=${key}`;
}

/**
 * Returns a complete Leaflet tileLayer configuration object.
 */
export function getMapTileLayerConfig(options?: CartoTileOptions): LeafletTileConfig {
  return {
    url: getCartoTileUrl(options),
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    },
  };
}
