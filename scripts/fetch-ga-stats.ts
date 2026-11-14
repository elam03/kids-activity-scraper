import fs from 'node:fs';
import path from 'node:path';

// Automatically load .env.local and .env for standalone script execution
function loadLocalEnv() {
  const rootDir = process.cwd();
  const candidates = [
    path.resolve(rootDir, '.env.local'),
    path.resolve(rootDir, '.env.railway.local'),
    path.resolve(rootDir, '.env'),
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    let currentKey = '';
    let currentValue = '';
    let inQuotes = false;
    let quoteChar = '';

    for (const line of lines) {
      if (!inQuotes) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        currentKey = line.slice(0, eqIdx).trim();
        let rest = line.slice(eqIdx + 1).trim();

        if (
          (rest.startsWith('"') && !rest.endsWith('"')) ||
          (rest.startsWith("'") && !rest.endsWith("'"))
        ) {
          inQuotes = true;
          quoteChar = rest[0];
          currentValue = rest.slice(1);
        } else {
          if (
            (rest.startsWith('"') && rest.endsWith('"')) ||
            (rest.startsWith("'") && rest.endsWith("'"))
          ) {
            rest = rest.slice(1, -1);
          }
          if (!process.env[currentKey]) {
            process.env[currentKey] = rest;
          }
        }
      } else {
        if (line.endsWith(quoteChar)) {
          currentValue += '\n' + line.slice(0, -1);
          inQuotes = false;
          if (!process.env[currentKey]) {
            process.env[currentKey] = currentValue;
          }
        } else {
          currentValue += '\n' + line;
        }
      }
    }
  }
}

loadLocalEnv();

import {
  isGa4Configured,
  getGa4CredentialsSummary,
  fetchGa4Overview,
  fetchGa4Realtime,
  fetchGa4TopPages,
  fetchGa4TrafficSources,
  fetchGa4CustomEvents,
} from '../src/lib/ga4-api';

async function main() {
  console.log('\n======================================================');
  console.log('📊 Google Analytics 4 (GA4) Programmatic Statistics');
  console.log('======================================================\n');

  const summary = getGa4CredentialsSummary();

  if (!summary.configured) {
    console.log('❌ GA4 Data API is NOT configured.\n');
    console.log('Status:');
    console.log(`  • Property ID set: ${summary.hasPropertyId ? '✅ Yes (' + summary.propertyId + ')' : '❌ No (GA4_PROPERTY_ID missing)'}`);
    console.log(`  • Credentials set: ${summary.hasCredentials ? '✅ Yes (' + summary.authMethod + ')' : '❌ No (GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY missing)'}`);
    console.log('\n------------------------------------------------------');
    console.log('🛠️  How to configure in 3 simple steps:');
    console.log('------------------------------------------------------');
    console.log('1. Find your GA4 Numeric Property ID:');
    console.log('   Go to https://analytics.google.com/ -> Admin (gear) -> Property Details.');
    console.log('   Copy the numeric "PROPERTY ID" at top right (e.g. 123456789).');
    console.log('   Set in .env.local: GA4_PROPERTY_ID=123456789\n');
    console.log('2. Create a Google Cloud Service Account:');
    console.log('   a. Go to Google Cloud Console (https://console.cloud.google.com/).');
    console.log('   b. Enable "Google Analytics Data API".');
    console.log('   c. IAM & Admin -> Service Accounts -> Create Service Account.');
    console.log('   d. Keys -> Add Key -> Create new key -> JSON.');
    console.log('   e. Set in .env.local:');
    console.log('      GA4_CLIENT_EMAIL=<client_email from json>');
    console.log('      GA4_PRIVATE_KEY="<private_key from json>"\n');
    console.log('3. Grant Viewer Access in Google Analytics:');
    console.log('   In Google Analytics -> Admin -> Property Access Management.');
    console.log('   Click (+) -> Add users -> Paste your Service Account email.');
    console.log('   Assign role "Viewer".\n');
    console.log('Once added, re-run: npm run ga:stats\n');
    return;
  }

  console.log(`✅ Authenticating with GA4 Property: ${summary.propertyId}`);
  console.log(`   Account: ${summary.clientEmail || summary.authMethod}\n`);

  // 1. Realtime Active Users
  console.log('⚡ Querying Realtime Traffic (Last 30 Minutes)...');
  const realtime = await fetchGa4Realtime();
  if (realtime.error) {
    console.warn(`  ⚠ Realtime notice: ${realtime.error}`);
  } else if (realtime.data) {
    console.log(`  Active users right now: ${realtime.data.activeUsers}`);
    if (realtime.data.pages.length > 0) {
      console.log('  Active pages:');
      realtime.data.pages.forEach((p) => {
        console.log(`    • ${p.path} (${p.activeUsers} active)`);
      });
    }
  }

  // 2. Overview Metrics (Last 7 Days)
  console.log('\n📈 Overview Performance (Last 7 Days):');
  const overview = await fetchGa4Overview(7);
  if (overview.error) {
    console.warn(`  ⚠ Overview notice: ${overview.error}`);
  } else if (overview.metrics) {
    const m = overview.metrics;
    console.table([
      { Metric: 'Active Users', Value: m.activeUsers },
      { Metric: 'New Users', Value: m.newUsers },
      { Metric: 'Sessions', Value: m.sessions },
      { Metric: 'Page Views', Value: m.screenPageViews },
      { Metric: 'Engagement Rate', Value: m.formattedEngagementRate },
      { Metric: 'Avg Session Duration', Value: m.formattedAverageDuration },
    ]);
  }

  // 3. Top Visited Pages
  console.log('\n📄 Top Visited Pages (Last 7 Days):');
  const pages = await fetchGa4TopPages(10, 7);
  if (pages.error) {
    console.warn(`  ⚠ Pages notice: ${pages.error}`);
  } else if (pages.pages && pages.pages.length > 0) {
    console.table(
      pages.pages.map((p) => ({
        'Page Path': p.pagePath,
        'Page Views': p.screenPageViews,
        'Active Users': p.activeUsers,
      }))
    );
  } else {
    console.log('  No pageview data recorded in this period.');
  }

  // 4. Traffic Acquisition Sources
  console.log('\n🌐 Acquisition Channels & Referrers:');
  const sources = await fetchGa4TrafficSources(10, 7);
  if (sources.error) {
    console.warn(`  ⚠ Sources notice: ${sources.error}`);
  } else if (sources.sources && sources.sources.length > 0) {
    console.table(
      sources.sources.map((s) => ({
        Source: s.source,
        Medium: s.medium,
        Sessions: s.sessions,
        Users: s.activeUsers,
      }))
    );
  } else {
    console.log('  No traffic sources recorded in this period.');
  }

  // 5. Custom Event Telemetry
  console.log('\n🎯 Custom Events Telemetry:');
  const events = await fetchGa4CustomEvents(15, 7);
  if (events.error) {
    console.warn(`  ⚠ Custom events notice: ${events.error}`);
  } else if (events.events && events.events.length > 0) {
    console.table(
      events.events.map((e) => ({
        'Event Name': e.eventName,
        'Event Count': e.eventCount,
        'Unique Users': e.totalUsers,
      }))
    );
  } else {
    console.log('  No custom events recorded in this period.');
  }

  console.log('\n🎉 Finished fetching Google Analytics statistics!\n');
}

main().catch((err) => {
  console.error('GA4 statistics script error:', err);
  process.exit(1);
});
