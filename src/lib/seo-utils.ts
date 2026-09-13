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

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || event.title,
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
    ...(event.cost
      ? {
          offers: {
            '@type': 'Offer',
            price: event.isFree ? '0' : event.cost,
            priceCurrency: 'USD',
            url: event.registrationUrl || getSiteUrl(),
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}
