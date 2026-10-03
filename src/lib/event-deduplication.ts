import { calculateDistanceMiles } from './location-utils';

export interface EventCandidate {
  id?: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  cost?: string | null;
  isFree?: boolean;
  registrationUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string;
  ageRange?: string | null;
  ageGroup?: string;
  confidence?: number;
  [key: string]: any;
}

const COMMON_STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'at',
  'in',
  'on',
  'for',
  'with',
  'and',
  'or',
  'of',
  'to',
  'by',
]);

/**
 * Normalizes an event title for comparison by lowercasing, stripping emojis,
 * removing punctuation, collapsing whitespace, and omitting common stop-words.
 */
export function normalizeEventTitle(title: string): string {
  if (!title) return '';

  return (
    title
      // Remove emojis
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uFE0F/g, '')
      // Replace non-alphanumeric punctuation with space
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0 && !COMMON_STOP_WORDS.has(word))
      .join(' ')
  );
}

/**
 * Creates character bigrams from a normalized string.
 */
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Computes a hybrid similarity score (0.0 to 1.0) between two event titles
 * combining word token Jaccard similarity, subset overlap, and character bigram Dice coefficient.
 */
export function computeTitleSimilarity(titleA: string, titleB: string): number {
  const normA = normalizeEventTitle(titleA);
  const normB = normalizeEventTitle(titleB);

  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  // 1. Token Sets (handles word reordering and subset containment)
  const tokensA = new Set(normA.split(' '));
  const tokensB = new Set(normB.split(' '));
  let tokenIntersection = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) tokenIntersection++;
  });
  const unionSet = new Set<string>();
  tokensA.forEach((t) => unionSet.add(t));
  tokensB.forEach((t) => unionSet.add(t));
  const tokenUnion = unionSet.size;
  const tokenJaccard = tokenUnion > 0 ? tokenIntersection / tokenUnion : 0;
  const minTokens = Math.min(tokensA.size, tokensB.size);
  const tokenOverlap = minTokens > 0 ? tokenIntersection / minTokens : 0;

  // Token score weights overlap higher to accommodate added venue/sponsor names
  const tokenScore = tokenJaccard * 0.4 + tokenOverlap * 0.6;

  // 2. Character Bigram Dice Coefficient (handles minor typos / stem variations)
  const bigramsA = getBigrams(normA.replace(/\s+/g, ''));
  const bigramsB = getBigrams(normB.replace(/\s+/g, ''));
  let bigramIntersection = 0;
  bigramsA.forEach((bg) => {
    if (bigramsB.has(bg)) bigramIntersection++;
  });
  const totalBigrams = bigramsA.size + bigramsB.size;
  const charDice = totalBigrams > 0 ? (2 * bigramIntersection) / totalBigrams : 0;

  return tokenScore * 0.75 + charDice * 0.25;
}

export interface DuplicateCheckResult {
  isMatch: boolean;
  confidence: number;
  reason: string;
}

/**
 * Evaluates whether an incoming event candidate matches an existing event.
 */
export function isDuplicateCandidate(
  existing: EventCandidate,
  incoming: EventCandidate,
  threshold = 0.75
): DuplicateCheckResult {
  // 1. Start Date MUST match exactly
  if (existing.startDate !== incoming.startDate) {
    return {
      isMatch: false,
      confidence: 0,
      reason: 'different_start_date',
    };
  }

  // 2. Location / Spatial Proximity check
  const hasExistingCoords =
    existing.latitude != null &&
    !isNaN(Number(existing.latitude)) &&
    existing.longitude != null &&
    !isNaN(Number(existing.longitude));

  const hasIncomingCoords =
    incoming.latitude != null &&
    !isNaN(Number(incoming.latitude)) &&
    incoming.longitude != null &&
    !isNaN(Number(incoming.longitude));

  let distanceMiles: number | null = null;
  if (hasExistingCoords && hasIncomingCoords) {
    distanceMiles = calculateDistanceMiles(
      Number(existing.latitude),
      Number(existing.longitude),
      Number(incoming.latitude),
      Number(incoming.longitude)
    );

    // If coordinates are clearly in different cities (> 5.0 miles apart), reject match
    if (distanceMiles > 5.0) {
      return {
        isMatch: false,
        confidence: 0,
        reason: 'location_too_far',
      };
    }
  }

  // 3. Title Similarity
  const titleSim = computeTitleSimilarity(existing.title, incoming.title);

  // 4. Proximity bonus
  let finalConfidence = titleSim;
  if (distanceMiles !== null && distanceMiles <= 1.0) {
    finalConfidence = Math.min(1.0, finalConfidence + 0.08);
  }

  // Also check normalized location string overlap if available
  if (existing.location && incoming.location) {
    const locA = existing.location.toLowerCase();
    const locB = incoming.location.toLowerCase();
    if (locA.includes(locB) || locB.includes(locA)) {
      finalConfidence = Math.min(1.0, finalConfidence + 0.08);
    }
  }

  const isMatch = finalConfidence >= threshold;
  return {
    isMatch,
    confidence: Number(finalConfidence.toFixed(3)),
    reason: isMatch ? 'matched_date_and_title' : 'low_similarity',
  };
}

/**
 * Non-destructively merges metadata from an incoming duplicate event into the canonical event.
 * Returns only the fields that should be patched.
 */
export function mergeEventMetadata(
  existing: EventCandidate,
  incoming: EventCandidate
): Partial<EventCandidate> {
  const patch: Partial<EventCandidate> = {};

  if (!existing.startTime && incoming.startTime) {
    patch.startTime = incoming.startTime;
  }
  if (!existing.endTime && incoming.endTime) {
    patch.endTime = incoming.endTime;
  }
  if (!existing.registrationUrl && incoming.registrationUrl) {
    patch.registrationUrl = incoming.registrationUrl;
  }
  if (existing.latitude == null && incoming.latitude != null) {
    patch.latitude = incoming.latitude;
  }
  if (existing.longitude == null && incoming.longitude != null) {
    patch.longitude = incoming.longitude;
  }
  if (
    (!existing.location && incoming.location) ||
    (incoming.location &&
      existing.location &&
      incoming.location.length > existing.location.length &&
      incoming.location.toLowerCase().includes(existing.location.toLowerCase()))
  ) {
    patch.location = incoming.location;
  }
  if ((!existing.cost || existing.cost === 'Unknown') && incoming.cost) {
    patch.cost = incoming.cost;
  }
  if (!existing.endDate && incoming.endDate) {
    patch.endDate = incoming.endDate;
  }

  return patch;
}

export interface MatchResult {
  candidate: EventCandidate;
  confidence: number;
  patch: Partial<EventCandidate>;
}

/**
 * Searches a collection of active candidate events for an existing duplicate.
 * Returns the highest confidence match above threshold, or null if none found.
 */
export function findDuplicateEvent(
  candidates: EventCandidate[],
  incoming: EventCandidate,
  threshold = 0.75
): MatchResult | null {
  let bestCandidate: EventCandidate | null = null;
  let highestConfidence = 0;

  for (const candidate of candidates) {
    const check = isDuplicateCandidate(candidate, incoming, threshold);
    if (check.isMatch && check.confidence > highestConfidence) {
      highestConfidence = check.confidence;
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate) return null;

  return {
    candidate: bestCandidate,
    confidence: highestConfidence,
    patch: mergeEventMetadata(bestCandidate, incoming),
  };
}
