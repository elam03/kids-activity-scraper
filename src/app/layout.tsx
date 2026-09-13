import './globals.css';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import Script from 'next/script';
import { resolveGaMeasurementId } from '@/lib/event-utils';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kids Activity Calendar',
  description: 'Curated calendar of events and activities for children in the San Francisco Bay Area.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = resolveGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

  return (
    <html lang="en" className="h-full">
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
