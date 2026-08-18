import { GET as triggerCron } from '../src/app/api/cron/ingest/route';
import { prisma } from '../src/lib/prisma';

async function runTests() {
  console.log("Setting up DB mock state for cron test...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});

  // 1. Create a source that is NOT due (scraped 5 mins ago, interval 24 hours)
  const recentSource = await prisma.source.create({
    data: {
      handle: "recent_source",
      name: "Recent Source",
      lastScrapedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      scrapeIntervalHours: 24
    }
  });

  // 2. Create a source that IS due (scraped 2 days ago, interval 24 hours)
  const dueSource = await prisma.source.create({
    data: {
      handle: "bayarea_toddlerexplorer", // use a valid mock handle to prevent API crashes if triggered
      name: "Due Source",
      lastScrapedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
      scrapeIntervalHours: 24
    }
  });

  // Mock Request object with secret parameter to pass auth check
  const reqUrl = `http://localhost/api/cron/ingest?secret=fr33SCRAPER`;
  const mockRequest = new Request(reqUrl);

  console.log("Triggering cron endpoint...");
  const res = await triggerCron(mockRequest);
  const data = await res.json();

  console.log("Cron response data:", JSON.stringify(data, null, 2));

  // Assertions
  const recentReport = data.report.find((r: any) => r.source === "recent_source");
  const dueReport = data.report.find((r: any) => r.source === "bayarea_toddlerexplorer");

  if (!recentReport || recentReport.scraped !== false) {
    throw new Error("Test Failed: recent_source should not have been scraped.");
  }
  if (!dueReport || dueReport.scraped !== true) {
    throw new Error("Test Failed: dueSource should have been triggered for scraping.");
  }

  console.log("✅ Cron Ingestion Scheduling Test Passed successfully!");

  // Clean up
  console.log("\nCleaning up mock sources...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});
}

runTests().catch(err => {
  console.error("❌ Cron Test Suite Failed:", err);
  process.exit(1);
});
