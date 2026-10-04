declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set' | 'js',
      targetIdOrEventName: string | Date,
      params?: Record<string, any>
    ) => void;
  }
}

export type AnalyticsParamValue = string | number | boolean | undefined | null;

/**
 * Dispatches a typed custom event to Google Analytics 4.
 * SSR-safe: Returns silently if window or window.gtag is not available.
 */
export function trackAnalyticsEvent(
  eventName: string,
  params?: Record<string, AnalyticsParamValue>
) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  // Filter out undefined and null parameters to maintain clean telemetry payloads
  const cleanParams: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleanParams[key] = value;
      }
    }
  }

  window.gtag('event', eventName, cleanParams);
}

export interface ViewEventDetailPayload {
  id: string;
  title: string;
  category?: string | null;
  isFree?: boolean | null;
}

/**
 * Strongly-typed event emitters aligned with GA4 event taxonomy design.
 */
export const analytics = {
  /**
   * Triggered when a parent opens an event details modal.
   */
  viewEventDetail: (event: ViewEventDetailPayload) => {
    trackAnalyticsEvent('view_event_detail', {
      event_id: event.id,
      event_title: event.title.slice(0, 100),
      category: event.category || undefined,
      is_free: event.isFree !== null && event.isFree !== undefined ? Boolean(event.isFree) : undefined,
    });
  },

  /**
   * Triggered when an outbound ticket or registration link is clicked.
   */
  clickOutboundTicket: (eventId: string, ticketUrl: string) => {
    let domain: string | undefined;
    try {
      domain = new URL(ticketUrl).hostname;
    } catch {
      domain = undefined;
    }

    trackAnalyticsEvent('click_outbound_ticket', {
      event_id: eventId,
      destination_domain: domain,
    });
  },

  /**
   * Triggered when a link to the original Instagram post or source is clicked.
   */
  clickOutboundSource: (eventId: string, sourceHandle?: string | null) => {
    const cleanHandle = sourceHandle?.replace(/^@/, '');
    trackAnalyticsEvent('click_outbound_source', {
      event_id: eventId,
      source_handle: cleanHandle || undefined,
    });
  },

  /**
   * Triggered when an age group pill filter is toggled.
   */
  filterAgeGroup: (ageGroup: string, selected: boolean) => {
    trackAnalyticsEvent('filter_age_group', {
      age_group: ageGroup,
      action: selected ? 'add' : 'remove',
    });
  },

  /**
   * Triggered when a category filter is selected.
   */
  filterCategory: (category: string) => {
    trackAnalyticsEvent('filter_category', {
      category,
    });
  },

  /**
   * Triggered when the view mode is switched (day/timeline, month, map).
   */
  toggleViewMode: (viewMode: 'day' | 'month' | 'map') => {
    trackAnalyticsEvent('toggle_view_mode', {
      view_mode: viewMode,
    });
  },

  /**
   * Triggered when an event is bookmarked or removed from bookmarks.
   */
  bookmarkEvent: (eventId: string, saved: boolean) => {
    trackAnalyticsEvent('bookmark_event', {
      event_id: eventId,
      action: saved ? 'save' : 'unsave',
    });
  },

  /**
   * Triggered when a Ko-Fi tipping button is clicked.
   */
  clickKofiTip: (placement: string) => {
    trackAnalyticsEvent('click_kofi_tip', {
      placement,
    });
  },
};
