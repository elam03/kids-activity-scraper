---
name: evaluate-events
description: Evaluate kids activity event data directly from the Railway Postgres database rows. Pulls events for today (or a target date), assesses calendar rendering completeness, calculates an accuracy rating, and exports a lightweight CSV matching what renders to the calendar. Use when the user asks to evaluate, audit, check, or export event rows from the database.
---

# Evaluate Events Skill (`/evaluate-events`)

Evaluate kids activity event data directly from the Railway Postgres database rows, calculate accuracy ratings, and export a clean CSV matching what gets rendered on the calendar.

---

## Capabilities

1. **Direct DB Connection**: Uses credentials in `.env.railway.local` (or `.env.local` / `.env`).
2. **Auto-Tunnel Sensing**: Detects if the local Railway Postgres tunnel (`127.0.0.1:5433`) is open and auto-starts or provides clear guidance.
3. **Calendar Representation**: Outputs exactly the columns that render to the calendar (`title`, `date`, `time`, `category`, `age_range`, `cost`, `location`, `description`, `source`, `original_link`, `registration_url`).
4. **Accuracy Evaluation**: Computes an automated quality/accuracy score (0-100) and tier (High/Medium/Low) based on:
   - LLM extraction confidence (`confidence` float)
   - Specificity of location (penalizes vague labels like "Bay Area", rewards geocoded coordinates)
   - Title validity (flags placeholder "Non-event" or stub titles)
   - Timing completeness (rewards specific start/end times)
   - Community feedback (deducts for user `report_inaccurate` feedback)
   - Duration sanity (flags multi-month ongoing attractions)

---

## Quick Reference Commands

```bash
# Pull all events active today (both single-day and ongoing multi-day)
npm run eval:today

# Pull single-day events only for today
npx tsx scripts/evaluate-today-events.ts --scope single

# Pull events for a specific target date
npx tsx scripts/evaluate-today-events.ts --date 2026-10-03

# Pull all statuses (approved, pending, rejected) for full audit
npx tsx scripts/evaluate-today-events.ts --status all --output audit-all.csv

# Limit rows or specify custom output filename
npx tsx scripts/evaluate-today-events.ts --limit 20 --output sample-eval.csv
```

---

## CSV Column Reference

| Column Name | Calendar UI Element | Source in DB | Description |
|---|---|---|---|
| `id` | Internal key | `event.id` | Unique UUID of the event row |
| `title` | Card / Modal Header | `event.title` | Activity title |
| `date` | Card Date Badge | `startDate` (+ `endDate`) | Formatted date or date range |
| `time` | Card Time Subtitle | `startTime` (+ `endTime`) | Start/end time or "All day" |
| `category` | Colored Badge | `event.category` | Category tag (nature, sports, festival, etc.) |
| `age_range` | Pricing & Age section | `event.ageRange` | Target age range (e.g. "2-10 years") |
| `cost` | Pricing & Age section | `event.cost` / `isFree` | Pricing or "Free" |
| `location` | Where section / Map | `event.location` | Venue name or physical address |
| `description` | Details scrollable body | `event.rawCaption` | Full caption text from the original post |
| `source` | "via @handle" header | `source.handle` | Instagram account handle |
| `original_link` | "View Original Post" link | `event.rawPostUrl` | Direct link to Instagram post |
| `registration_url` | "Register / Sign Up" button | `event.registrationUrl` | External tickets/registration URL |
| `accuracy_rating` | Audit rating column | Evaluated composite | Rating tier, score, and flags (e.g. `High (95%)`) |

---

## Accuracy Rating Tiers

- 🟢 **High (85% - 100%)**: Verified specific location, valid date/time, descriptive title, high extraction confidence, and no inaccurate reports.
- 🟡 **Medium (70% - 84%)**: Usable event with minor ambiguities (e.g., broad location like "Bay Area", missing venue details, or seasonal attraction spanning > 90 days).
- 🔴 **Low (< 70%)**: Potentially inaccurate or problematic row (e.g., placeholder title, missing location, or user reports of inaccuracy). Requires admin review.

---

## Troubleshooting Database Connection

If connecting to Railway Postgres over a local tunnel:

1. Check that `.env.railway.local` contains:
   ```env
   DATABASE_URL="postgresql://postgres:<password>@127.0.0.1:5433/railway?sslmode=disable"
   ```
2. If the tunnel is not running:
   ```bash
   railway connect Postgres --tunnel-only -P 5433
   ```
   The evaluation script will also attempt to auto-launch this if `railway` CLI is in PATH.
