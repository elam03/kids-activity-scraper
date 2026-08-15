import { GET as getSources, POST as postSource, DELETE as deleteSource } from '../src/app/api/admin/sources/route';
import { GET as getEvents, POST as postEvent } from '../src/app/api/admin/events/route';
import { prisma } from '../src/lib/prisma';

async function runTests() {
  console.log("Setting up DB mock state...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});

  // 1. Test POST /api/admin/sources (Create source)
  console.log("\n--- Test 1: Create Source ---");
  const postReq = new Request("http://localhost/api/admin/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: "bayarea_toddlerexplorer",
      name: "Bay Area Toddler Explorer"
    })
  });
  
  const postRes = await postSource(postReq);
  const postData = await postRes.json();
  if (postRes.status !== 200 || postData.source.handle !== "bayarea_toddlerexplorer") {
    throw new Error(`Test 1 Failed: ${JSON.stringify(postData)}`);
  }
  const sourceId = postData.source.id;
  console.log("✅ Test 1 Passed: Source created successfully.");

  // 2. Test GET /api/admin/sources (List sources)
  console.log("\n--- Test 2: List Sources ---");
  const getRes = await getSources();
  const getData = await getRes.json();
  if (getRes.status !== 200 || getData.sources.length !== 1) {
    throw new Error(`Test 2 Failed: ${JSON.stringify(getData)}`);
  }
  console.log("✅ Test 2 Passed: Sources listed successfully.");

  // 3. Test Event manual insertion & GET /api/admin/events (List events)
  console.log("\n--- Test 3: List Events ---");
  const event = await prisma.event.create({
    data: {
      sourceId,
      title: "Science Fair",
      startDate: "2026-08-25",
      category: "education",
      rawPostUrl: "https://instagram.com/p/science123",
      rawCaption: "Vague science fair details",
      status: "pending"
    }
  });

  const getEventsReq = new Request("http://localhost/api/admin/events?status=pending");
  const getEventsRes = await getEvents(getEventsReq);
  const getEventsData = await getEventsRes.json();
  if (getEventsRes.status !== 200 || getEventsData.events.length !== 1 || getEventsData.events[0].title !== "Science Fair") {
    throw new Error(`Test 3 Failed: ${JSON.stringify(getEventsData)}`);
  }
  console.log("✅ Test 3 Passed: Events listed successfully.");

  // 4. Test POST /api/admin/events (Approve & edit event)
  console.log("\n--- Test 4: Approve and Edit Event ---");
  const postEventReq = new Request("http://localhost/api/admin/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: event.id,
      status: "approved",
      title: "Polished Science Fair"
    })
  });

  const postEventRes = await postEvent(postEventReq);
  const postEventData = await postEventRes.json();
  if (postEventRes.status !== 200 || postEventData.event.status !== "approved" || postEventData.event.title !== "Polished Science Fair") {
    throw new Error(`Test 4 Failed: ${JSON.stringify(postEventData)}`);
  }
  console.log("✅ Test 4 Passed: Event approved and edited successfully.");

  // 5. Test DELETE /api/admin/sources (Delete source)
  console.log("\n--- Test 5: Delete Source ---");
  const deleteReq = new Request(`http://localhost/api/admin/sources?id=${sourceId}`, {
    method: "DELETE"
  });

  const deleteRes = await deleteSource(deleteReq);
  const deleteData = await deleteRes.json();
  if (deleteRes.status !== 200 || !deleteData.success) {
    throw new Error(`Test 5 Failed: ${JSON.stringify(deleteData)}`);
  }

  const sourcesCount = await prisma.source.count();
  if (sourcesCount !== 0) {
    throw new Error("Test 5 Failed: Source still exists in DB");
  }
  console.log("✅ Test 5 Passed: Source deleted successfully.");

  // Clean up
  console.log("\nCleaning up...");
  await prisma.event.deleteMany({});
  await prisma.source.deleteMany({});
  console.log("✅ All Admin API Integration Tests Passed!");
}

runTests().catch(err => {
  console.error("❌ Test Suite Failed:", err);
  process.exit(1);
});
