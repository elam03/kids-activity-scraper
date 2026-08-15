import { scrapeInstagramAccount, InstagramPost } from '../src/lib/apify';

// Mock response data simulating Apify's API return
const mockApifyResponse = [
  {
    id: "3184920492817294821",
    type: "Image",
    shortCode: "C_w9XZkqM1A",
    caption: "Easy sensory bin for toddlers! #sensoryplay",
    hashtags: ["sensoryplay"],
    url: "https://www.instagram.com/p/C_w9XZkqM1A/",
    commentsCount: 42,
    likesCount: 1380,
    displayUrl: "https://instagram.fcjs4-1.fna.fbcdn.net/v/t51.82787-15/img1.jpg",
    timestamp: "2025-08-10T14:32:00.000Z",
    ownerUsername: "bayarea_toddlerexplorer",
    locationName: "San Jose, California",
  },
  {
    id: "3184920492817294822",
    type: "Sidecar",
    shortCode: "DaNi2kMmyly",
    caption: "ULTIMATE 4th of July Guide! 🎆",
    hashtags: ["4thofjuly"],
    url: "https://www.instagram.com/p/DaNi2kMmyly/",
    commentsCount: 8,
    likesCount: 335,
    displayUrl: "https://instagram.fcjs4-1.fna.fbcdn.net/v/t51.82787-15/img2.jpg",
    timestamp: "2025-08-11T12:00:00.000Z",
    ownerUsername: "bayarea_toddlerexplorer",
    locationName: null,
    childPosts: [
      {
        id: "3930950939974556453",
        type: "Image",
        shortCode: "DaNiw2Gq9sl",
        displayUrl: "https://instagram.fcjs4-1.fna.fbcdn.net/v/t51.82787-15/slide1.webp",
        alt: "Slide 1 text content details"
      },
      {
        id: "3930950939974556454",
        type: "Image",
        shortCode: "DaNiw2Gq9sm",
        displayUrl: "https://instagram.fcjs4-1.fna.fbcdn.net/v/t51.82787-15/slide2.webp",
        alt: "Slide 2 text content details"
      }
    ]
  }
];

// Verify mapping logic
function testMapping(items: InstagramPost[]) {
  console.log("Validating mapping outputs...");
  
  if (items.length !== 2) {
    throw new Error(`Expected 2 items, got ${items.length}`);
  }

  const p1 = items[0];
  if (p1.id !== "3184920492817294821" || p1.type !== "Image" || p1.locationName !== "San Jose, California") {
    throw new Error("Invalid mapping for Image post");
  }

  const p2 = items[1];
  if (p2.id !== "3184920492817294822" || p2.type !== "Sidecar" || p2.childPosts.length !== 2) {
    throw new Error("Invalid mapping for Sidecar post");
  }

  if (p2.childPosts[0].displayUrl !== "https://instagram.fcjs4-1.fna.fbcdn.net/v/t51.82787-15/slide1.webp") {
    throw new Error("Invalid mapping for child post displayUrl");
  }

  console.log("✅ Scraper Mapping Validation Passed!");
}

// Mock standard fetch globally to test scrapeInstagramAccount
async function run() {
  const originalFetch = global.fetch;
  
  // Set up mock fetch
  global.fetch = (async (url: string) => {
    console.log("Intercepted fetch to:", url);
    return {
      ok: true,
      json: async () => mockApifyResponse,
      text: async () => JSON.stringify(mockApifyResponse)
    } as Response;
  }) as any;

  try {
    process.env.APIFY_API_KEY = "mock_key";
    const result = await scrapeInstagramAccount("bayarea_toddlerexplorer");
    testMapping(result);
  } finally {
    // Restore fetch
    global.fetch = originalFetch;
  }
}

run().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
