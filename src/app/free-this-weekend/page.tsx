import type { Metadata } from 'next';
import CalendarApp from '@/components/calendar/CalendarApp';
import LandingHero from '@/components/calendar/LandingHero';
import {
  LANDING_PAGES,
  generateLandingPageMetadata,
} from '@/lib/seo-landing-pages';

export const revalidate = 3600; // 1-hour ISR revalidation

const config = LANDING_PAGES['free-this-weekend'];

export const metadata: Metadata = {
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

export default function FreeThisWeekendPage() {
  return (
    <CalendarApp
      initialFreeOnly={true}
      headerHero={<LandingHero config={config} />}
    />
  );
}
