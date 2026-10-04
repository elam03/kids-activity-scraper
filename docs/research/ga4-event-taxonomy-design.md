# Decision: GA4 Custom Event Taxonomy for Parent Engagement

**Ticket**: `kids-activity-scraper-2sn.2`  
**GitHub Issue**: [#33 (Fix google search and improve google analytics data collection)](https://github.com/elam03/kids-activity-scraper/issues/33)  
**Parent Map**: `kids-activity-scraper-2sn`  
**Date**: October 2026  
**Status**: Decided

---

## 1. Executive Summary & Design Principles

Google Analytics 4 is currently only collecting default automated page views (`page_view`, `session_start`). To understand parent behavior, high-intent interest, and conversion (clicks to ticket providers, Instagram sources, bookmarks, donations), we establish a structured, low-cardinality custom event taxonomy.

### Key Principles:
1. **Low Cardinality**: Parameter values are constrained enums (e.g. `category`, `age_group`, `view_mode`) to prevent dimension cardinality explosion in GA4 reports.
2. **Standard GA4 Semantic Conventions**: Use snake_case event names aligned with Google recommended events where possible (`select_content`, `view_item`, etc.) with intuitive custom actions.
3. **Safe Client-Side Utility**: Encapsulate `window.gtag` calls in a strongly-typed helper `src/lib/analytics.ts` with server-side safety checks (`typeof window !== 'undefined'`).

---

## 2. Event Taxonomy Specification

| Event Name | Trigger Location | Purpose | Key Parameters |
| :--- | :--- | :--- | :--- |
| `view_event_detail` | Click event card (Timeline/Month/Map) | Measures which specific activities parents are exploring | `event_id`, `event_title`, `category`, `is_free` |
| `click_outbound_ticket`| Click "Get Tickets" / Registration link | Measures direct commercial / booking intent | `event_id`, `destination_domain` |
| `click_outbound_source`| Click "View on Instagram" / Source link | Measures referral traffic to event creators | `event_id`, `source_handle` |
| `filter_age_group` | Tap age pill (e.g. Toddlers, Preschoolers) | Measures audience demographics & demand | `age_group` (`toddlers`, `kids`, etc.), `action` (`add` / `remove`) |
| `filter_category` | Select category dropdown | Measures activity genre preferences | `category` (`sports`, `arts`, `festival`, etc.) |
| `toggle_view_mode` | Switch Timeline vs Month vs Map | Measures navigation & UI preferences | `view_mode` (`day`, `month`, `map`) |
| `bookmark_event` | Click Save/Favorite button | Measures high-intent retention | `event_id`, `action` (`save` / `unsave`) |
| `click_kofi_tip` | Click Ko-Fi tipping button | Measures community support engagement | `placement` (`header` / `footer` / `modal`) |

---

## 3. Implementation Code Blueprint (`src/lib/analytics.ts`)

```typescript
declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set' | 'js',
      targetIdOrEventName: string | Date,
      params?: Record<string, any>
    ) => void;
  }
}

/**
 * Dispatches a typed custom event to Google Analytics 4.
 */
export function trackAnalyticsEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  // Filter out undefined parameters to keep payload clean
  const cleanParams: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        cleanParams[key] = value;
      }
    }
  }

  window.gtag('event', eventName, cleanParams);
}

// Convenient helper functions
export const analytics = {
  viewEventDetail: (event: { id: string; title: string; category: string; isFree?: boolean }) =>
    trackAnalyticsEvent('view_event_detail', {
      event_id: event.id,
      event_title: event.title.slice(0, 100),
      category: event.category,
      is_free: Boolean(event.isFree),
    }),

  clickOutboundTicket: (eventId: string, url: string) => {
    try {
      const domain = new URL(url).hostname;
      trackAnalyticsEvent('click_outbound_ticket', { event_id: eventId, destination_domain: domain });
    } catch {
      trackAnalyticsEvent('click_outbound_ticket', { event_id: eventId });
    }
  },

  filterAgeGroup: (ageGroup: string, selected: boolean) =>
    trackAnalyticsEvent('filter_age_group', { age_group: ageGroup, action: selected ? 'add' : 'remove' }),

  filterCategory: (category: string) =>
    trackAnalyticsEvent('filter_category', { category }),

  toggleViewMode: (viewMode: 'day' | 'month' | 'map') =>
    trackAnalyticsEvent('toggle_view_mode', { view_mode: viewMode }),

  bookmarkEvent: (eventId: string, saved: boolean) =>
    trackAnalyticsEvent('bookmark_event', { event_id: eventId, action: saved ? 'save' : 'unsave' }),

  clickKofiTip: (placement: string) =>
    trackAnalyticsEvent('click_kofi_tip', { placement }),
};
```

---

## 4. GA4 Custom Dimensions Setup (Admin Checklist)
To see these parameters in GA4 Explorations and standard reports:
1. Go to **GA4 Admin** > **Data display** > **Custom definitions**.
2. Click **Create custom dimension**:
   - `category` (Event scope)
   - `age_group` (Event scope)
   - `view_mode` (Event scope)
   - `destination_domain` (Event scope)
   - `action` (Event scope)
