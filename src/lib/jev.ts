import type { ExtractedEvent } from './llm-extractor';

export interface JevGate1Result {
  isRelevant: boolean;
  reason?: string;
}

export interface JevGate2Result {
  route: 'instagram' | 'image' | 'direct' | 'crawler';
  reason?: string;
}

export interface JevGate3Result {
  hasEvents: boolean;
  confidence: number;
  reason?: string;
}

export interface JevGate4Result {
  status: 'approved' | 'pending';
  confidence: number;
  reason?: string;
}

const DANGEROUS_EXTENSIONS: readonly string[] = [
  '.exe',
  '.bat',
  '.sh',
  '.zip',
  '.tar',
  '.gz',
  '.bin',
  '.msi',
  '.apk',
];

const IMAGE_EXTENSIONS: readonly string[] = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
];

const EVENT_KEYWORDS = [
  'event',
  'events',
  'festival',
  'storytime',
  'story time',
  'workshop',
  'library',
  'puppet',
  'concert',
  'carnival',
  'fair',
  'expo',
  'parade',
  'admission',
  'ticket',
  'tickets',
  'register',
  'registration',
  'rsvp',
  'camp',
  'class',
  'classes',
  'playdate',
  'play date',
  'meetup',
  'celebration',
  'activity',
  'activities',
  'weekend',
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'am',
  'pm',
  'kids',
  'children',
  'toddler',
  'family',
];

/**
 * Gate 1 Deterministic Fallback: Basic URL triage
 */
export function heuristicTriageUrl(urlStr: string, _notes?: string): JevGate1Result {
  try {
    const trimmed = urlStr.trim();
    if (!trimmed) {
      return { isRelevant: false, reason: 'Empty URL' };
    }

    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { isRelevant: false, reason: `Unsupported protocol: ${url.protocol}` };
    }

    const pathname = url.pathname.toLowerCase();
    for (const ext of DANGEROUS_EXTENSIONS) {
      if (pathname.endsWith(ext)) {
        return { isRelevant: false, reason: `Non-web resource extension: ${ext}` };
      }
    }

    return { isRelevant: true };
  } catch (err) {
    return { isRelevant: false, reason: 'Malformed URL' };
  }
}

/**
 * Gate 2 Deterministic Fallback: URL route selection
 */
export function heuristicRouteScraper(urlStr: string): JevGate2Result {
  try {
    const url = new URL(urlStr.trim());
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    if (host.includes('instagram.com')) {
      return { route: 'instagram', reason: 'Instagram domain detected' };
    }

    for (const ext of IMAGE_EXTENSIONS) {
      if (pathname.endsWith(ext)) {
        return { route: 'image', reason: `Direct image format ${ext}` };
      }
    }

    return { route: 'direct', reason: 'Standard web page' };
  } catch {
    return { route: 'direct', reason: 'Fallback to direct fetch' };
  }
}

/**
 * Gate 3 Deterministic Fallback: Pre-LLM Event filter
 */
export function heuristicFilterContentHasEvents(content: {
  title?: string;
  text?: string;
  url?: string;
}): JevGate3Result {
  const combined = `${content.title || ''} ${content.text || ''}`.toLowerCase();
  if (!combined.trim()) {
    return { hasEvents: false, confidence: 1.0, reason: 'Empty content' };
  }

  let matchCount = 0;
  for (const keyword of EVENT_KEYWORDS) {
    if (combined.includes(keyword)) {
      matchCount++;
    }
  }

  // If at least 1 event signal or keyword found
  if (matchCount >= 1) {
    return {
      hasEvents: true,
      confidence: Math.min(0.7 + matchCount * 0.05, 0.95),
      reason: `Matched ${matchCount} event keywords`,
    };
  }

  return {
    hasEvents: false,
    confidence: 0.8,
    reason: 'Insufficient event keywords in page text',
  };
}

/**
 * Gate 4 Deterministic Fallback: Per-event review triage
 */
export function heuristicTriageExtractedEvent(event: ExtractedEvent): JevGate4Result {
  const hasSpecificLocation = Boolean(
    event.location &&
      event.location.trim().length > 3 &&
      !event.location.toLowerCase().includes('bay area') &&
      !event.location.toLowerCase().includes('various')
  );

  const hasValidStartDate = Boolean(
    event.startDate && /^\d{4}-\d{2}-\d{2}$/.test(event.startDate.trim())
  );

  const hasTitle = Boolean(event.title && event.title.trim().length >= 3);

  if (hasSpecificLocation && hasValidStartDate && hasTitle) {
    return {
      status: 'approved',
      confidence: 0.9,
      reason: 'Clear dates, valid title, and specific location',
    };
  }

  return {
    status: 'pending',
    confidence: 0.6,
    reason: !hasSpecificLocation
      ? 'Missing or vague location'
      : !hasValidStartDate
        ? 'Missing or invalid start date'
        : 'Needs verification',
  };
}

