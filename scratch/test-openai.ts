import { extractEventsFromPost, ExtractionResult } from '../src/lib/openai';
import { prisma } from '../src/lib/prisma';

const mockHighConfidenceResponse: ExtractionResult = {
  isEvent: true,
  confidence: 0.95,
  events: [
    {
      title: "Nature Walk for Toddlers",
      startDate: "2026-08-20",
      category: "nature",
      isFree: true,
      cost: "Free",
      description: "Explore the woods in San Jose!"
    }
  ]
};

const mockLowConfidenceResponse: ExtractionResult = {
  isEvent: true,
  confidence: 0.65,
  events: [
    {
      title: "Unknown Craft Event",
      startDate: "2026-08-21",
      category: "arts",
      isFree: false,
      cost: "$10",
      description: "Craft session, details vague."
    }
  ]
};

const mockNonEventResponse: ExtractionResult = {
  isEvent: false,
  confidence: 1.0,
  events: []
};

async function runTests() {
  console.log("Setting up DB mock source...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});

  const source = await prisma.source.create({
    data: {
      handle: "test_llm_source",
      name: "Test Source"
    }
  });

  const originalFetch = global.fetch;

  // 1. Test High Confidence auto-approves
  console.log("\n--- Test 1: High Confidence Auto-Approves ---");
  global.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(mockHighConfidenceResponse)
            }
          }
        ]
      })
    } as Response;
  }) as any;

  await extractEventsFromPost(
    "https://instagram.com/p/high_conf",
    "Image",
    "Toddler nature walk this Thursday in San Jose!",
    "",
    [],
    source.id
  );

  const ev1 = await prisma.event.findFirst({
    where: { rawPostUrl: "https://instagram.com/p/high_conf" }
  });
  if (!ev1 || ev1.status !== "approved" || ev1.title !== "Nature Walk for Toddlers") {
    throw new Error(`Test 1 Failed: Expected status approved, got ${ev1?.status}`);
  }
  console.log("✅ Test 1 Passed: Event auto-approved.");

  // 2. Test Low Confidence queues for review
  console.log("\n--- Test 2: Low Confidence Queues ---");
  global.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(mockLowConfidenceResponse)
            }
          }
        ]
      })
    } as Response;
  }) as any;

  await extractEventsFromPost(
    "https://instagram.com/p/low_conf",
    "Image",
    "Vague crafts session.",
    "",
    [],
    source.id
  );

  const ev2 = await prisma.event.findFirst({
    where: { rawPostUrl: "https://instagram.com/p/low_conf" }
  });
  if (!ev2 || ev2.status !== "pending" || ev2.title !== "Unknown Craft Event") {
    throw new Error(`Test 2 Failed: Expected status pending, got ${ev2?.status}`);
  }
  console.log("✅ Test 2 Passed: Event queued for review.");

  // 3. Test Non-Event marks as rejected to prevent duplicates
  console.log("\n--- Test 3: Non-Event placeholder creation ---");
  global.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(mockNonEventResponse)
            }
          }
        ]
      })
    } as Response;
  }) as any;

  await extractEventsFromPost(
    "https://instagram.com/p/non_event",
    "Image",
    "Just a cute photo of my toddler playing.",
    "",
    [],
    source.id
  );

  const ev3 = await prisma.event.findFirst({
    where: { rawPostUrl: "https://instagram.com/p/non_event" }
  });
  if (!ev3 || ev3.status !== "rejected" || ev3.title !== "Non-event") {
    throw new Error(`Test 3 Failed: Expected status rejected, got ${ev3?.status}`);
  }
  console.log("✅ Test 3 Passed: Non-event placeholder registered.");

  // Clean up
  global.fetch = originalFetch;
  console.log("\nCleaning up...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});
  console.log("✅ All OpenAI Service Tests Passed!");
}

runTests().catch(err => {
  console.error("❌ Test Suite Failed:", err);
  process.exit(1);
});
