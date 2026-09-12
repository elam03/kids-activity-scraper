import { prisma } from './prisma';
import { geocodeLocation, type Coordinates } from './geocoder';
import {
  OpenAILLMExtractor,
  type LLMExtractor,
  type ExtractedEvent,
  type ExtractionResult,
} from './llm-extractor';

export interface IngestEventPayload {
  postUrl: string;
  caption?: string | null;
  postType?: string; // e.g. "Sidecar", "Image", "Video"
  displayUrl?: string;
  childPosts?: Array<{ displayUrl: string }>;
  images?: string[]; // direct base64 or urls
  isManual?: boolean;
}

export interface IngestEventOptions {
  extractor?: LLMExtractor;
  geocode?: (location: string) => Promise<Coordinates | null>;
  db?: any;
  currentDate?: string;
  downloadImage?: (url: string) => Promise<string>;
}

export interface IngestionResult {
  rawPostUrl: string;
  isEvent: boolean;
  confidence: number;
  events: ExtractedEvent[];
  savedCount: number;
  skipped: boolean;
  skipReason?: 'already_exists' | 'all_past_events';
}

// Download image CDN url and return as base64 data URL
async function defaultDownloadImageAsBase64(url: string): Promise<string> {
  if (url.startsWith('data:image/')) {
    return url;
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:image/webp;base64,${base64}`;
}

/**
 * Deep Event Ingestion Module
 * Encapsulates idempotency/deduplication check, media preparation,
 * pure LLM extraction, past-date filtering, geocode coordinate resolution,
 * and atomic database persistence.
 */
export async function ingestEvent(
  sourceId: string,
  payload: IngestEventPayload,
  options: IngestEventOptions = {}
): Promise<IngestionResult> {
  const db = options.db || prisma;
  const currentDate = options.currentDate || new Date().toISOString().split('T')[0];
  const extractor = options.extractor || new OpenAILLMExtractor();
  const geocode = options.geocode || geocodeLocation;
  const downloadImage = options.downloadImage || defaultDownloadImageAsBase64;

  // 1. Deduplication check: Has this post already been ingested?
  const existingEvent = await db.event.findFirst({
    where: { rawPostUrl: payload.postUrl },
  });

  if (existingEvent) {
    return {
      rawPostUrl: payload.postUrl,
      isEvent: existingEvent.status !== 'rejected',
      confidence: existingEvent.confidence || 1.0,
      events: [],
      savedCount: 0,
      skipped: true,
      skipReason: 'already_exists',
    };
  }

  // 2. Media preparation
  let images: string[] = [];

  if (Array.isArray(payload.images) && payload.images.length > 0) {
    // Direct images provided (e.g. manual flyer upload)
    images = payload.images;
  } else if (payload.postType === 'Sidecar' && Array.isArray(payload.childPosts) && payload.childPosts.length > 0) {
    // Multi-slide Instagram post: download up to 10 slides
    const slidesToProcess = payload.childPosts.slice(0, 10);
    for (let i = 0; i < slidesToProcess.length; i++) {
      try {
        const base64Img = await downloadImage(slidesToProcess[i].displayUrl);
        images.push(base64Img);
      } catch (err) {
        console.error(`Failed to download slide ${i} for ${payload.postUrl}:`, err);
      }
    }
  }

  // 3. Trigger Pure LLM Extraction
  const extractionResult: ExtractionResult = await extractor.extractEvents({
    text: payload.caption || (payload.displayUrl ? `(Image: ${payload.displayUrl})` : null),
    images: images.length > 0 ? images : undefined,
    currentDate,
  });

  // 4. Persistence and Past-Date Filtering
  if (extractionResult.isEvent && extractionResult.events.length > 0) {
    // Filter out past events
    const activeEvents = extractionResult.events.filter((event) => {
      const eventStartDate = event.startDate || currentDate;
      const isPast = event.endDate ? event.endDate < currentDate : eventStartDate < currentDate;
      return !isPast;
    });

    if (activeEvents.length === 0) {
      // All extracted events are in the past
      return {
        rawPostUrl: payload.postUrl,
        isEvent: true,
        confidence: extractionResult.confidence,
        events: extractionResult.events,
        savedCount: 0,
        skipped: true,
        skipReason: 'all_past_events',
      };
    }

    const status = payload.isManual ? 'pending' : 'approved';
    let savedCount = 0;

    for (const rawEvent of activeEvents) {
      const eventStartDate = rawEvent.startDate || currentDate;
      const coords = rawEvent.location ? await geocode(rawEvent.location) : null;
      const eventAgeGroup = rawEvent.ageGroup || 'all';

      await db.event.upsert({
        where: {
          rawPostUrl_title: {
            rawPostUrl: payload.postUrl,
            title: rawEvent.title,
          },
        },
        update: {
          startDate: eventStartDate,
          endDate: rawEvent.endDate || null,
          startTime: rawEvent.startTime || null,
          endTime: rawEvent.endTime || null,
          location: rawEvent.location || null,
          ageRange: rawEvent.ageRange || null,
          ageGroup: eventAgeGroup,
          category: rawEvent.category,
          cost: rawEvent.cost || null,
          isFree: typeof rawEvent.isFree === 'boolean' ? rawEvent.isFree : false,
          registrationUrl: rawEvent.registrationUrl || null,
          status,
          confidence: extractionResult.confidence,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        },
        create: {
          source: { connect: { id: sourceId } },
          rawPostUrl: payload.postUrl,
          rawCaption: payload.caption || '',
          title: rawEvent.title,
          startDate: eventStartDate,
          endDate: rawEvent.endDate || null,
          startTime: rawEvent.startTime || null,
          endTime: rawEvent.endTime || null,
          location: rawEvent.location || null,
          ageRange: rawEvent.ageRange || null,
          ageGroup: eventAgeGroup,
          category: rawEvent.category,
          cost: rawEvent.cost || null,
          isFree: typeof rawEvent.isFree === 'boolean' ? rawEvent.isFree : false,
          registrationUrl: rawEvent.registrationUrl || null,
          status,
          confidence: extractionResult.confidence,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        },
      });

      savedCount++;
    }

    return {
      rawPostUrl: payload.postUrl,
      isEvent: true,
      confidence: extractionResult.confidence,
      events: activeEvents,
      savedCount,
      skipped: false,
    };
  } else {
    // Save rejected non-event placeholder to prevent re-processing in future runs
    await db.event.upsert({
      where: {
        rawPostUrl_title: {
          rawPostUrl: payload.postUrl,
          title: 'Non-event',
        },
      },
      update: { status: 'rejected' },
      create: {
        source: { connect: { id: sourceId } },
        rawPostUrl: payload.postUrl,
        rawCaption: payload.caption || '',
        title: 'Non-event',
        startDate: currentDate,
        category: 'other',
        status: 'rejected',
        confidence: extractionResult.confidence,
      },
    });

    return {
      rawPostUrl: payload.postUrl,
      isEvent: false,
      confidence: extractionResult.confidence,
      events: [],
      savedCount: 0,
      skipped: false,
    };
  }
}