export interface JevClientOptions {
  apiKey?: string;
  model?: string;
  fetcher?: typeof fetch;
}

export class JevClient {
  private apiKey: string;
  private model: string;
  private fetcher: typeof fetch;

  constructor(options: JevClientOptions = {}) {
    this.apiKey = options.apiKey ?? (process.env.OPENROUTER_API_KEY || '');
    this.model = options.model || 'typesafe/jev-1.13';
    this.fetcher = options.fetcher || fetch;
  }

  private async callOpenRouter(prompt: string): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await this.fetcher('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.0,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data?.choices?.[0]?.message?.content || null;
    } catch {
      return null;
    }
  }

  async triageUrl(url: string, notes?: string): Promise<JevGate1Result> {
    const fallback = heuristicTriageUrl(url, notes);
    if (!fallback.isRelevant) {
      return fallback;
    }

    if (!this.apiKey) {
      return fallback;
    }

    const prompt = `You are a high-speed URL triage classifier.
Determine if this URL is likely to contain family/kids activity information, community events, or local guides.
URL: ${url}
Notes: ${notes || 'none'}
Respond strictly with JSON: {"isRelevant": boolean, "reason": string}`;

    const raw = await this.callOpenRouter(prompt);
    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.isRelevant === 'boolean') {
        return {
          isRelevant: parsed.isRelevant,
          reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
        };
      }
    } catch {
      // Fallback
    }

    return fallback;
  }

  async routeScraper(url: string): Promise<JevGate2Result> {
    const fallback = heuristicRouteScraper(url);
    if (!this.apiKey) {
      return fallback;
    }

    const prompt = `Classify this URL into one of the following scraper routes:
- "instagram" (Instagram posts or reels)
- "image" (Direct flyer image URL)
- "crawler" (Complex SPA or Cloudflare protected event page)
- "direct" (Standard HTML web page)
URL: ${url}
Respond strictly with JSON: {"route": "instagram"|"image"|"crawler"|"direct", "reason": string}`;

    const raw = await this.callOpenRouter(prompt);
    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);
      const valid = ['instagram', 'image', 'crawler', 'direct'];
      if (valid.includes(parsed?.route)) {
        return {
          route: parsed.route,
          reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
        };
      }
    } catch {
      // Fallback
    }

    return fallback;
  }

  async filterContentHasEvents(content: {
    title?: string;
    text?: string;
    url?: string;
  }): Promise<JevGate3Result> {
    const fallback = heuristicFilterContentHasEvents(content);
    if (!this.apiKey) {
      return fallback;
    }

    const snippet = (content.text || '').slice(0, 1500);
    const prompt = `Analyze this webpage content and classify whether it contains details about upcoming events, activities, workshops, or festivals.
Title: ${content.title || 'Untitled'}
Content: ${snippet}
Respond strictly with JSON: {"hasEvents": boolean, "confidence": number, "reason": string}`;

    const raw = await this.callOpenRouter(prompt);
    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.hasEvents === 'boolean') {
        return {
          hasEvents: parsed.hasEvents,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
          reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
        };
      }
    } catch {
      // Fallback
    }

    return fallback;
  }

  async triageExtractedEvent(event: ExtractedEvent): Promise<JevGate4Result> {
    const fallback = heuristicTriageExtractedEvent(event);
    if (!this.apiKey) {
      return fallback;
    }

    const prompt = `Evaluate whether this extracted event has clear dates and a specific venue:
Title: ${event.title}
StartDate: ${event.startDate}
Location: ${event.location || 'none'}
Category: ${event.category}
If the location and date are specific and clear, assign "approved". If vague, ambiguous, or missing key details, assign "pending".
Respond strictly with JSON: {"status": "approved"|"pending", "confidence": number, "reason": string}`;

    const raw = await this.callOpenRouter(prompt);
    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.status === 'approved' || parsed?.status === 'pending') {
        return {
          status: parsed.status,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : fallback.confidence,
          reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
        };
      }
    } catch {
      // Fallback
    }

    return fallback;
  }
}
