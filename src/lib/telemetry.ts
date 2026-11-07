/**
 * First-Party Analytics & User Intent Telemetry Engine
 *
 * Captures high-intent parent behavior directly on the server side:
 * - Event details views (which specific activities parents click)
 * - Outbound ticket clicks (direct commercial purchase / booking intent)
 * - Outbound creator links (referrals to Instagram creators)
 * - Filter preferences (age group and category demand distribution)
 * - View mode switches (day timeline vs month grid vs map)
 *
 * 100% resilient to client-side ad blockers and tracking protections.
 */

export interface TelemetryEvent {
  eventName: string;
  params?: Record<string, any>;
  timestamp: number;
  path?: string;
  clientIpHash?: string;
}

export interface TrackedEventItem {
  eventId: string;
  title: string;
  category?: string;
  views: number;
  ticketClicks: number;
}

export interface TicketDomainItem {
  domain: string;
  clicks: number;
}

export interface SourceReferralItem {
  handle: string;
  clicks: number;
}

export interface TelemetrySummary {
  period: string;
  totalEvents: number;
  totalViews: number;
  totalTicketClicks: number;
  totalSourceClicks: number;
  outboundCtr: number; // (ticketClicks / views) * 100
  topEvents: TrackedEventItem[];
  topTicketDomains: TicketDomainItem[];
  topSourcesReferred: SourceReferralItem[];
  ageGroupDemand: Record<string, number>;
  categoryDemand: Record<string, number>;
  viewModePreferences: Record<string, number>;
  recentEvents: TelemetryEvent[];
}

const MAX_RECENT_EVENTS = 50;

// In-memory aggregates store
let recentEventsStore: TelemetryEvent[] = [];
let totalEventsCounter = 0;
let totalViewsCounter = 0;
let totalTicketClicksCounter = 0;
let totalSourceClicksCounter = 0;

const eventStatsMap = new Map<string, TrackedEventItem>();
const ticketDomainsMap = new Map<string, number>();
const sourceReferralsMap = new Map<string, number>();
const ageGroupDemandMap: Record<string, number> = {};
const categoryDemandMap: Record<string, number> = {};
const viewModePreferencesMap: Record<string, number> = {};

/**
 * Ingests a first-party telemetry event and updates intent aggregates.
 */
export function recordTelemetryEvent(event: TelemetryEvent): void {
  totalEventsCounter++;

  // Add to bounded ring buffer (most recent first)
  recentEventsStore.unshift(event);
  if (recentEventsStore.length > MAX_RECENT_EVENTS) {
    recentEventsStore = recentEventsStore.slice(0, MAX_RECENT_EVENTS);
  }

  const { eventName, params = {} } = event;

  switch (eventName) {
    case 'view_event_detail': {
      totalViewsCounter++;
      const eventId = params.event_id || 'unknown';
      const title = params.event_title || 'Untitled Event';
      const category = params.category;

      const existing = eventStatsMap.get(eventId) || {
        eventId,
        title,
        category,
        views: 0,
        ticketClicks: 0,
      };

      existing.views++;
      if (title && existing.title === 'Untitled Event') existing.title = title;
      if (category && !existing.category) existing.category = category;
      eventStatsMap.set(eventId, existing);
      break;
    }

    case 'click_outbound_ticket': {
      totalTicketClicksCounter++;
      const eventId = params.event_id || 'unknown';
      const domain = params.destination_domain || 'direct_ticket';

      // Increment domain counter
      ticketDomainsMap.set(domain, (ticketDomainsMap.get(domain) || 0) + 1);

      // Increment event-specific ticket clicks
      const existing = eventStatsMap.get(eventId) || {
        eventId,
        title: 'Untitled Event',
        views: 0,
        ticketClicks: 0,
      };
      existing.ticketClicks++;
      eventStatsMap.set(eventId, existing);
      break;
    }

    case 'click_outbound_source': {
      totalSourceClicksCounter++;
      const handle = params.source_handle || 'unknown';
      sourceReferralsMap.set(handle, (sourceReferralsMap.get(handle) || 0) + 1);
      break;
    }

    case 'filter_age_group': {
      const ageGroup = params.age_group;
      const action = params.action; // 'add' | 'remove'
      if (ageGroup && (action === 'add' || !action)) {
        ageGroupDemandMap[ageGroup] = (ageGroupDemandMap[ageGroup] || 0) + 1;
      }
      break;
    }

    case 'filter_category': {
      const category = params.category;
      if (category) {
        categoryDemandMap[category] = (categoryDemandMap[category] || 0) + 1;
      }
      break;
    }

    case 'toggle_view_mode': {
      const mode = params.view_mode;
      if (mode) {
        viewModePreferencesMap[mode] = (viewModePreferencesMap[mode] || 0) + 1;
      }
      break;
    }
  }
}

/**
 * Returns structured analytics summary with top performing events and conversion metrics.
 */
export function getTelemetrySummary(): TelemetrySummary {
  const outboundCtr =
    totalViewsCounter > 0
      ? Math.round((totalTicketClicksCounter / totalViewsCounter) * 100)
      : 0;

  // Top events sorted by views, then ticket clicks
  const topEvents = Array.from(eventStatsMap.values())
    .sort((a, b) => b.views - a.views || b.ticketClicks - a.ticketClicks)
    .slice(0, 10);

  // Top ticket domains sorted by clicks
  const topTicketDomains = Array.from(ticketDomainsMap.entries())
    .map(([domain, clicks]) => ({ domain, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // Top source referrals sorted by clicks
  const topSourcesReferred = Array.from(sourceReferralsMap.entries())
    .map(([handle, clicks]) => ({ handle, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return {
    period: 'All-Time (First-Party Telemetry)',
    totalEvents: totalEventsCounter,
    totalViews: totalViewsCounter,
    totalTicketClicks: totalTicketClicksCounter,
    totalSourceClicks: totalSourceClicksCounter,
    outboundCtr,
    topEvents,
    topTicketDomains,
    topSourcesReferred,
    ageGroupDemand: { ...ageGroupDemandMap },
    categoryDemand: { ...categoryDemandMap },
    viewModePreferences: { ...viewModePreferencesMap },
    recentEvents: recentEventsStore.slice(0, 25),
  };
}

/**
 * Resets the in-memory telemetry store (for testing).
 */
export function clearTelemetryStore(): void {
  recentEventsStore = [];
  totalEventsCounter = 0;
  totalViewsCounter = 0;
  totalTicketClicksCounter = 0;
  totalSourceClicksCounter = 0;
  eventStatsMap.clear();
  ticketDomainsMap.clear();
  sourceReferralsMap.clear();

  for (const k of Object.keys(ageGroupDemandMap)) delete ageGroupDemandMap[k];
  for (const k of Object.keys(categoryDemandMap)) delete categoryDemandMap[k];
  for (const k of Object.keys(viewModePreferencesMap)) delete viewModePreferencesMap[k];
}
