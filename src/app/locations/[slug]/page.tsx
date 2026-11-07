import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CalendarApp from '@/components/calendar/CalendarApp';
import LandingHero from '@/components/calendar/LandingHero';
import {
  LOCATION_REGIONS,
  LANDING_PAGES,
  type LandingPageSlug,
} from '@/lib/seo-landing-pages';

interface LocationPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return Object.keys(LOCATION_REGIONS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const region = LOCATION_REGIONS[params.slug];
  if (!region) return {};

  const landingSlug = `location-${params.slug}` as LandingPageSlug;
  const config = LANDING_PAGES[landingSlug];
  if (!config) return {};

  return {
    title: config.title,
    description: config.description,
    alternates: {
      canonical: config.routePath,
    },
    openGraph: {
      title: `${config.title} | Little Days Out`,
      description: config.description,
      url: `https://www.littledaysout.com${config.routePath}`,
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

export default function LocationPage({ params }: LocationPageProps) {
  const region = LOCATION_REGIONS[params.slug];
  if (!region) {
    notFound();
  }

  const landingSlug = `location-${params.slug}` as LandingPageSlug;
  const config = LANDING_PAGES[landingSlug];

  return (
    <CalendarApp
      locationFilter={params.slug}
      headerHero={<LandingHero config={config} />}
    />
  );
}
