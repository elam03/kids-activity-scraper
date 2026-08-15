import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Cleaning database...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});

  console.log("Creating test Source...");
  const source = await prisma.source.create({
    data: {
      handle: "test_source",
      name: "Test Activity Source",
    }
  });
  console.log("Created Source:", source);

  console.log("Creating test Event...");
  const event = await prisma.event.create({
    data: {
      sourceId: source.id,
      title: "Test Kids Event",
      startDate: "2026-08-20",
      category: "nature",
      isFree: true,
      rawPostUrl: "https://instagram.com/p/test12345",
      rawCaption: "Join us for nature play!",
      status: "approved",
    }
  });
  console.log("Created Event:", event);

  console.log("Querying Events...");
  const events = await prisma.event.findMany({
    include: { source: true }
  });
  console.log("Queried Events count:", events.length);
  if (events.length === 1 && events[0].title === "Test Kids Event") {
    console.log("✅ DB Integration Test Passed!");
  } else {
    throw new Error("Integration test failed: incorrect event data queried");
  }

  // Clean up
  console.log("Cleaning up...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});
}

main()
  .catch(err => {
    console.error("❌ DB Integration Test Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
