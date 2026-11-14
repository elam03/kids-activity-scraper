import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GoogleAuth } from 'google-auth-library';

export interface Ga4CredentialsSummary {
  configured: boolean;
  hasPropertyId: boolean;
  hasCredentials: boolean;
  propertyId?: string;
  clientEmail?: string;
  authMethod?: 'service_account_env' | 'credentials_json' | 'credentials_file';
}

export interface Ga4OverviewMetrics {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
  engagementRate: number;
  averageSessionDuration: number;
  formattedEngagementRate: string;
  formattedAverageDuration: string;
}

export interface Ga4RealtimeMetrics {
  activeUsers: number;
  pages: { path: string; activeUsers: number }[];
  cities: { city: string; activeUsers: number }[];
}

export interface Ga4PageMetric {
  pagePath: string;
  pageTitle: string;
  screenPageViews: number;
  activeUsers: number;
}

export interface Ga4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  activeUsers: number;
}

export interface Ga4CustomEvent {
  eventName: string;
  eventCount: number;
  totalUsers: number;
}

/**
 * Normalizes a PEM private key, ensuring escaped \n sequences are converted to actual newlines.
 */
export function normalizePrivateKey(key: string): string {
  if (!key) return '';
  // Replace literal '\n' sequences with actual line breaks and ensure trailing newline
  const unescaped = key.replace(/\\n/g, '\n').trim();
  return `${unescaped}\n`;
}

/**
 * Formats decimal engagement rate into a percentage string (e.g. 0.684 -> "68.4%").
 */
export function formatEngagementRate(rate: number | string): string {
  const num = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (isNaN(num)) return '0.0%';
  return `${(num * 100).toFixed(1)}%`;
}

/**
 * Formats duration in seconds into human-readable time (e.g. 125 -> "2m 5s").
 */
