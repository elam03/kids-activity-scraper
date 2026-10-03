import type { ExtractedEvent } from './llm-extractor';

export interface WebScraperOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  maxContentLength?: number;
  apifyApiKey?: string;
  forceCrawler?: boolean;
}

export interface ScrapedWebPageResult {
  url: string;
  tier: 'jsonld' | 'direct_html' | 'crawler';
  title: string;
  text: string;
  events?: ExtractedEvent[];
  rawHtml?: string;
}

/**
 * Validates a submitted URL against SSRF attacks and protocol misuse.
 */
export function validateWebUrl(rawUrl: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: `Invalid protocol: ${url.protocol}` };
    }

    const hostname = url.hostname.toLowerCase();

    // Check localhost / loopback
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '[::1]'
    ) {
      return { valid: false, error: 'Localhost and loopback addresses are blocked' };
    }

    // Check IPv4 private and link-local ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const b0 = parseInt(ipMatch[1], 10);
      const b1 = parseInt(ipMatch[2], 10);

      // 10.0.0.0/8
      if (b0 === 10) {
        return { valid: false, error: 'Private IP space (10.0.0.0/8) is blocked' };
      }
      // 172.16.0.0/12 (172.16 - 172.31)
      if (b0 === 172 && b1 >= 16 && b1 <= 31) {
        return { valid: false, error: 'Private IP space (172.16.0.0/12) is blocked' };
      }
      // 192.168.0.0/16
      if (b0 === 192 && b1 === 168) {
        return { valid: false, error: 'Private IP space (192.168.0.0/16) is blocked' };
      }
      // 169.254.0.0/16 (link-local, cloud metadata)
      if (b0 === 169 && b1 === 254) {
        return { valid: false, error: 'Link-local metadata IP space is blocked' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Malformed URL' };
  }
}

/**
 * Extracts and parses Schema.org Event objects from <script type="application/ld+json">.
 */
export function extractJsonLdEvents(html: string): ExtractedEvent[] {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const events: ExtractedEvent[] = [];
  let match: RegExpExecArray | null;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    const jsonString = match[1].trim();
    if (!jsonString) continue;

    try {
      const parsed = JSON.parse(jsonString);
      const candidates: any[] = [];

      if (Array.isArray(parsed)) {
        candidates.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed['@graph'])) {
          candidates.push(...parsed['@graph']);
        } else {
          candidates.push(parsed);
        }
      }

      for (const item of candidates) {
        if (!item || typeof item !== 'object') continue;
        const itemType = item['@type'];
        const isEvent =
          itemType === 'Event' ||
          (Array.isArray(itemType) && itemType.includes('Event')) ||
          (typeof itemType === 'string' && itemType.endsWith('Event'));

        if (!isEvent) continue;

        // Extract title
        const title = item.name || item.headline || 'Untitled Event';

        // Extract date and time
        let startDate = '';
        let startTime: string | null = null;
        if (typeof item.startDate === 'string') {
          const parts = item.startDate.split('T');
          startDate = parts[0];
          if (parts[1]) {
            startTime = parts[1].substring(0, 5);
          }
        }

        let endDate: string | null = null;
        let endTime: string | null = null;
        if (typeof item.endDate === 'string') {
          const parts = item.endDate.split('T');
          endDate = parts[0];
          if (parts[1]) {
            endTime = parts[1].substring(0, 5);
          }
        }

        // Extract location
        let location: string | null = null;
        if (typeof item.location === 'string') {
          location = item.location;
        } else if (item.location && typeof item.location === 'object') {
          const placeName = item.location.name || '';
          let addressStr = '';
          if (typeof item.location.address === 'string') {
            addressStr = item.location.address;
          } else if (item.location.address && typeof item.location.address === 'object') {
            const addr = item.location.address;
            addressStr = [addr.streetAddress, addr.addressLocality, addr.addressRegion]
              .filter(Boolean)
              .join(', ');
          }
          location = [placeName, addressStr].filter(Boolean).join(' - ') || null;
        }

        // Extract cost & isFree
        let cost: string | null = null;
        let isFree = false;
        if (item.isAccessibleForFree === true) {
          isFree = true;
          cost = 'Free';
        } else if (item.offers) {
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offer) {
            const price = offer.price;
            if (price === 0 || price === '0' || price === '0.00' || String(price).toLowerCase() === 'free') {
              isFree = true;
              cost = 'Free';
            } else if (price !== undefined && price !== null) {
              cost = `${offer.priceCurrency || '$'}${price}`;
            }
          }
        }

        const description = typeof item.description === 'string' ? item.description : '';
        const registrationUrl = typeof item.url === 'string' ? item.url : null;

        events.push({
          title,
          startDate,
          endDate,
          startTime,
          endTime,
          location,
          ageRange: null,
          ageGroup: 'all',
          category: 'other',
          cost,
          isFree,
          registrationUrl,
          description,
        });
      }
    } catch {
      // Ignore JSON parse errors in malformed script tags
    }
  }

  return events;
}

