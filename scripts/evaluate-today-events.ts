#!/usr/bin/env node
/**
 * Evaluate Event Data from Railway Postgres DB
 *
 * Pulls events active for today (or a specified date) directly from the database,
 * evaluates their accuracy and calendar-rendering completeness, and outputs a lightweight CSV.
 *
 * Usage:
 *   npx tsx scripts/evaluate-today-events.ts
 *   npx tsx scripts/evaluate-today-events.ts --date 2026-10-03
 *   npx tsx scripts/evaluate-today-events.ts --scope single
 *   npx tsx scripts/evaluate-today-events.ts --status all --output my-events.csv
 */

import fs from 'fs';
import path from 'path';
import net from 'net';
import { spawn, type ChildProcess } from 'child_process';
import { PrismaClient } from '@prisma/client';
import {
  transformDbEventToRow,
  formatEventsAsCsv,
  formatLocalDate,
  type RawDbEvent,
} from '../src/lib/event-evaluator';

// Parse command line arguments
interface CliOptions {
  date: string;
  scope: 'today' | 'single' | 'multi' | 'all';
  status: 'approved' | 'pending' | 'rejected' | 'all';
  output?: string;
  limit?: number;
  envFile?: string;
  help?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const now = new Date();
  const defaultDate = formatLocalDate(now);