export function formatDurationSeconds(seconds: number | string): string {
  const total = Math.round(typeof seconds === 'string' ? parseFloat(seconds) : seconds);
  if (isNaN(total) || total <= 0) return '0s';

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Returns configuration state summary for GA4 API without exposing secrets.
 */
export function getGa4CredentialsSummary(): Ga4CredentialsSummary {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GA4_PRIVATE_KEY?.trim();
  const rawJson = process.env.GA4_CREDENTIALS_JSON?.trim();
  const credsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  let authMethod: Ga4CredentialsSummary['authMethod'] = undefined;

  if (clientEmail && privateKey) {
    authMethod = 'service_account_env';
  } else if (rawJson) {
    authMethod = 'credentials_json';
  } else if (credsFile) {
    authMethod = 'credentials_file';
  }

  const hasCredentials = Boolean(authMethod);
  const hasPropertyId = Boolean(propertyId);

  return {
    configured: hasPropertyId && hasCredentials,
    hasPropertyId,
    hasCredentials,
    propertyId: propertyId || undefined,
    clientEmail: clientEmail || undefined,
    authMethod,
  };
}

/**
 * Checks whether all required environment variables are set to authenticate with GA4 Data API.
 */
export function isGa4Configured(): boolean {
  return getGa4CredentialsSummary().configured;
}

/**
 * Instantiates the BetaAnalyticsDataClient if credentials are present, or returns null.
 */
export function getGa4Client(): BetaAnalyticsDataClient | null {
  const summary = getGa4CredentialsSummary();
  if (!summary.configured) {
    return null;
  }

  try {
    if (summary.authMethod === 'service_account_env') {
      const auth = new GoogleAuth({
        credentials: {
          client_email: process.env.GA4_CLIENT_EMAIL?.trim(),
          private_key: normalizePrivateKey(process.env.GA4_PRIVATE_KEY || ''),
        },
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
      return new BetaAnalyticsDataClient({ auth });
    }

    if (summary.authMethod === 'credentials_json') {
      const parsed = JSON.parse(process.env.GA4_CREDENTIALS_JSON || '{}');
      const auth = new GoogleAuth({
        credentials: {
          client_email: parsed.client_email,
          private_key: normalizePrivateKey(parsed.private_key || ''),
        },
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
      return new BetaAnalyticsDataClient({ auth });
    }

    if (summary.authMethod === 'credentials_file') {
      const auth = new GoogleAuth({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
      return new BetaAnalyticsDataClient({ auth });
    }

    return null;
  } catch (err) {
    console.error('Failed to initialize GA4 BetaAnalyticsDataClient:', err);
    return null;
  }
}

/**
 * Parses raw GA4 dimensionHeaders, metricHeaders, and rows into an array of clean JS objects.
 */
export function parseGa4ReportRows(report?: any): Record<string, any>[] {
  if (!report || !report.rows || !Array.isArray(report.rows)) {
    return [];
  }

  const dimNames = (report.dimensionHeaders || []).map((h: any) => h?.name || '');
  const metricHeaders = report.metricHeaders || [];

  return report.rows.map((row: any) => {
    const record: Record<string, any> = {};

    (row.dimensionValues || []).forEach((dim: any, idx: number) => {
      const key = dimNames[idx] || `dim_${idx}`;
      record[key] = dim?.value ?? '';
    });

    (row.metricValues || []).forEach((metric: any, idx: number) => {
      const header = metricHeaders[idx];
      const key = header?.name || `metric_${idx}`;
      const rawVal = metric?.value ?? '0';

      const typeStr = String(header?.type || '');
      // Parse numerics
      if (typeStr.includes('INTEGER') || /^\d+$/.test(rawVal)) {
        record[key] = parseInt(rawVal, 10);
      } else if (typeStr.includes('FLOAT') || typeStr.includes('PERCENT') || typeStr.includes('SECONDS')) {
        record[key] = parseFloat(rawVal);
      } else {
        record[key] = isNaN(Number(rawVal)) ? rawVal : Number(rawVal);
      }
    });

    return record;
  });
}

/**
 * Fetches high-level GA4 metrics (active users, sessions, pageviews, engagement) for the specified date range.
 */
export async function fetchGa4Overview(days: number = 7): Promise<{
  configured: boolean;
  metrics?: Ga4OverviewMetrics;
  error?: string;
}> {
  const client = getGa4Client();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();

  if (!client || !propertyId) {
    return { configured: false, error: 'GA4 Data API is not configured with credentials.' };
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'userEngagementDuration' },
      ],
    });

    const parsed = parseGa4ReportRows(response);
    const row = parsed[0] || {};

    const activeUsers = Number(row.activeUsers) || 0;
    const newUsers = Number(row.newUsers) || 0;
    const sessions = Number(row.sessions) || 0;
    const screenPageViews = Number(row.screenPageViews) || 0;
    const engagementRate = Number(row.engagementRate) || 0;
    const totalDuration = Number(row.userEngagementDuration) || 0;
    const avgDuration = sessions > 0 ? totalDuration / sessions : 0;

    return {
      configured: true,
      metrics: {
        activeUsers,
        newUsers,
        sessions,
        screenPageViews,
        engagementRate,
        averageSessionDuration: Math.round(avgDuration),
        formattedEngagementRate: formatEngagementRate(engagementRate),
        formattedAverageDuration: formatDurationSeconds(avgDuration),
      },
    };
  } catch (err: any) {
    console.error('GA4 fetchOverview error:', err);
    return { configured: true, error: err?.message || 'Failed to fetch GA4 overview report.' };
  }
}

/**
 * Fetches real-time visitors (last 30 minutes) and active pages.
 */
export async function fetchGa4Realtime(): Promise<{
  configured: boolean;
  data?: Ga4RealtimeMetrics;
  error?: string;
}> {
  const client = getGa4Client();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();

  if (!client || !propertyId) {
    return { configured: false, error: 'GA4 Data API is not configured.' };
  }

  try {
    const [response] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [{ name: 'unifiedScreenName' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const rows = parseGa4ReportRows(response);
    let totalActive = 0;
    const pages = rows.map((r) => {
      const count = Number(r.activeUsers) || 0;
      totalActive += count;
      return {
        path: r.unifiedScreenName || '/',
        activeUsers: count,
      };
    });

    return {
      configured: true,
      data: {
        activeUsers: totalActive,
        pages,
        cities: [],
      },
    };
  } catch (err: any) {
    console.error('GA4 fetchRealtime error:', err);
    return { configured: true, error: err?.message || 'Failed to fetch GA4 realtime report.' };
  }
}

/**
 * Fetches top performing page paths and view counts.
 */
export async function fetchGa4TopPages(limit: number = 10, days: number = 7): Promise<{
  configured: boolean;
  pages?: Ga4PageMetric[];
  error?: string;
}> {
  const client = getGa4Client();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();

  if (!client || !propertyId) {
    return { configured: false, error: 'GA4 Data API is not configured.' };
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit,
    });

    const rows = parseGa4ReportRows(response);
    const pages: Ga4PageMetric[] = rows.map((r) => ({
      pagePath: r.pagePath || '/',
      pageTitle: r.pageTitle || '',
      screenPageViews: Number(r.screenPageViews) || 0,
      activeUsers: Number(r.activeUsers) || 0,
    }));

    return { configured: true, pages };
  } catch (err: any) {
    console.error('GA4 fetchTopPages error:', err);
    return { configured: true, error: err?.message || 'Failed to fetch top pages.' };
  }
}

/**
 * Fetches traffic sources (Instagram, Google Organic, Direct, etc.).
 */
export async function fetchGa4TrafficSources(limit: number = 10, days: number = 7): Promise<{
  configured: boolean;
  sources?: Ga4TrafficSource[];
  error?: string;
}> {
  const client = getGa4Client();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();

  if (!client || !propertyId) {
    return { configured: false, error: 'GA4 Data API is not configured.' };
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit,
    });

    const rows = parseGa4ReportRows(response);
    const sources: Ga4TrafficSource[] = rows.map((r) => ({
      source: r.sessionSource || '(direct)',
      medium: r.sessionMedium || '(none)',
      sessions: Number(r.sessions) || 0,
      activeUsers: Number(r.activeUsers) || 0,
    }));

    return { configured: true, sources };
  } catch (err: any) {
    console.error('GA4 fetchTrafficSources error:', err);
    return { configured: true, error: err?.message || 'Failed to fetch traffic sources.' };
  }
}

/**
 * Fetches custom event telemetry counts (e.g. click_outbound_ticket, view_event_detail).
 */
export async function fetchGa4CustomEvents(limit: number = 15, days: number = 7): Promise<{
  configured: boolean;
  events?: Ga4CustomEvent[];
  error?: string;
}> {
  const client = getGa4Client();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();

  if (!client || !propertyId) {
    return { configured: false, error: 'GA4 Data API is not configured.' };
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit,
    });

    const rows = parseGa4ReportRows(response);
    const events: Ga4CustomEvent[] = rows.map((r) => ({
      eventName: r.eventName || '',
      eventCount: Number(r.eventCount) || 0,
      totalUsers: Number(r.totalUsers) || 0,
    }));

    return { configured: true, events };
  } catch (err: any) {
    console.error('GA4 fetchCustomEvents error:', err);
    return { configured: true, error: err?.message || 'Failed to fetch custom events.' };
  }
}
