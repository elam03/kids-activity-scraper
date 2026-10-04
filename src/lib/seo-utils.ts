export const SITE_URL = 'https://www.littledaysout.com';
export const SITE_NAME = 'Little Days Out';
export const SITE_TAGLINE = 'Curated Kids Activities & Family Events in SF Bay Area';
export const SITE_DESCRIPTION =
  'Discover curated kids activities, weekend events, and family-friendly outings across the San Francisco Bay Area. Filter by age group, category, and interactive map.';

/**
 * Returns the canonical public URL for the website.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || SITE_URL;
}

export interface SeoEventSource {
  name: string;
  handle?: string | null;
  url?: string | null;
}

export interface SeoEvent {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  cost?: string | null;
  isFree?: boolean;
  registrationUrl?: string | null;
  rawCaption?: string | null;
  rawPostUrl?: string | null;
  source?: SeoEventSource | null;
}

/**
 * Builds Schema.org WebSite JSON-LD structured data.
 */
export function buildWebSiteJsonLd() {
  const url = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Builds Schema.org Event JSON-LD structured data for rich search snippet results.
 */
export function buildEventJsonLd(event: SeoEvent) {
  const startDateTime = event.startTime
    ? `${event.startDate}T${event.startTime.length === 5 ? `${event.startTime}:00` : event.startTime}`
    : event.startDate;

  const endDateTime = event.endDate
    ? event.endTime
      ? `${event.endDate}T${event.endTime.length === 5 ? `${event.endTime}:00` : event.endTime}`
      : event.endDate
    : undefined;

  const organizer = event.source
    ? {
        '@type': 'Organization',
        name: event.source.name,
        url: event.source.url
          ? event.source.url
          : event.source.handle
          ? (event.source.handle.startsWith('http')
              ? event.source.handle
              : `https://instagram.com/${event.source.handle.replace(/^@/, '')}`)
          : undefined,
      }
    : undefined;

  const description =
    event.description ||
    (event.rawCaption ? event.rawCaption.slice(0, 300).trim() : event.title);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description,
    startDate: startDateTime,
    ...(endDateTime ? { endDate: endDateTime } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    isAccessibleForFree: Boolean(event.isFree),
    location: {
      '@type': 'Place',
      name: event.location || 'San Francisco Bay Area',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.location || 'San Francisco Bay Area',
        addressRegion: 'CA',
        addressCountry: 'US',
      },
    },
    ...(organizer ? { organizer } : {}),
    ...(event.cost || event.isFree
      ? {
          offers: {
            '@type': 'Offer',
            price: event.isFree ? '0' : event.cost || '0',
            priceCurrency: 'USD',
            url: event.registrationUrl || event.rawPostUrl || getSiteUrl(),
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}

/**
 * Builds Schema.org ItemList JSON-LD structured data for Google carousel indexing.
 */
export function buildEventListJsonLd(events: SeoEvent[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: events.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: buildEventJsonLd(event),
    })),
  };
}

export interface SiteIconConfig {
  icon: Array<{ url: string; sizes?: string; type?: string }>;
  apple: Array<{ url: string; sizes?: string; type?: string }>;
  shortcut?: string;
}

/**
 * Returns standard icons configuration for Next.js Metadata.
 */
export function getSiteIcons(): SiteIconConfig {
  return {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  };
}

export interface SocialImageConfig {
  url: string;
  width: number;
  height: number;
  alt: string;
  type: string;
}

/**
 * Returns standard 1200x630 OpenGraph / Twitter social image configuration.
 */
export function getSocialImageConfig(siteUrl: string = getSiteUrl()): SocialImageConfig {
  return {
    url: `${siteUrl}/og-image.png`,
    width: 1200,
    height: 630,
    alt: `${SITE_NAME} - Curated Kids Activities & Family Events in SF Bay Area`,
    type: 'image/png',
  };
}

/**
 * Resolves Google Search Console site verification code from environment variables.
 */
export function getGoogleVerificationCode(): string | undefined {
  const code = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  return code ? code : undefined;
}

