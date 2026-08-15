# Kids Activity Calendar

A two-sided system that scrapes Instagram posts, extracts structured kid-friendly events (using vision/text LLM models), and displays them on a clean, mobile-first calendar.

---

## 1. Domain Glossary

- **Source**: An Instagram handle or URL configured by the Admin to be scraped (e.g. `@bayarea_toddlerexplorer`).
- **Raw Post**: A scraped post from Instagram, containing caption text, timestamp, media type (`Sidecar` or `Video` or `Image`), and image URLs.
- **Event**: A structured activity for kids, containing a title, date, time, location (text description), age range, cost, free status, and source link.
- **Sidecar Post**: A carousel post on Instagram containing multiple slide images.
- **Vision Extraction**: Using a multimodal LLM to read event information directly from carousel slide images.
- **Admin Review Queue**: The interface where the Admin approves, edits, or rejects pending events before they appear on the public calendar.
- **Parent Calendar**: The public, non-authenticated interface showing upcoming kids events in a week or month grid.
- **Confidence Score**: A metric (0.0 to 1.0) returned by the LLM indicating how certain it is that the event details are correct.
- **Auto-publish**: The process where events with confidence >= 0.8 are automatically approved and displayed on the public calendar.

---

## 2. System Architecture

```
                                  [Instagram] (Public accounts)
                                       │
                                       ▼ (Apify scraper run)
                                 [Raw Posts]
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                 [Video/Image]                    [Sidecar]
                  (Caption only)                 (Carousel slides)
                        │                             │
                        ▼ (LLM Text Parse)            ▼ (LLM Vision Parse - base64)
                        └──────────────┬──────────────┘
                                       ▼
                              [Confidence Check]
                                ┌──────┴──────┐
                       (>= 0.8) │             │ (< 0.8)
                                ▼             ▼
                           [Approved]     [Pending]
                                │             │
                                │             ▼ (Admin review / edit)
                                └──────┬──────┘
                                       ▼
                                [Active Events]
                                       │
                                       ▼
                             [Parent Calendar UI]
```

### Key Integrations
1. **Apify REST API**: Triggers the `apify/instagram-scraper` actor to fetch posts.
2. **OpenAI Chat Completions API**: Uses `gpt-4o-mini` for both structured text parsing and vision-based parsing.
3. **Database (PostgreSQL)**: Stores sources, scraped posts, and extracted events. Prisma handles migrations and client access.
