export interface ReviewableEvent {
  status: string;
  confidence?: number | null;
  location?: string | null;
  startDate?: string | null;
  _count?: {
    feedbacks?: number;
  };
  feedbacks?: unknown[];
}

/**
 * Determines whether an event needs review by an administrator.
 *
 * Rules:
 * 1. Rejected events NEVER need review (they are already rejected/non-events).
 * 2. Events with 1 or more user feedback/inaccuracy reports need review.
 * 3. Pending events always need review.
 * 4. Events with confidence < 0.8 need review.
 * 5. Events missing location or startDate need review.
 * 6. Otherwise, the event does not need review.
 */
export function isNeedsReview(event: ReviewableEvent): boolean {
  if (event.status === 'rejected') {
    return false;
  }

  const feedbackCount = event._count?.feedbacks ?? (Array.isArray(event.feedbacks) ? event.feedbacks.length : 0);
  if (feedbackCount > 0) {
    return true;
  }

  if (event.status === 'pending') {
    return true;
  }

  if (typeof event.confidence === 'number' && event.confidence < 0.8) {
    return true;
  }

  if (!event.location || event.location.trim() === '') {
    return true;
  }

  if (!event.startDate || event.startDate.trim() === '') {
    return true;
  }

  if (event.confidence === undefined || event.confidence === null) {
    return true;
  }

  return false;
}

/**
 * Checks whether an event's age group matches any of the selected age groups.
 *
 * Rules:
 * 1. When selectedAgeGroups is empty or includes 'all', returns true.
 * 2. If eventAgeGroup is null/undefined or empty string, it defaults to 'all'.
 *    - If 'all' is selected, returns true; otherwise false.
 * 3. Splits eventAgeGroup by comma or slash to support compound classifications (e.g. 'toddlers, preschoolers').
 * 4. Returns true if ANY classified event age group matches ANY selected age group.
 */
export function matchesAgeGroup(
  eventAgeGroup: string | null | undefined,
  selectedAgeGroups: string[] | Set<string>
): boolean {
  const selected = Array.isArray(selectedAgeGroups)
    ? selectedAgeGroups
    : Array.from(selectedAgeGroups);

  if (selected.length === 0 || selected.includes('all')) {
    return true;
  }

  if (!eventAgeGroup || eventAgeGroup.trim() === '') {
    return selected.includes('all');
  }

  const groups = eventAgeGroup
    .split(/[,/]/)
    .map(g => g.trim().toLowerCase())
    .filter(Boolean);

  if (groups.length === 0) {
    return selected.includes('all');
  }

  return groups.some(g => selected.includes(g));
}

/**
 * Toggles an age group selection according to multi-selection interaction rules:
 * - Selecting 'all' resets to ['all'].
 * - Selecting an age group when 'all' is currently active switches to just that age group.
 * - Clicking an active age group toggles it off.
 * - Deselecting all age groups resets to ['all'].
 * - Clicking an unselected age group adds it to the active selections.
 */
export function toggleAgeGroup(currentSelected: string[], groupToToggle: string): string[] {
  if (groupToToggle === 'all') {
    return ['all'];
  }

  if (currentSelected.length === 0 || currentSelected.includes('all')) {
    return [groupToToggle];
  }

  if (currentSelected.includes(groupToToggle)) {
    const remaining = currentSelected.filter(g => g !== groupToToggle);
    return remaining.length === 0 ? ['all'] : remaining;
  }

  return [...currentSelected, groupToToggle];
}

export interface EventDateRange {
  startDate: string;
  endDate?: string | null;
}

/**
 * Checks whether an event is in the past relative to a reference date (YYYY-MM-DD).
 * If the event has an endDate, it is in the past if endDate < referenceDate.
 * If the event does not have an endDate, it is in the past if startDate < referenceDate.
 */
export function isPastEvent(event: EventDateRange, referenceDate: string): boolean {
  if (event.endDate && event.endDate.trim() !== '') {
    return event.endDate < referenceDate;
  }
  return event.startDate < referenceDate;
}

/**
 * Constructs a Prisma where clause to identify past events that can be pruned.
 * Matches events where:
 * - endDate is set and < referenceDate
 * - or endDate is null and startDate < referenceDate
 */
export function buildPastEventsPruneWhere(referenceDate: string) {
  return {
    OR: [
      {
        endDate: { not: null, lt: referenceDate },
      },
      {
        endDate: null,
        startDate: { lt: referenceDate },
      },
    ],
  };
}

/**
 * Checks whether a keyboard event corresponds to an Escape key press.
 */
export function isEscapeKey(event: { key: string }): boolean {
  return event.key === 'Escape' || event.key === 'Esc';
}

/**
 * Official Ko-fi tipping/donation URL for creator support.
 */
export const KOFI_DONATION_URL = 'https://ko-fi.com/elam03';

