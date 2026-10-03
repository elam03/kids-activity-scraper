export const SUBMISSION_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igsh',
  'aff',
  'ref',
  'ref_src',
  'source',
]);

/**
 * Validates that an input is a valid HTTP/HTTPS URL string.
 */
export function isValidSubmissionUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes an arbitrary submitted URL by:
 * - Stripping ephemeral tracking query parameters (utm_*, fbclid, igsh, etc.)
 * - Trimming whitespace
 * - Removing trailing slashes from the path
 */
export function normalizeSubmissionUrl(rawUrl: string): string {
  try {
    const trimmed = rawUrl.trim();
    const url = new URL(trimmed);

    // Filter out marketing/tracking query parameters
    const searchParams = new URLSearchParams();
    url.searchParams.forEach((val, key) => {
      if (!TRACKING_PARAMS.has(key.toLowerCase()) && !key.toLowerCase().startsWith('utm_')) {
        searchParams.append(key, val);
      }
    });

    url.search = searchParams.toString();

    // Strip trailing slashes from pathname (preserving root '/')
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    // Return sanitized URL string without hash fragments
    url.hash = '';
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

export interface UrlSubmissionModel {
  id: string;
  rawUrl: string;
  normalizedUrl: string;
  notes?: string | null;
  status: SubmissionStatus;
  failureReason?: string | null;
  submittedIpHash?: string | null;
  extractedEventCount: number;
  createdAt: Date;
  processedAt?: Date | null;
  updatedAt: Date;
}
