import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Little Days Out',
  description:
    'Privacy Policy for Little Days Out. Explains data collected through Google OAuth authentication, bookmarks, and privacy-first design.',
};

export default function PrivacyPolicyPage() {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-3">
              <span>🔒</span> Privacy & Data Protection
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Effective Date: October 2026 • Little Days Out (littledaysout.com)
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>1.</span> Overview
            </h2>
            <p className="text-sm leading-relaxed">
              Little Days Out is a free community directory helping parents and caregivers discover curated kids activities, weekend festivals, and family outings across the San Francisco Bay Area. We are committed to protecting your privacy and minimizing the personal data we collect.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>2.</span> Information We Collect
            </h2>
            <p className="text-sm leading-relaxed">
              We collect information only when you voluntarily sign in or interact with our features:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm pl-2">
              <li>
                <strong className="text-white">Google Account Data:</strong> When you sign in using Google One-Tap or Google Sign-In, we receive basic profile information authorized by you: your name, email address, profile picture URL, and Google unique user ID (<code className="text-violet-300">sub</code>).
              </li>
              <li>
                <strong className="text-white">Bookmarks & Preferences:</strong> When signed in, we store the IDs of events you bookmark so you can access your saved activities across your devices.
              </li>
              <li>
                <strong className="text-white">Anonymous Interaction Metrics:</strong> We collect aggregate, non-personally identifiable telemetry via Google Analytics 4 (such as view modes, category filters, and outbound ticket clicks) to understand which activities are helpful to parents.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>3.</span> How We Use Your Information
            </h2>
            <p className="text-sm leading-relaxed">
              Your information is used strictly to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm pl-2">
              <li>Authenticate your account and maintain your login session.</li>
              <li>Save and retrieve your bookmarked events.</li>
              <li>Maintain site security and prevent abusive requests.</li>
            </ul>
            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm font-medium">
              ✨ <strong>No Selling of Personal Data:</strong> We will never sell, rent, monetize, or share your personal information with third-party advertisers or data brokers.
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>4.</span> Cookies and Storage
            </h2>
            <p className="text-sm leading-relaxed">
              We use standard browser cookies and local storage:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm pl-2">
              <li>
                <strong className="text-white">Session Cookie (<code className="text-violet-300">auth_session</code>):</strong> A secure, HTTP-only, SameSite-restricted encrypted token used solely to keep you signed in.
              </li>
              <li>
                <strong className="text-white">Local Storage:</strong> Used to temporarily store anonymous bookmarks and UI theme preferences (<code className="text-violet-300">calendar-theme</code>).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>5.</span> External Links & Third-Party Sites
            </h2>
            <p className="text-sm leading-relaxed">
              Our calendar lists community events with links to original Instagram posts and external ticket providers (e.g. Eventbrite, museum ticket pages). When clicking these outbound links, their respective privacy policies govern your interactions on those platforms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>6.</span> Data Retention & Account Deletion
            </h2>
            <p className="text-sm leading-relaxed">
              You may request immediate deletion of your account and all associated bookmarks at any time. Simply email us at <a href="mailto:elam03@gmail.com" className="text-violet-400 hover:underline">elam03@gmail.com</a> with your request, and we will purge your user record within 48 hours.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-800/80 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>7.</span> Contact Us
            </h2>
            <p className="text-sm leading-relaxed">
              If you have any questions or feedback regarding this Privacy Policy, please contact:
            </p>
            <p className="text-sm font-semibold text-white">
              Little Days Out • Eric Lam<br />
              Email: <a href="mailto:elam03@gmail.com" className="text-violet-400 hover:underline">elam03@gmail.com</a> / <a href="mailto:feedback@littledaysout.com" className="text-violet-400 hover:underline">feedback@littledaysout.com</a><br />
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
