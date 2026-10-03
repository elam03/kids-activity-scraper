import { prisma } from './prisma';
import { geocodeLocation, type Coordinates } from './geocoder';
import {
  OpenAILLMExtractor,
  type LLMExtractor,
  type ExtractedEvent,
  type ExtractionResult,
} from './llm-extractor';
import { JevClient } from './jev';

export interface IngestEventPayload {
  postUrl: string;
  caption?: string | null;
  postType?: string; // e.g. "Sidecar", "Image", "Video"
  displayUrl?: string;
  childPosts?: Array<{ displayUrl: string }>;
  images?: string[]; // direct base64 or urls
  isManual?: boolean;
  submissionId?: string;
  extractedEvents?: ExtractedEvent[];
}

export interface IngestEventOptions {
  extractor?: LLMExtractor;
  geocode?: (location: string) => Promise<Coordinates | null>;
  db?: any;
  currentDate?: string;
  downloadImage?: (url: string) => Promise<string>;
  jevClient?: JevClient;
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
 * Jev Gate 3 event filtering, pure LLM extraction, past-date filtering,
 * geocode coordinate resolution, Jev Gate 4 per-event review triage,
 * and atomic database persistence with UrlSubmission linking.
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
  const jev = options.jevClient || new JevClient();

  // Helper to update UrlSubmission if present
  const updateSubmission = async (status: 'completed' | 'rejected' | 'failed', count: number) => {
    if (payload.submissionId && db.urlSubmission?.update) {
      try {
        await db.urlSubmission.update({
          where: { id: payload.submissionId },
          data: {
            status,
            extractedEventCount: count,
            processedAt: new Date(),
          },
        });
      } catch (err) {
        console.error(`Failed to update UrlSubmission ${payload.submissionId}:`, err);
      }
    }
  };

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

  let extractionResult: ExtractionResult;

  // 2. Pre-extracted events (Tier 1 JSON-LD fast path)
  if (Array.isArray(payload.extractedEvents) && payload.extractedEvents.length > 0) {
    extractionResult = {
      isEvent: true,
      confidence: 1.0,
      events: payload.extractedEvents,
    };
  } else {
    // 3. Media preparation
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

    // 4. Gate 3: Jev Pre-LLM Event Filter (for text-only web content without images)
    if (images.length === 0 && payload.caption && !payload.postUrl.includes('instagram.com')) {
      const gate3 = await jev.filterContentHasEvents({
        text: payload.caption,
        url: payload.postUrl,
      });

      if (!gate3.hasEvents) {
        // Skip costly LLM extraction: Page contains no events
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
            confidence: gate3.confidence,
          },
        });

        await updateSubmission('rejected', 0);

        return {
          rawPostUrl: payload.postUrl,
          isEvent: false,
          confidence: gate3.confidence,
          events: [],
          savedCount: 0,
          skipped: false,
        };
      }
    }

    // 5. Trigger LLM Extraction
    extractionResult = await extractor.extractEvents({
      text: payload.caption || (payload.displayUrl ? `(Image: ${payload.displayUrl})` : null),
      images: images.length > 0 ? images : undefined,
      currentDate,
    });
  }

  // 6. Persistence, Past-Date Filtering, and Gate 4 Per-Event Review
  if (extractionResult.isEvent && extractionResult.events.length > 0) {
    // Filter out past events
    const activeEvents = extractionResult.events.filter((event) => {
      const eventStartDate = event.startDate || currentDate;
      const isPast = event.endDate ? event.endDate < currentDate : eventStartDate < currentDate;
      return !isPast;
    });

    if (activeEvents.length === 0) {
      // All extracted events are in the past
      await updateSubmission('completed', 0);
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

    let savedCount = 0;

    for (const rawEvent of activeEvents) {
      const eventStartDate = rawEvent.startDate || currentDate;
      const coords = rawEvent.location ? await geocode(rawEvent.location) : null;
      const eventAgeGroup = rawEvent.ageGroup || 'all';

      // Gate 4: Per-event triage
      let eventStatus: string = 'approved';
      if (payload.isManual) {
        eventStatus = 'pending';
      } else {
        const triage = await jev.triageExtractedEvent(rawEvent);
        eventStatus = triage.status;
      }

      const submissionConnect = payload.submissionId
        ? { submission: { connect: { id: payload.submissionId } } }
        : {};

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
          status: eventStatus,
          confidence: extractionResult.confidence,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          ...submissionConnect,
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
          status: eventStatus,
          confidence: extractionResult.confidence,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          ...submissionConnect,
        },
      });

      savedCount++;
    }

    await updateSubmission('completed', savedCount);

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

    await updateSubmission('rejected', 0);

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