  const options: CliOptions = {
    date: defaultDate,
    scope: 'today',
    status: 'approved',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--date' || arg === '-d') {
      options.date = args[++i] || defaultDate;
    } else if (arg === '--scope' || arg === '-s') {
      const val = (args[++i] || 'today') as CliOptions['scope'];
      if (['today', 'single', 'multi', 'all'].includes(val)) {
        options.scope = val;
      }
    } else if (arg === '--status') {
      const val = (args[++i] || 'approved') as CliOptions['status'];
      if (['approved', 'pending', 'rejected', 'all'].includes(val)) {
        options.status = val;
      }
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--limit' || arg === '-l') {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--env' || arg === '-e') {
      options.envFile = args[++i];
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
📅 Kids Activity Calendar — Event Data Evaluation Script

Pulls events active for today directly from the Railway Postgres database rows,
evaluates extraction accuracy & quality, and writes a lightweight CSV matching calendar rendering.

Usage:
  npx tsx scripts/evaluate-today-events.ts [options]

Options:
  -d, --date <YYYY-MM-DD>     Target date (defaults to today)
  -s, --scope <scope>         Filter scope: 'today' (default), 'single', 'multi', or 'all'
      --status <status>       Approval status: 'approved' (default), 'pending', 'rejected', or 'all'
  -o, --output <filename>     Output CSV file path (defaults to events-<date>.csv)
  -l, --limit <count>         Maximum number of events to export
  -e, --env <path>            Path to env file (defaults to .env.railway.local)
  -h, --help                  Show this help message

Columns in CSV:
  - id                        Event UUID
  - title                     Display title
  - date                      Event date (or date range)
  - time                      Start and end time (or 'All day')
  - category                  Category (nature, arts, sports, festival, etc.)
  - age_range                 Target age group (e.g. '2-10 years')
  - cost                      Cost or 'Free'
  - location                  Venue or address
  - description               Original post caption
  - source                    Scraped source handle (@handle)
  - original_link             Instagram source post URL
  - registration_url          External signup / ticket link
  - accuracy_rating           Calculated accuracy rating & quality flags

Examples:
  npx tsx scripts/evaluate-today-events.ts
  npx tsx scripts/evaluate-today-events.ts --scope single
  npx tsx scripts/evaluate-today-events.ts --date 2026-10-03 --status all -o test.csv
`);
}

/**
 * Loads DATABASE_URL from candidate env files.
 */
function resolveDatabaseUrl(customEnvPath?: string): string {
  const rootDir = process.cwd();
  const candidates = customEnvPath
    ? [path.resolve(rootDir, customEnvPath)]
    : [
        path.resolve(rootDir, '.env.railway.local'),
        path.resolve(rootDir, '.env.local'),
        path.resolve(rootDir, '.env'),
      ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const eqIdx = trimmed.indexOf('=');
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (key === 'DATABASE_URL') {
          // Strip surrounding quotes
          val = val.replace(/^["']|["']$/g, '');
          if (val) return val;
        }
      }
    }
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  throw new Error(
    'DATABASE_URL not found. Please ensure credentials are in .env.railway.local or set in process.env'
  );
}

/**
 * Tests if a TCP host/port is reachable.
 */
function isPortReachable(port: number, host: string, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

/**
 * Ensures the database connection endpoint is accessible.
 * If pointing to localhost/127.0.0.1 and not open, attempts to launch Railway tunnel automatically.
 */
async function ensureDbReachable(
  dbUrl: string
): Promise<{ tunnelProcess: ChildProcess | null }> {
  try {
    const parsed = new URL(dbUrl);
    const host = parsed.hostname;
    const port = parseInt(parsed.port, 10) || 5432;

    if (host === '127.0.0.1' || host === 'localhost') {
      const reachable = await isPortReachable(port, host);
      if (!reachable) {
        console.log(
          `[evaluator] 🔌 Port ${port} is closed. Attempting to start Railway tunnel on port ${port}...`
        );
        const tunnelProcess = spawn('railway', ['connect', 'Postgres', '--tunnel-only', '-P', String(port)], {
          stdio: 'ignore',
          detached: false,
        });

        // Wait up to 5 seconds for tunnel to become ready
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (await isPortReachable(port, host)) {
            console.log(`[evaluator] ✅ Railway tunnel established on port ${port}`);
            return { tunnelProcess };
          }
        }

        console.error(
          `\n❌ Failed to connect to local Postgres tunnel at ${host}:${port}.\n` +
            `👉 Please open a separate terminal and run:\n` +
            `   railway connect Postgres --tunnel-only -P ${port}\n`
        );
        process.exit(1);
      }
    }
  } catch (err) {
    // If URL parsing fails, let Prisma attempt connection directly
  }

  return { tunnelProcess: null };
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const dbUrl = resolveDatabaseUrl(options.envFile);
  const { tunnelProcess } = await ensureDbReachable(dbUrl);

  const prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  });

  try {
    const targetDate = options.date;
    console.log(`[evaluator] 🔍 Querying database for date: ${targetDate} (Scope: ${options.scope}, Status: ${options.status})`);

    // Build where clause based on status and scope
    const where: any = {};

    if (options.status !== 'all') {
      where.status = options.status;
    }

    if (options.scope === 'single') {
      where.startDate = targetDate;
      where.OR = [{ endDate: null }, { endDate: targetDate }];
    } else if (options.scope === 'multi') {
      where.startDate = { lte: targetDate };
      where.endDate = { gte: targetDate };
      where.NOT = { endDate: targetDate };
    } else if (options.scope === 'today') {
      where.OR = [
        { startDate: targetDate },
        {
          AND: [{ startDate: { lte: targetDate } }, { endDate: { gte: targetDate } }],
        },
      ];
    }
    // scope === 'all' applies no date filter

    const dbEvents = await prisma.event.findMany({
      where,
      include: {
        source: true,
        feedbacks: true,
      },
      orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }],
      take: options.limit,
    });

    console.log(`[evaluator] 📊 Retrieved ${dbEvents.length} event row(s) from database.`);

    if (dbEvents.length === 0) {
      console.log(`[evaluator] No events found matching the criteria.`);
      return;
    }

    // Transform to calendar evaluation rows
    const rows = (dbEvents as unknown as RawDbEvent[]).map(transformDbEventToRow);

    // Calculate quality breakdown
    const tierCounts = { High: 0, Medium: 0, Low: 0 };
    rows.forEach((r) => {
      if (r.accuracy_rating.startsWith('High')) tierCounts.High++;
      else if (r.accuracy_rating.startsWith('Medium')) tierCounts.Medium++;
      else tierCounts.Low++;
    });

    // Write CSV
    const defaultFilename = `events-${targetDate}.csv`;
    const outputPath = path.resolve(process.cwd(), options.output || defaultFilename);
    const csvContent = formatEventsAsCsv(rows);
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    // Terminal Summary
    console.log(`\n======================================================`);
    console.log(`🎯 Event Data Evaluation Summary (${targetDate})`);
    console.log(`======================================================`);
    console.log(`Total Events:    ${rows.length}`);
    console.log(`Accuracy Tiers:  🟢 High: ${tierCounts.High} | 🟡 Medium: ${tierCounts.Medium} | 🔴 Low: ${tierCounts.Low}`);
    console.log(`CSV Exported to: ${outputPath}\n`);

    console.log(`--- Sample Preview (First 5 Rows) ---`);
    rows.slice(0, 5).forEach((r, idx) => {
      console.log(
        `[${idx + 1}] "${r.title}"\n` +
          `    When:     ${r.date} (${r.time})\n` +
          `    Where:    ${r.location}\n` +
          `    Cost:     ${r.cost} | Age: ${r.age_range} | Category: ${r.category}\n` +
          `    Source:   ${r.source} (${r.original_link})\n` +
          `    Rating:   ${r.accuracy_rating}\n`
      );
    });

    if (rows.length > 5) {
      console.log(`... and ${rows.length - 5} more rows in ${path.basename(outputPath)}.`);
    }
  } catch (error) {
    console.error(`[evaluator] ❌ Error querying or evaluating events:`, (error as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    if (tunnelProcess) {
      tunnelProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error('[evaluator] Fatal error:', err);
  process.exit(1);
});
