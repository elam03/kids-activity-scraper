import type { CalendarEvent } from './calendar-query';
import { getSiteUrl } from './seo-utils';

export type LandingPageSlug =
  | 'free-this-weekend'
  | 'toddlers'
  | 'indoor-activities'
  | 'location-san-francisco'
  | 'location-south-bay'
  | 'location-peninsula'
  | 'location-east-bay';

export interface LocationRegionConfig {
  slug: string;
  name: string;
  headline: string;
  description: string;
  keywords: string[];
}

export const LOCATION_REGIONS: Record<string, LocationRegionConfig> = {
  'san-francisco': {
    slug: 'san-francisco',
    name: 'San Francisco',
    headline: 'Kids Activities & Family Outings in San Francisco',
    description:
      'Curated calendar of upcoming kids events, park outings, library workshops, and family festivals across San Francisco. Updated daily.',
    keywords: ['san francisco', 'sf', 'presidio', 'golden gate', 'embarcadero', 'mission', 'sunset'],
  },
  'south-bay': {
    slug: 'south-bay',
    name: 'San Jose & South Bay',
    headline: 'Kids Activities & Weekend Events in San Jose & South Bay',
    description:
      'Best family events, children’s museum outings, toddler storytimes, and outdoor festivals across San Jose, Sunnyvale, Mountain View, and Santa Clara.',
    keywords: [
      'san jose',
      'santa clara',
      'sunnyvale',
      'mountain view',
      'cupertino',
      'los gatos',
      'campbell',
      'milpitas',
      'morgan hill',
      'south bay',
    ],
  },
  'peninsula': {
    slug: 'peninsula',
    name: 'San Mateo & Peninsula',
    headline: 'Kids Activities & Family Outings on the Peninsula',
    description:
      'Top upcoming kids events, coastal discovery days, science center outings, and parks across San Mateo, Palo Alto, Redwood City, and Burlingame.',
    keywords: [
      'san mateo',
      'palo alto',
      'redwood city',
      'burlingame',
      'san bruno',
      'foster city',
      'menlo park',
      'belmont',
      'san carlos',
      'half moon bay',
      'pacifica',
      'peninsula',
    ],
  },
  'east-bay': {
    slug: 'east-bay',
    name: 'Oakland, Berkeley & East Bay',
    headline: 'Kids Activities & Family Events in Oakland & East Bay',
    description:
      'Curated calendar of family-friendly festivals, nature center discovery, interactive arts, and children’s events in Oakland, Berkeley, and the East Bay.',
    keywords: [
      'oakland',
      'berkeley',
      'fremont',
      'hayward',
      'alameda',
      'walnut creek',
      'pleasanton',
      'dublin',
      'san leandro',
      'east bay',
    ],
  },
};

export interface LandingPageConfig {
  slug: LandingPageSlug;
  routePath: string;
  title: string;
  headline: string;
  description: string;
  badge: string;
  badgeColor: string;
  freeOnly?: boolean;
  ageGroups?: string[];
  categories?: string[];
  locationKeywords?: string[];
}

