# Apify Instagram Scraper API Contract Research

**Date:** 2026-08-15
**Sources:**
- [Apify Instagram Scraper Actor](https://apify.com/apify/instagram-scraper)
- [Apify Instagram Post Scraper Actor](https://apify.com/apify/instagram-post-scraper)
- [Apify API v2 Reference](https://docs.apify.com/api/v2)
- [Running Actors via API](https://docs.apify.com/platform/actors/running/api)

---

## 1. Actor ID Selection

### Primary Recommendation: `apify/instagram-scraper`
* **Actor ID:** `apify/instagram-scraper`
* **Maintainer:** Official Apify Team
* **Description:** The flagship, comprehensive scraper supporting profiles, posts, reels, comments, mentions, hashtags, and locations. Highly maintained and resilient against Instagram layout/API shifts.

### Alternative for Post-Only Workloads: `apify/instagram-post-scraper`
* **Actor ID:** `apify/instagram-post-scraper`
* **Maintainer:** Official Apify Team
* **Description:** A specialized Actor tuned exclusively for retrieving post streams from usernames or direct URLs. Accepts raw username arrays without needing full URL formatting.

> **Recommendation:** Use **`apify/instagram-scraper`** for general versatility and standard URL-based pipelines, or **`apify/instagram-post-scraper`** if passing raw usernames without URL prefixes is desired.

---

## 2. Input JSON Schema

### For `apify/instagram-scraper`

#### Key Input Fields
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `directUrls` | `string[]` | Yes (or `search`) | `[]` | Array of Instagram URLs to scrape (e.g. `["https://www.instagram.com/target_account/"]`). |
| `resultsType` | `string` | No | `"posts"` | Target content type: `"posts"`, `"details"`, `"comments"`, `"reels"`, `"mentions"`, `"stories"`. |
| `resultsLimit` | `integer` | No | `0` (all) | Maximum number of results (posts/comments) to extract per target URL. |
| `onlyPostsNewerThan` | `string` | No | `null` | Date filter (e.g., `"2025-01-01"`, ISO timestamp, or relative string like `"7 days"`, `"1 month"`). |
| `skipPinnedPosts` | `boolean` | No | `false` | When `true`, ignores pinned profile posts to ensure chronologically fresh posts. |
| `proxy` | `object` | No | `{ "useApifyProxy": true }` | Proxy configuration (defaults to Apify platform proxies with residential fallback). |

#### Example Payload (`apify/instagram-scraper`)
```json
{
  "directUrls": [
    "https://www.instagram.com/bayarea_toddlerexplorer/",
    "https://www.instagram.com/truly_athi/",
    "https://www.instagram.com/momscoveries/"
  ],
  "resultsType": "posts",
  "resultsLimit": 10,
  "onlyPostsNewerThan": "14 days",
  "skipPinnedPosts": true,
  "proxy": {
    "useApifyProxy": true
  }
}
```

---

## 3. Output JSON Schema for a Single Post Result

Each scraped item in the resulting dataset represents an Instagram post with normalized, typed fields.

### Field Inventory & Nullability

| Field Name | Type | Nullable / Optional | Description & Example |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **No** (Always present) | Internal Instagram media ID (e.g. `"3184920492817294821"`). |
| `shortCode` | `string` | **No** (Always present) | Alphanumeric post shortcode (e.g. `"C_w9XZkqM1A"`). |
| `url` | `string` | **No** (Always present) | Full canonical URL (e.g. `"https://www.instagram.com/p/C_w9XZkqM1A/"`). |
| `type` | `string` | **No** (Always present) | Post type: `"Image"`, `"Video"`, or `"Sidecar"` (carousel). |
| `caption` | `string` | **Yes** (Nullable) | Full post caption text including hashtags. `""` or `null` if no text. |
| `timestamp` | `string` | **No** (Always present) | ISO 8601 UTC creation date (e.g. `"2025-08-10T14:32:00.000Z"`). |
| `ownerUsername` | `string` | **No** (On profile scrapes) | Creator's username handle (e.g. `"busytoddler"`). |
| `ownerFullName` | `string` | **Yes** (Nullable) | Display name of the account owner. |
| `ownerId` | `string` | **No** (Always present) | Creator's numeric Instagram account ID. |
| `likesCount` | `integer` | **Yes** (Nullable/-1) | Total like count. May be `-1` or `null` if likes are hidden. |
| `commentsCount` | `integer` | **No** (Always present) | Total number of comments on the post. |
| `locationName` | `string` | **Yes** (Nullable) | Name of tagged location (e.g. `"San Jose, California"`), `null` if untagged. |
| `locationId` | `string` | **Yes** (Nullable) | Numeric Instagram location ID, `null` if untagged. |
| `displayUrl` | `string` | **No** (Always present) | Primary high-resolution image/thumbnail URL. |
| `images` | `string[]` | **No** (Always present) | Array of image URLs for different resolutions. |
| `childPosts` | `object[]` | **No** (Always present) | Array of child media objects for carousels (`[]` for single Image/Video). |
| `isSponsored` | `boolean` | **No** (Always present) | `true` if marked as paid partnership/ad; `false` otherwise. |
| `videoUrl` | `string` | **Yes** (Nullable) | Direct video file URL if `type === "Video"`; `null` for static images. |
| `hashtags` | `string[]` | **No** (Always present) | Array of hashtags parsed from the caption. |
| `mentions` | `string[]` | **No** (Always present) | Array of usernames mentioned in the caption. |

### Example Post Output JSON
```json
{
  "id": "3184920492817294821",
  "type": "Image",
  "shortCode": "C_w9XZkqM1A",
  "caption": "Easy sensory bin for toddlers! 🎨 Pour 2 cups of dyed rice into a bin with scoops and funnels. #sensoryplay #toddleractivities @sensoryplaykids",
  "hashtags": ["sensoryplay", "toddleractivities"],
  "mentions": ["sensoryplaykids"],
  "url": "https://www.instagram.com/p/C_w9XZkqM1A/",
  "commentsCount": 42,
  "likesCount": 1380,
  "displayUrl": "https://scontent.cdninstagram.com/v/t51.2885-15/...",
  "images": ["https://scontent.cdninstagram.com/v/t51.2885-15/..."],
  "videoUrl": null,
  "timestamp": "2025-08-10T14:32:00.000Z",
  "childPosts": [],
  "ownerFullName": "Bay Area Toddler Explorer",
  "ownerUsername": "bayarea_toddlerexplorer",
  "ownerId": "194820184",
  "locationName": "San Jose, California",
  "locationId": "213014",
  "isSponsored": false
}
```

---

## 4. Apify REST API v2 Execution & Polling

### Authentication
Include your Apify API Token in the header:
```http
Authorization: Bearer <APIFY_API_TOKEN>
```
Or via query parameter: `?token=<APIFY_API_TOKEN>`.

---

### Option A: Synchronous Run & Direct Dataset Retrieval (Runs < 300s)
```http
POST https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?format=json
Content-Type: application/json
Authorization: Bearer <APIFY_API_TOKEN>

{
  "directUrls": ["https://www.instagram.com/bayarea_toddlerexplorer/"],
  "resultsType": "posts",
  "resultsLimit": 10
}
```
* **Response:** Directly returns an array of post JSON objects when execution completes.
* **Timeout:** Maximum 300 seconds.

---

### Option B: Asynchronous Run + Polling

#### Step 1: Trigger the Actor Run
```http
POST https://api.apify.com/v2/acts/apify~instagram-scraper/runs
```
**Response Body (HTTP 201):**
```json
{
  "data": {
    "id": "HG7ML7M8z78YcAPEB",
    "status": "RUNNING",
    "defaultDatasetId": "wmKPijuyDnPZAPRMk"
  }
}
```

#### Step 2: Poll Run Status
```http
GET https://api.apify.com/v2/actor-runs/HG7ML7M8z78YcAPEB?waitForFinish=30
```
* **Status values:** `READY`, `RUNNING`, `SUCCEEDED`, `FAILED`, `TIMED-OUT`, `ABORTED`.

#### Step 3: Fetch Dataset Items
```http
GET https://api.apify.com/v2/datasets/wmKPijuyDnPZAPRMk/items?format=json&clean=true
```

---

## 5. Free Tier Limits & Recommended Configuration

* **Pricing Model:** Pay-Per-Event (PPE) at **$2.70 per 1,000 results** (Free plan rate).
* **Monthly Free Credit:** **$5.00 / month**.
* **Monthly Result Capacity:** ~1,850 posts/month.

### Recommended Operational Settings
1. **`resultsLimit` per account:** Set to **5–15 posts per scrape run**.
2. **`onlyPostsNewerThan`:** Set to `"7 days"` to ensure only new posts are scraped.
3. **Execution Schedule:** For 3 accounts × 10 posts × 8 runs/month = 240 posts/month = ~$0.65/month (well within the $5 free tier).

---

## 6. Cookies and Proxy Requirements for Public Accounts

1. **Session Cookies:** **Not Required.** Scraping public Instagram accounts does not require session cookies or credentials.

2. **Residential Proxies:** Managed by Apify — `apify/instagram-scraper` is preconfigured to use Apify's internal proxy infrastructure with residential rotation. Free tier Actor API execution is fully supported on the platform.