/**
 * Validates whether a given string is a valid Google Analytics 4 (GA4) measurement ID.
 * Expected format: G-XXXXXXXXXX (e.g. 'G-' followed by alphanumeric characters).
 */
export function isValidGaMeasurementId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  const trimmed = id.trim();
  return /^G-[A-Z0-9]+$/i.test(trimmed);
}

/**
 * Default Google Analytics 4 (GA4) measurement ID for the application.
 */
export const DEFAULT_GA_MEASUREMENT_ID = 'G-P4ZPYFWRLK';

/**
 * Resolves the active Google Analytics measurement ID from environment or default.
 * Returns null if the resolved measurement ID is invalid or disabled.
 */
export function resolveGaMeasurementId(configuredId?: string | null): string | null {
  const candidate =
    configuredId !== undefined && configuredId !== null && configuredId.trim() !== ''
      ? configuredId.trim()
      : DEFAULT_GA_MEASUREMENT_ID;

  return isValidGaMeasurementId(candidate) ? candidate : null;
}

/**
 * Ensures a web URL uses the secure HTTPS protocol.
 */
export function ensureHttps(url: string): string {
  if (!url) return '';
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * Standard HTTP security headers for production Next.js application.
 */
export function getSecurityHeaders(): Array<{ key: string; value: string }> {
  return [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'SAMEORIGIN',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(self)',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
  ];
}

export interface FilterAdminEventsOptions {
  filterMode?: 'all' | 'needs_review' | 'approved' | 'rejected';
  categoryFilter?: string;
  searchQuery?: string;
  showPastEvents?: boolean;
  referenceDate?: string;
}

/**
 * Pure filter function for Events Manager:
 * - Hides past events by default (keeps events with endDate >= today)
 * - Supports Show All toggle
 * - Filters by review status mode and category
 * - Applies search query matching across title, location, handle, category, description
 */
export function filterAdminEvents<
  T extends {
    startDate: string;
    endDate?: string | null;
    status: string;
    category?: string;
    title?: string;
    location?: string | null;
    description?: string;
    source?: { handle?: string };
  }
>(events: T[], options: FilterAdminEventsOptions = {}): T[] {
  const referenceDate = options.referenceDate || new Date().toISOString().split('T')[0];
  const {
    filterMode = 'all',
    categoryFilter = 'all',
    searchQuery = '',
    showPastEvents = false,
  } = options;
  const q = searchQuery.trim().toLowerCase();

  return events.filter((e) => {
    // 1. Filter out past events unless showPastEvents is enabled
    if (!showPastEvents && isPastEvent(e, referenceDate)) {
      return false;
    }

    // 2. Status / review mode filter
    if (filterMode === 'needs_review' && !isNeedsReview(e as any)) return false;
    if (filterMode === 'approved' && e.status !== 'approved') return false;
    if (filterMode === 'rejected' && e.status !== 'rejected') return false;

    // 3. Category filter
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

    // 4. Search query
    if (q) {
      const matchesTitle = e.title?.toLowerCase().includes(q);
      const matchesLoc = e.location?.toLowerCase().includes(q);
      const matchesCategory = e.category?.toLowerCase().includes(q);
      const matchesSource = e.source?.handle?.toLowerCase().includes(q);
      const matchesDesc = e.description?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesLoc && !matchesCategory && !matchesSource && !matchesDesc) {
        return false;
      }
    }

    return true;
  });
}

export interface EventSourceInfo {
  type: 'instagram' | 'web_url' | 'other';
  label: string;
  badge: string;
  url: string | null;
  domain: string | null;
}

/**
 * Extracts and classifies the source provenance of an event (Instagram handle vs URL Submission vs Other).
 */
export function getEventSourceInfo(event: {
  source?: { handle?: string; name?: string } | null;
  rawPostUrl?: string | null;
  submissionId?: string | null;
}): EventSourceInfo {
  const rawUrl = event.rawPostUrl || null;
  let domain: string | null = null;

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      // Ignore invalid URL formatting
    }
  }

  const isSubmission =
    Boolean(event.submissionId) ||
    event.source?.handle === 'community_submissions' ||
    (domain !== null && !domain.includes('instagram.com'));

  if (isSubmission) {
    return {
      type: 'web_url',
      badge: 'Web URL',
      label: domain || event.source?.name || 'Web Submission',
      url: rawUrl,
      domain,
    };
  }

  const isInstagram =
    (domain !== null && domain.includes('instagram.com')) ||
    Boolean(event.source?.handle && event.source.handle !== 'community_submissions');

  if (isInstagram) {
    return {
      type: 'instagram',
      badge: 'Instagram',
      label: event.source?.handle ? `@${event.source.handle}` : 'Instagram',
      url: rawUrl,
      domain: domain || 'instagram.com',
    };
  }

  return {
    type: 'other',
    badge: 'Source',
    label: event.source?.name || event.source?.handle || 'Unknown',
    url: rawUrl,
    domain,
  };
}

