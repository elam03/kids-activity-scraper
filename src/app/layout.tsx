import './globals.css';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import Script from 'next/script';
import { resolveGaMeasurementId } from '@/lib/event-utils';
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  buildWebSiteJsonLd,
  getSiteIcons,
} from '@/lib/seo-utils';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Kids Activities & Family Events in SF Bay Area`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  icons: getSiteIcons(),
  manifest: '/manifest.webmanifest',
  keywords: [
    'kids activities bay area',
    'family events sf',
    'things to do with kids san jose',
    'bay area toddler events',
    'weekend family calendar',
    'little days out',
    'bay area kids calendar',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${SITE_NAME} | Kids Activities & Family Events in SF Bay Area`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Kids Activities & Family Events in SF Bay Area`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = resolveGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  const websiteJsonLd = buildWebSiteJsonLd();

  return (
    <html lang="en" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={`${outfit.className} min-h-screen antialiased`}>
        {gaId && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script
              id="google-analytics-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                `,
              }}
            />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
