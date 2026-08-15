export interface InstagramPost {
  id: string;
  type: string;
  shortCode: string;
  url: string;
  caption: string | null;
  timestamp: string;
  ownerUsername: string;
  likesCount: number | null;
  commentsCount: number;
  locationName: string | null;
  displayUrl: string;
  hashtags: string[];
  childPosts: Array<{
    id: string;
    type: string;
    displayUrl: string;
    alt?: string;
  }>;
}

export async function scrapeInstagramAccount(
  username: string,
  limit: number = 10,
  newerThanDays: number = 7
): Promise<InstagramPost[]> {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing APIFY_API_KEY environment variable");
  }

  // format target url
  const targetUrl = `https://www.instagram.com/${username.replace(/@/g, '')}/`;

  console.log(`Triggering Apify scrape for: ${targetUrl} (limit: ${limit})`);

  // We call Apify run-sync-get-dataset-items which runs synchronously
  // (suitable for lightweight prototype scrapes of 5-15 posts)
  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?format=json&clean=true&token=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        directUrls: [targetUrl],
        resultsType: "posts",
        resultsLimit: limit,
        onlyPostsNewerThan: `${newerThanDays} days`,
        skipPinnedPosts: true,
        proxy: {
          useApifyProxy: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Apify scraping failed: ${response.status} ${response.statusText} - ${errText}`);
  }

  const items = (await response.json()) as any[];
  
  // Map and normalize output
  return items.map((item) => ({
    id: item.id || item.shortCode || Math.random().toString(),
    type: item.type || "Image",
    shortCode: item.shortCode || "",
    url: item.url || `https://www.instagram.com/p/${item.shortCode}/`,
    caption: item.caption || null,
    timestamp: item.timestamp || new Date().toISOString(),
    ownerUsername: item.ownerUsername || username,
    likesCount: item.likesCount !== undefined ? item.likesCount : null,
    commentsCount: item.commentsCount || 0,
    locationName: item.locationName || null,
    displayUrl: item.displayUrl || "",
    hashtags: item.hashtags || [],
    childPosts: (item.childPosts || []).map((child: any) => ({
      id: child.id || child.shortCode || Math.random().toString(),
      type: child.type || "Image",
      displayUrl: child.displayUrl || "",
      alt: child.alt || undefined,
    })),
  }));
}