export const LANDING_PAGES: Record<LandingPageSlug, LandingPageConfig> = {
  'free-this-weekend': {
    slug: 'free-this-weekend',
    routePath: '/free-this-weekend',
    title: 'Free Kids Activities & Family Events in SF Bay Area This Weekend',
    headline: 'Free Family Activities & Outings This Weekend',
    description:
      'Discover 100% free kids activities, library storytimes, community festivals, and park adventures across the San Francisco Bay Area. Zero cost, verified dates.',
    badge: '🎉 100% Free Events',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    freeOnly: true,
  },
  'toddlers': {
    slug: 'toddlers',
    routePath: '/toddlers',
    title: 'Toddler Activities & Outings in SF Bay Area (Ages 1–4)',
    headline: 'Curated Toddler Outings, Storytimes & Play Spaces',
    description:
      'Fun, age-appropriate activities for toddlers (ages 1–4) in San Francisco, Peninsula, and South Bay. Music circles, sensory play, and toddler-friendly parks.',
    badge: '🍼 Toddlers (Ages 1–4)',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    ageGroups: ['toddlers'],
  },
  'indoor-activities': {
    slug: 'indoor-activities',
    routePath: '/indoor-activities',
    title: 'Indoor & Rainy Day Kids Activities in SF Bay Area',
    headline: 'Best Indoor Play Centers, Museums & Arts for Kids',
    description:
      'Explore indoor children’s museums, hands-on science labs, creative art workshops, and libraries across the Bay Area. Perfect for rainy days and indoor exploration.',
    badge: '🎨 Indoor & Creative Play',
    badgeColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    categories: ['arts', 'education', 'music'],
  },
  'location-san-francisco': {
    slug: 'location-san-francisco',
    routePath: '/locations/san-francisco',
    title: 'Kids Activities & Family Events in San Francisco | Little Days Out',
    headline: LOCATION_REGIONS['san-francisco'].headline,
    description: LOCATION_REGIONS['san-francisco'].description,
    badge: '🌉 San Francisco',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    locationKeywords: LOCATION_REGIONS['san-francisco'].keywords,
  },
  'location-south-bay': {
    slug: 'location-south-bay',
    routePath: '/locations/south-bay',
    title: 'Kids Activities & Family Events in San Jose & South Bay | Little Days Out',
    headline: LOCATION_REGIONS['south-bay'].headline,
    description: LOCATION_REGIONS['south-bay'].description,
    badge: '🌴 San Jose & South Bay',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    locationKeywords: LOCATION_REGIONS['south-bay'].keywords,
  },
  'location-peninsula': {
    slug: 'location-peninsula',
    routePath: '/locations/peninsula',
    title: 'Kids Activities & Family Outings on the Peninsula | Little Days Out',
    headline: LOCATION_REGIONS['peninsula'].headline,
    description: LOCATION_REGIONS['peninsula'].description,
    badge: '🌲 San Mateo & Peninsula',
    badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    locationKeywords: LOCATION_REGIONS['peninsula'].keywords,
  },
  'location-east-bay': {
    slug: 'location-east-bay',
    routePath: '/locations/east-bay',
    title: 'Kids Activities & Family Events in Oakland & East Bay | Little Days Out',
    headline: LOCATION_REGIONS['east-bay'].headline,
    description: LOCATION_REGIONS['east-bay'].description,
    badge: '☀️ Oakland & East Bay',
    badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    locationKeywords: LOCATION_REGIONS['east-bay'].keywords,
  },
};

/**
 * Returns configuration for a specific landing page slug.
 */
export function getLandingPageConfig(slug: LandingPageSlug): LandingPageConfig | undefined {
  return LANDING_PAGES[slug];
}

/**
 * Generates SEO metadata for Next.js pages.
 */
export function generateLandingPageMetadata(slug: LandingPageSlug) {
  const config = getLandingPageConfig(slug);
  const baseUrl = getSiteUrl();

  if (!config) {
    return {
      title: 'Curated Kids Activities | Little Days Out',
      description: 'Discover curated kids activities across the San Francisco Bay Area.',
      canonical: baseUrl,
    };
  }

  const url = `${baseUrl}${config.routePath}`;

  return {
    title: `${config.title} | Little Days Out`,
    description: config.description,
    canonical: url,
    openGraph: {
      title: `${config.title} | Little Days Out`,
      description: config.description,
      url,
      siteName: 'Little Days Out',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
    },
  };
}

/**
 * Filters events based on a landing page configuration.
 */
export function filterEventsForLandingPage(
  events: CalendarEvent[],
  slug: LandingPageSlug
): CalendarEvent[] {
  const config = getLandingPageConfig(slug);
  if (!config) return events;

  return events.filter((event) => {
    // 1. Free Only Filter
    if (config.freeOnly && !event.isFree) {
      return false;
    }

    // 2. Age Group Filter
    if (config.ageGroups && config.ageGroups.length > 0) {
      const eventAge = (event.ageGroup || 'all').toLowerCase();
      const matches = config.ageGroups.some((g) => g === eventAge || eventAge === 'all');
      if (!matches) return false;
    }

    // 3. Category Filter
    if (config.categories && config.categories.length > 0) {
      const eventCat = (event.category || 'other').toLowerCase();
      if (!config.categories.includes(eventCat)) return false;
    }

    // 4. Location Keywords Filter
    if (config.locationKeywords && config.locationKeywords.length > 0) {
      const locStr = `${event.location || ''} ${event.title} ${event.description || ''}`.toLowerCase();
      const matchesLocation = config.locationKeywords.some((kw) => locStr.includes(kw.toLowerCase()));
      if (!matchesLocation) return false;
    }

    return true;
  });
}
