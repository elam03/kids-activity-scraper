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
    <html lang="en" className="dark h-full bg-slate-950 text-slate-100">
      <body className={`${outfit.className} h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