/**
 * Decodes common HTML entities into plain text.
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Strips HTML boilerplate and returns page title and readable text content.
 */
export function extractReadableText(html: string): { title: string; text: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : '';

  // Remove script, style, noscript, svg, nav, footer, header tags
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');

  // Add line breaks for block tags
  cleaned = cleaned.replace(/<(?:br|p|div|h[1-6]|li|tr)[^>]*>/gi, '\n');

  // Strip all other HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode entities
  cleaned = decodeEntities(cleaned);

  // Normalize whitespace
  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const text = lines.join('\n');
  return { title, text };
}

/**
 * Cascading 3-tier web scraper:
 * Tier 1: Direct fetch + JSON-LD
 * Tier 2: Direct fetch + HTML Readability
 * Tier 3: Apify Website Content Crawler fallback
 */
export async function scrapeWebPage(
  url: string,
  options: WebScraperOptions = {}
): Promise<ScrapedWebPageResult> {
  const fetcher = options.fetcher || fetch;
  const timeoutMs = options.timeoutMs || 8000;
  const maxContentLength = options.maxContentLength || 8000;
  const apifyApiKey = options.apifyApiKey || process.env.APIFY_API_KEY;

  const validation = validateWebUrl(url);
  if (!validation.valid) {
    throw new Error(`URL validation failed: ${validation.error}`);
  }

  // Tier 3 forced route
  if (options.forceCrawler && apifyApiKey) {
    return scrapeViaApifyCrawler(url, apifyApiKey, fetcher);
  }

  // Try Tier 1 & Tier 2: Direct HTTP Fetch
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetcher(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KidsActivityBot/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // If blocked (403, 429) and Apify is available, fallback to Tier 3
      if ((response.status === 403 || response.status === 429) && apifyApiKey) {
        return scrapeViaApifyCrawler(url, apifyApiKey, fetcher);
      }
      throw new Error(`HTTP fetch failed with status: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Check Tier 1: JSON-LD Schema.org Events
    const jsonLdEvents = extractJsonLdEvents(html);
    if (jsonLdEvents.length > 0) {
      const { title, text } = extractReadableText(html);
      return {
        url,
        tier: 'jsonld',
        title: title || jsonLdEvents[0].title,
        text: text.slice(0, maxContentLength),
        events: jsonLdEvents,
        rawHtml: html,
      };
    }

    // Check Tier 2: Readability Text
    const { title, text } = extractReadableText(html);
    return {
      url,
      tier: 'direct_html',
      title,
      text: text.slice(0, maxContentLength),
      rawHtml: html,
    };
  } catch (err: any) {
    // If direct fetch error and Apify token is available, attempt Tier 3 fallback
    if (apifyApiKey && !options.forceCrawler) {
      try {
        return await scrapeViaApifyCrawler(url, apifyApiKey, fetcher);
      } catch (apifyErr) {
        throw new Error(`Direct fetch failed (${err.message}) and Apify fallback failed: ${(apifyErr as Error).message}`);
      }
    }
    throw err;
  }
}

/**
 * Tier 3: Call Apify Website Content Crawler synchronously
 */
async function scrapeViaApifyCrawler(
  url: string,
  apiKey: string,
  fetcher: typeof fetch
): Promise<ScrapedWebPageResult> {
  const response = await fetcher(
    `https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items?format=json&clean=true&token=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        crawlerType: 'playwright:adaptive',
        removeCookieWarnings: true,
        saveMarkdown: true,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Apify crawler failed: ${response.status} - ${errText}`);
  }

  const items = (await response.json()) as any[];
  const item = items[0] || {};
  const text = item.text || item.markdown || '';
  const title = item.metadata?.title || item.title || '';

  return {
    url,
    tier: 'crawler',
    title,
    text: text.slice(0, 8000),
  };
}
