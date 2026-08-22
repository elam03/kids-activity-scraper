import './globals.css';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';

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
  return (
    <html lang="en" className="h-full">
      <body className={`${outfit.className} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
