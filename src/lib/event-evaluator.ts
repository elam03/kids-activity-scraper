export { formatLocalDate } from './calendar-query';

export interface RawDbEvent {
  id: string;
  sourceId: string;
  source: {
    id: string;
    handle: string;
    name: string;
  };
  rawPostUrl: string;
  rawCaption: string;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  ageRange: string | null;
  ageGroup: string;
  category: string;
  cost: string | null;
  isFree: boolean;
  registrationUrl: string | null;
  status: string;
  confidence: number;
  latitude: number | null;
  longitude: number | null;
  likes: number;
  feedbacks?: Array<{
    id?: string;
    type: string;
    reason?: string | null;
  }>;
}

export type AccuracyTier = 'High' | 'Medium' | 'Low';

export interface AccuracyEvaluation {
  score: number;
  tier: AccuracyTier;
  ratingLabel: string;
  flags: string[];
}

export interface EventEvaluationRow {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
  age_range: string;
  cost: string;
  location: string;
  description: string;
  source: string;
  original_link: string;
  registration_url: string;
  accuracy_rating: string;
}

const BROAD_LOCATION_PATTERNS = [
  /^(bay area|san francisco bay area|california|ca|norcal|northern california)$/i,
  /^bay area, ca$/i,
];

/**
 * Calculates a composite accuracy score (0-100) and human-readable rating.
 * Combines the LLM confidence score, presence of verified fields (geocoded coords, times),
 * content sanity checks, and user feedback reports.
 */
export function calculateAccuracyRating(event: {
  title: string;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  confidence?: number;
  rawCaption?: string;
  feedbacks?: Array<{ type: string }>;
}): AccuracyEvaluation {
  const flags: string[] = [];
  const baseConfidence = typeof event.confidence === 'number' ? event.confidence : 1.0;
  let score = Math.round(baseConfidence * 100);

  // 1. Title Sanity
  const cleanTitle = (event.title || '').trim();
  if (!cleanTitle || cleanTitle.toLowerCase() === 'non-event' || cleanTitle.length < 4) {
    score -= 30;
    flags.push('suspicious-title');
  }

  // 2. Location Quality
  const loc = (event.location || '').trim();
  if (!loc) {
    score -= 15;
    flags.push('missing-location');
  } else if (BROAD_LOCATION_PATTERNS.some((pat) => pat.test(loc))) {
    score -= 10;
    flags.push('broad-location');
  } else if (event.latitude !== null && event.latitude !== undefined) {
    score += 5; // Verified geocoded location
  }

  // 3. Timing Quality
  if (event.startTime) {
    score += 5; // Specific time is a strong positive signal
  }

  // Multi-day duration check: ongoing exhibitions spanning > 90 days are lower urgency/confidence
  if (event.startDate && event.endDate) {
    const start = new Date(event.startDate).getTime();
    const end = new Date(event.endDate).getTime();
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      score -= 5;
      flags.push('long-duration');
    }
  }

  // 4. Community Feedback Reports
  const inaccurateReports = (event.feedbacks || []).filter(
    (f) => f.type === 'report_inaccurate'
  ).length;
  if (inaccurateReports > 0) {
    score -= inaccurateReports * 25;
    flags.push(`${inaccurateReports}-inaccurate-report${inaccurateReports > 1 ? 's' : ''}`);
  }

  // Bound score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  let tier: AccuracyTier = 'High';
  if (score < 70) {
    tier = 'Low';
  } else if (score < 85) {
    tier = 'Medium';
  }

  const flagsSuffix = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
  const ratingLabel = `${tier} (${score}%)${flagsSuffix}`;

  return {
    score,
    tier,
    ratingLabel,
    flags,
  };
}

/**
 * Transforms a raw DB Event row into the flat calendar representation row for CSV.
 */
export function transformDbEventToRow(event: RawDbEvent): EventEvaluationRow {
  // Format Date range as rendered on calendar
  let dateStr = event.startDate;
  if (event.endDate && event.endDate !== event.startDate) {
    dateStr = `${event.startDate} to ${event.endDate}`;
  }

  // Format Time as rendered on calendar
  let timeStr = 'All day';
  if (event.startTime) {
    timeStr = event.endTime ? `${event.startTime} - ${event.endTime}` : event.startTime;
  }

  // Format Cost / Pricing as rendered on calendar
  let costStr = event.cost || (event.isFree ? 'Free' : 'Not specified');

  // Format Age Range
  let ageStr = event.ageRange || 'All ages';

  // Description rendered in Event Detail modal
  const description = (event.rawCaption || '').trim();

  // Evaluate Accuracy
  const evaluation = calculateAccuracyRating(event);

  return {
    id: event.id,
    title: event.title,
    date: dateStr,
    time: timeStr,
    category: event.category,
    age_range: ageStr,
    cost: costStr,
    location: event.location || 'Not specified',
    description,
    source: `@${event.source?.handle || 'unknown'}`,
    original_link: event.rawPostUrl,
    registration_url: event.registrationUrl || '',
    accuracy_rating: evaluation.ratingLabel,
  };
}

/**
 * Safely escapes a single value for RFC 4180 CSV output.
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of EventEvaluationRows into an RFC 4180 CSV string.
 */
export function formatEventsAsCsv(rows: EventEvaluationRow[]): string {
  const headers: (keyof EventEvaluationRow)[] = [
    'id',
    'title',
    'date',
    'time',
    'category',
    'age_range',
    'cost',
    'location',
    'description',
    'source',
    'original_link',
    'registration_url',
    'accuracy_rating',
  ];

  const headerLine = headers.join(',');
  const lines = rows.map((row) => headers.map((key) => escapeCsvField(row[key])).join(','));

  return [headerLine, ...lines].join('\n');
}

/**
 * Checks whether an event is active on a given target date string (YYYY-MM-DD).
 */
export function isEventActiveOnDate(
  event: { startDate: string; endDate?: string | null },
  targetDate: string
): boolean {
  if (event.startDate === targetDate) {
    return true;
  }
  if (event.endDate && event.startDate <= targetDate && event.endDate >= targetDate) {
    return true;
  }
  return false;
}
