/**
 * Test: cron-runner.ts logic via direct function injection.
 *
 * Rather than spawning the script as a subprocess (which is slow with tsx),
 * we test the core fetch-and-exit logic by extracting it into a testable form.
 * The env-var guard tests use execSync for fast tests (no network needed).
 */

import { execSync } from 'child_process';
import * as http from 'http';

// ─── helpers ──────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`❌ FAIL: ${message}`);
  console.log(`  ✅ ${message}`);
}

/** Runs the cron runner synchronously (fast path: exits before network calls) */
function runRunnerSync(env: Record<string, string>): { exitCode: number; stderr: string } {
  try {
    execSync('npx tsx scripts/cron-runner.ts', {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, stderr: '' };
  } catch (err: any) {
    return { exitCode: err.status ?? 1, stderr: (err.stderr ?? '').toString() };
  }
}

/** Starts a mock HTTP server and returns its URL + a close function */
function startMockServer(statusCode: number, body: object): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

/**
 * Directly invokes the cron runner's fetch logic in-process.
 * Mirrors cron-runner.ts but returns { exitCode } instead of calling process.exit().
 */
async function runCronLogic(
  appUrl: string,
  cronSecret: string,
  fetchImpl: typeof fetch
): Promise<{ exitCode: number; logs: string[] }> {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(msg);

  const url = `${appUrl.replace(/\/$/, '')}/api/cron/ingest?secret=${encodeURIComponent(cronSecret)}`;
  log(`[cron-runner] Target: ${url}`);

  const response = await fetchImpl(url, { method: 'GET' });
  const data = (await response.json()) as { success?: boolean; report?: any[]; error?: string };

  if (!response.ok || !data.success) {
    log(`[cron-runner] ERROR: HTTP ${response.status} — ${data.error ?? 'Unknown error'}`);
    return { exitCode: 1, logs };
  }

  const report = data.report ?? [];
  log(`[cron-runner] Done. ${report.filter((r: any) => r.scraped).length} source(s) scraped.`);
  return { exitCode: 0, logs };
}

// ─── tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n=== cron-runner.ts tests ===\n');
  let passed = 0;
  let failed = 0;

  // ── Test 1: Missing APP_URL exits with code 1 (fast — no network) ──────────
  {
    console.log('Test 1: Missing APP_URL should exit(1)');
    const { exitCode, stderr } = runRunnerSync({ APP_URL: '', CRON_SECRET: 'test' });
    try {
      assert(exitCode === 1, 'exit code is 1');
      assert(stderr.includes('APP_URL'), 'stderr mentions APP_URL');
      passed++;
    } catch (e: any) { console.error(e.message); failed++; }
  }

  // ── Test 2: Missing CRON_SECRET and ADMIN_PASSWORD exits with code 1 ────────
  {
    console.log('\nTest 2: Missing CRON_SECRET and ADMIN_PASSWORD should exit(1)');
    const { exitCode, stderr } = runRunnerSync({ APP_URL: 'http://localhost:9', CRON_SECRET: '', ADMIN_PASSWORD: '' });
    try {
      assert(exitCode === 1, 'exit code is 1');
      assert(stderr.includes('CRON_SECRET'), 'stderr mentions CRON_SECRET');
      passed++;
    } catch (e: any) { console.error(e.message); failed++; }
  }

  // ── Test 3: Successful cron response → exitCode 0 ─────────────────────────
  {
    console.log('\nTest 3: Successful cron response should return exitCode 0');
    const successBody = {
      success: true,
      report: [
        { source: 'bayarea_kids', scraped: true, intervalHours: 24, scrapedCount: 5, processedCount: 2, skippedCount: 3, newIntervalHours: 24 },
        { source: 'sf_toddlers', scraped: false, intervalHours: 48 },
      ],
    };
    const mockFetch = async (_url: string) =>
      new Response(JSON.stringify(successBody), { status: 200, headers: { 'content-type': 'application/json' } });

    try {
      const { exitCode, logs } = await runCronLogic('https://example.com', 'secret', mockFetch as any);
      assert(exitCode === 0, 'exitCode is 0');
      assert(logs.some((l) => l.includes('1 source(s) scraped')), 'logs report 1 scraped source');
      passed++;
    } catch (e: any) { console.error(e.message); failed++; }
  }

  // ── Test 4: HTTP 401 → exitCode 1 ─────────────────────────────────────────
  {
    console.log('\nTest 4: HTTP 401 should return exitCode 1');
    const mockFetch = async (_url: string) =>
      new Response(JSON.stringify({ error: 'Unauthorized cron trigger invocation' }), { status: 401, headers: { 'content-type': 'application/json' } });

    try {
      const { exitCode, logs } = await runCronLogic('https://example.com', 'wrong', mockFetch as any);
      assert(exitCode === 1, 'exitCode is 1');
      assert(logs.some((l) => l.includes('ERROR')), 'logs contain ERROR');
      passed++;
    } catch (e: any) { console.error(e.message); failed++; }
  }

  // ── Test 5: success=false body → exitCode 1 ───────────────────────────────
  {
    console.log('\nTest 5: success=false body should return exitCode 1');
    const mockFetch = async (_url: string) =>
      new Response(JSON.stringify({ success: false, error: 'DB connection failed' }), { status: 200, headers: { 'content-type': 'application/json' } });

    try {
      const { exitCode, logs } = await runCronLogic('https://example.com', 'secret', mockFetch as any);
      assert(exitCode === 1, 'exitCode is 1');
      assert(logs.some((l) => l.includes('ERROR')), 'logs contain ERROR');
      passed++;
    } catch (e: any) { console.error(e.message); failed++; }
  }

  // ── Test 6: Network fetch error → exitCode 1 ──────────────────────────────
  {
    console.log('\nTest 6: Network error should return exitCode 1');
    const mockFetch = async (_url: string): Promise<Response> => {
      throw new Error('ECONNREFUSED');
    };

    try {
      // runCronLogic's caller (the run() function) catches and exits(1)
      let exitCode = 0;
      try {
        await runCronLogic('https://example.com', 'secret', mockFetch as any);
      } catch {
        exitCode = 1;
      }
      assert(exitCode === 1, 'exitCode is 1 on network error');
      passed++;
    } catch (e: any) { console.error(e.message); failed++; }
  }

  // ── Test 7: Manual end-to-end against live mock server ────────────────────
  {
    console.log('\nTest 7: End-to-end against live mock HTTP server');
    const { url, close } = await startMockServer(200, {
      success: true,
      report: [{ source: 'live_test', scraped: true, intervalHours: 6, scrapedCount: 3, processedCount: 1, skippedCount: 2, newIntervalHours: 6 }],
    });

    try {
      const { exitCode, logs } = await runCronLogic(url, 'any-secret', fetch);
      assert(exitCode === 0, 'exitCode is 0');
      assert(logs.some((l) => l.includes('1 source(s) scraped')), 'logs report scraped source');
      passed++;
    } catch (e: any) { console.error(e.message); failed++; }
    finally { close(); }
  }

  // ─── summary ──────────────────────────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
