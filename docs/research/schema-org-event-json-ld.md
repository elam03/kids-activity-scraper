# Research: Schema.org Event JSON-LD Structured Data for Google Rich Results

**Ticket**: `kids-activity-scraper-akg.1`  
**GitHub Issue**: [#32 (Improve SEO for discoverability in search/suggestions)](https://github.com/elam03/kids-activity-scraper/issues/32)  
**Date**: October 2026  
**Status**: Decided

---

## 1. Executive Summary & Google Search Central Guidelines

To qualify for Google Search's **Event Rich Snippets**, **Event Packs**, and **Carousel Results**, the structured data must follow [Google Search Central's Event Guidelines](https://developers.google.com/search/docs/appearance/structured-data/event).

Key Requirements:
1. **Required Fields**:
   - `name`: Event title
   - `startDate`: ISO-8601 string (e.g. `2026-10-15T10:00:00-07:00` or `2026-10-15`)
   - `location`: Must be a `Place` with `name` and structured `address` (`PostalAddress`) or `VirtualLocation`
2. **Mandatory Eligibility Properties**:
   - `eventAttendanceMode`: Must be `https://schema.org/OfflineEventAttendanceMode`, `https://schema.org/OnlineEventAttendanceMode`, or `https://schema.org/MixedEventAttendanceMode`.
   - `eventStatus`: Must be `https://schema.org/EventScheduled`, `https://schema.org/EventPostponed`, or `https://schema.org/EventCancelled`.
3. **High-Value Recommended Properties**:
   - `description`: Clean text summary
   - `endDate`: ISO-8601 string
   - `isAccessibleForFree`: Boolean (`true` or `false`)
   - `offers`: `Offer` object with `price`, `priceCurrency: 'USD'`, `availability`, `url`
   - `organizer`: Organization (e.g. the source Instagram handle / institution name)
   - `image`: Event flyer or poster image URL
4. **Architectural Guideline (Crucial)**:
   Google explicitly states that `Event` markup performs best on pages dedicated to an event, or when structured as an `ItemList` containing event summaries on directory/schedule listings.

---

## 2. Mapping Prisma Event Schema to Schema.org Event

Our Prisma schema (`prisma/schema.prisma`) maps directly into the schema.org specification:

| Schema.org Property | Prisma `Event` / `Source` Field | Transformation / Fallback Rule |
| :--- | :--- | :--- |
| `@type` | Constant | `"Event"` |
| `name` | `event.title` | Direct string |
| `description` | `event.rawCaption` | Truncated to first 300 chars, stripped of hashtags |
| `startDate` | `event.startDate`, `event.startTime` | Formatted to ISO string: `YYYY-MM-DDTHH:MM:00` |
| `endDate` | `event.endDate`, `event.endTime` | If present, ISO string; otherwise omit |
| `eventStatus` | `event.status` | `"https://schema.org/EventScheduled"` (unless rejected) |
| `eventAttendanceMode`| Constant | `"https://schema.org/OfflineEventAttendanceMode"` |
| `isAccessibleForFree`| `event.isFree` | `Boolean(event.isFree)` |
| `location.name` | `event.location` | Fallback: `"San Francisco Bay Area"` |
| `location.address` | `event.location` | Structured `PostalAddress` (`addressRegion: 'CA'`, `addressCountry: 'US'`) |
| `organizer.name` | `event.source.name` | Organization name or handle |
| `organizer.url` | `event.source.handle` | Instagram profile URL or source website |
| `offers.price` | `event.cost` | Numeric string or `"0"` if free |
| `offers.priceCurrency`| Constant | `"USD"` |
| `offers.url` | `event.registrationUrl` / `rawPostUrl` | Ticket registration URL or source link |

---

## 3. Implementation Code Blueprint

Building upon our existing [`src/lib/seo-utils.ts`](file:///Users/ericlam/projects/elam03/kids-activity-scraper/src/lib/seo-utils.ts), we update `buildEventJsonLd` to include the `organizer` and `ItemList` generator:

```typescript
export function buildEventJsonLd(event: PrismaEventWithSource) {
  const startDateTime = event.startTime
    ? `${event.startDate}T${event.startTime.length === 5 ? `${event.startTime}:00` : event.startTime}`
    : event.startDate;

  const endDateTime = event.endDate
    ? event.endTime
      ? `${event.endDate}T${event.endTime.length === 5 ? `${event.endTime}:00` : event.endTime}`
      : event.endDate
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.rawCaption ? event.rawCaption.slice(0, 300).trim() : event.title,
    startDate: startDateTime,
    ...(endDateTime ? { endDate: endDateTime } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    isAccessibleForFree: Boolean(event.isFree),
    location: {
      '@type': 'Place',
      name: event.location || 'San Francisco Bay Area',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.location || 'San Francisco Bay Area',
        addressRegion: 'CA',
        addressCountry: 'US',
      },
    },
    organizer: event.source ? {
      '@type': 'Organization',
      name: event.source.name,
      url: `https://instagram.com/${event.source.handle.replace('@', '')}`,
    } : undefined,
    ...(event.cost || event.isFree
      ? {
          offers: {
            '@type': 'Offer',
            price: event.isFree ? '0' : event.cost || '0',
            priceCurrency: 'USD',
            url: event.registrationUrl || event.rawPostUrl,
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}

export function buildEventListJsonLd(events: PrismaEventWithSource[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: events.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: buildEventJsonLd(event),
    })),
  };
}
```

---

## 4. Rich Results Verification
Once rendered, validate using:
- **Google Rich Results Test**: `https://search.google.com/test/rich-results`
- **Schema.org Validator**: `https://validator.schema.org/`
