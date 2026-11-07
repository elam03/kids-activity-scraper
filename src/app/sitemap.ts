import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { getSiteUrl } from '@/lib/seo-utils';

export const revalidate = 3600; // 1-hour ISR revalidation

export const SITEMAP_CATEGORIES = [
  'sports',
  'arts',
  'nature',
  'music',
  'education',
  'festival',
  'other',
];

export const SITEMAP_AGE_GROUPS = [
  'infants',
  'toddlers',
  'preschoolers',
  'kids',
  'teens',
];

export interface SitemapEventItem {
  id: string;
  updatedAt: Date;
  startDate: string;
}

/**
 * Builds the array of Sitemap entries given event records and base URL.
 */
export function buildDynamicSitemapEntries(
  events: SitemapEventItem[],
  baseUrl: string
): MetadataRoute.Sitemap {
  const normalizedBase = baseUrl.replace(/\/$/, '');

  // 1. Root Homepage & Legal Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: normalizedBase,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${normalizedBase}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${normalizedBase}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 2. High-intent Category Facets
  const categoryRoutes: MetadataRoute.Sitemap = SITEMAP_CATEGORIES.map((cat) => ({
    url: `${normalizedBase}/?category=${cat}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // 3. High-intent Age Group Facets
  const ageGroupRoutes: MetadataRoute.Sitemap = SITEMAP_AGE_GROUPS.map((age) => ({
    url: `${normalizedBase}/?ageGroup=${age}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // 4. Programmatic SEO Landing Pages (Pillars 1 & 3)
  const programmaticLandingRoutes: MetadataRoute.Sitemap = [
    {
      url: `${normalizedBase}/free-this-weekend`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${normalizedBase}/toddlers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${normalizedBase}/indoor-activities`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${normalizedBase}/locations/san-francisco`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${normalizedBase}/locations/south-bay`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${normalizedBase}/locations/peninsula`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${normalizedBase}/locations/east-bay`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${normalizedBase}/curators`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // 5. Upcoming Active Events
  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${normalizedBase}/?event=${event.id}`,
    lastModified: event.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...programmaticLandingRoutes,
    ...categoryRoutes,
    ...ageGroupRoutes,
    ...eventRoutes,
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const today = new Date().toISOString().split('T')[0];

  try {
    const activeEvents = await prisma.event.findMany({
      where: {
        status: 'approved',
        startDate: { gte: today },
      },
      select: {
        id: true,
        updatedAt: true,
        startDate: true,
      },
      orderBy: { startDate: 'asc' },
      take: 1000,
    });

    return buildDynamicSitemapEntries(activeEvents, baseUrl);
  } catch (error) {
    console.error('Error generating dynamic sitemap from database:', error);
    return buildDynamicSitemapEntries([], baseUrl);
  }
}
