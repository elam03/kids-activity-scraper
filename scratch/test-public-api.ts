import { GET as getPublicEvents } from '../src/app/api/events/route';
import { prisma } from '../src/lib/prisma';

async function runTests() {
  console.log("Setting up DB mock state...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});

  const source = await prisma.source.create({
    data: {
      handle: "test_public_source",
      name: "Public Source"
    }
  });

  // 1. Create one approved event and one pending event
  console.log("Creating mock events...");
  await prisma.event.create({
    data: {
      sourceId: source.id,
      title: "Public Event Approved",
      startDate: "2026-08-20",
      category: "sports",
      rawPostUrl: "https://instagram.com/p/approved1",
      rawCaption: "Approved event caption",
      status: "approved"
    }
  });

  await prisma.event.create({
    data: {
      sourceId: source.id,
      title: "Vague Event Pending",
      startDate: "2026-08-21",
      category: "arts",
      rawPostUrl: "https://instagram.com/p/pending1",
      rawCaption: "Pending event caption",
      status: "pending"
    }
  });

  // 2. Query public endpoint and assert only approved event returned
  console.log("\n--- Test 1: GET /api/events returns only approved ---");
  const res = await getPublicEvents();
  const data = await res.json();

  if (res.status !== 200 || data.events.length !== 1 || data.events[0].title !== "Public Event Approved") {
    throw new Error(`Test 1 Failed: Expected 1 approved event, got ${JSON.stringify(data)}`);
  }
  console.log("✅ Test 1 Passed: Public API filter verified successfully.");

  // Clean up
  console.log("\nCleaning up...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});
  console.log("✅ All Public API Integration Tests Passed!");
}

runTests().catch(err => {
  console.error("❌ Test Suite Failed:", err);
  process.exit(1);
});
