import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Little Days Out',
  description:
    'Terms of Service for Little Days Out. Guidelines on community event listings, ticketing disclaimers, and user accounts.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 px-4 py-8 sm:px-6 lg:px-8 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-4xl w-full">
        {/* Navigation back */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-300 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Calendar
          </Link>
        </div>

        {/* Content Card */}
        <article className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 sm:p-10 shadow-xl space-y-8 text-slate-300">
          <header className="border-b border-slate-800/80 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <span>📜</span> Terms & Conditions
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Effective Date: October 2026 • Little Days Out (littledaysout.com)
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>1.</span> Acceptance of Terms
            </h2>
            <p className="text-sm leading-relaxed">
              By accessing or using Little Days Out (<a href="https://www.littledaysout.com" className="text-violet-400 hover:underline">www.littledaysout.com</a>), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, please do not use our website.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>2.</span> Description of Service
            </h2>
            <p className="text-sm leading-relaxed">
              Little Days Out is an informational community calendar directory designed to help families discover kids activities, library story hours, science workshops, park outings, and weekend festivals in the San Francisco Bay Area.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>3.</span> Event Accuracy & Disclaimers
            </h2>
            <p className="text-sm leading-relaxed">
              While we strive to curate accurate, high-quality event information:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm pl-2">
              <li>Event times, locations, admission fees, and age recommendations are subject to change by event organizers without notice.</li>
              <li>Events may be canceled or rescheduled due to inclement weather, facility closures, or host decisions.</li>
              <li>We strongly encourage parents and caregivers to verify event details directly with the hosting venue or organization before attending.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>4.</span> Third-Party Links & Ticketing
            </h2>
            <p className="text-sm leading-relaxed">
              Little Days Out does not organize, sponsor, host, or sell tickets directly for listed events. Links to ticket providers (e.g. Eventbrite, museum ticketing systems) or social media pages are provided solely for your convenience. Any ticket purchases, registrations, or refunds are strictly between you and the respective third-party vendor.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>5.</span> User Accounts & Conduct
            </h2>
            <p className="text-sm leading-relaxed">
              When signing in with Google, you agree to provide accurate information and safeguard your account. You agree not to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm pl-2">
              <li>Use the service for any unlawful purpose or to distribute spam.</li>
              <li>Attempt to disrupt, scrape excessively, or compromise site availability or security.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>6.</span> Limitation of Liability
            </h2>
            <p className="text-sm leading-relaxed">
              Little Days Out is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. To the fullest extent permitted by law, Little Days Out and its creators shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the website or attendance at any listed event.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-800/80 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>7.</span> Contact Information
            </h2>
            <p className="text-sm leading-relaxed">
              For questions regarding these Terms of Service, please contact:
            </p>
            <p className="text-sm font-semibold text-white">
              Little Days Out • Eric Lam<br />
              Email: <a href="mailto:elam03@gmail.com" className="text-violet-400 hover:underline">elam03@gmail.com</a><br />
              Website: <a href="https://www.littledaysout.com" className="text-violet-400 hover:underline">https://www.littledaysout.com</a>
            </p>
          </section>
        </article>
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Little Days Out • All rights reserved.</p>
      </footer>
    </div>
  );
}
