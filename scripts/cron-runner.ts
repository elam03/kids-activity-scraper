/**
 * Railway Cron Runner
 *
 * Deployed as a separate Railway Cron Service. Fires every 6 hours.
 * Calls /api/cron/ingest, which checks each source's adaptive interval
 * and only scrapes sources that are actually due — so running every 6h
 * is safe and won't over-scrape any source.
 *
 * MUST exit (0 = success, 1 = failure) so Railway marks the run complete
 * and schedules the next one. If the process stays alive, Railway will
 * skip subsequent cron executions.
 */

const APP_URL = (process.env.APP_URL ?? '').replace(/\/$/, ''); // strip trailing slash
const CRON_SECRET = process.env.CRON_SECRET ?? process.env.ADMIN_PASSWORD;

if (!APP_URL) {
  console.error('[cron-runner] ERROR: APP_URL is not set');
  process.exit(1);
}

if (!CRON_SECRET) {
  console.error('[cron-runner] ERROR: CRON_SECRET (or ADMIN_PASSWORD) is not set');
  process.exit(1);
}

interface SourceReport {
  source: string;
  scraped: boolean;
  intervalHours: number;
  scrapedCount?: number;
  processedCount?: number;
  skippedCount?: number;
  newIntervalHours?: number;
  error?: string;
}

interface CronResponse {
  success?: boolean;
  report?: SourceReport[];
  error?: string;
}

async function run(): Promise<void> {
  const url = `${APP_URL}/api/cron/ingest?secret=${encodeURIComponent(CRON_SECRET!)}`;
  const startedAt = new Date().toISOString();

  console.log(`[cron-runner] Starting run at ${startedAt}`);
  console.log(`[cron-runner] Target: ${APP_URL}/api/cron/ingest`);

  const response = await fetch(url, { method: 'GET' });
  const data = (await response.json()) as CronResponse;

  if (!response.ok || !data.success) {
    console.error(`[cron-runner] ERROR: HTTP ${response.status} — ${data.error ?? 'Unknown error'}`);
    process.exit(1);
  }

  const report = data.report ?? [];
  const scraped = report.filter((r) => r.scraped);
  const skipped = report.filter((r) => !r.scraped);

  console.log(
    `[cron-runner] Done. ${scraped.length} source(s) scraped, ` +
      `${skipped.length} source(s) skipped (not due).`
  );

  for (const r of scraped) {
    if (r.error) {
      console.error(`[cron-runner]   ❌ @${r.source}: ${r.error}`);
    } else {
      console.log(
        `[cron-runner]   ✅ @${r.source}: ${r.scrapedCount} posts scraped, ` +
          `${r.processedCount} new events, ${r.skippedCount} dupes. ` +
          `Next interval: ${r.newIntervalHours}h`
      );
    }
  }

  for (const r of skipped) {
    console.log(`[cron-runner]   ⏭  @${r.source}: not due (interval: ${r.intervalHours}h)`);
  }
}

run().catch((err: Error) => {
  console.error('[cron-runner] FATAL:', err.message);
  process.exit(1);
});
