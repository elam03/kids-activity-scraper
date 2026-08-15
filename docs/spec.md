# Spec: Kids Activity Calendar Ingestion & Calendar System

## Problem Statement

Parents find it difficult and time-consuming to discover upcoming events and activities for their kids. While local creators compile excellent guides on Instagram, this information is highly fragmented, hidden within carousel slides/images, and scattered across multiple accounts. There is no simple, central calendar parents can visit to quickly view the upcoming week/month's activities.

## Solution

A single Next.js monorepo containing:
1. A public, lightweight **Parent Calendar** showing upcoming events in week/month views.
2. A password-protected **Admin Panel** where the admin can manage Instagram sources, trigger scraping runs, and approve/edit extracted events.
3. An **Ingestion Pipeline** that scrapes Instagram via Apify, processes carousels via GPT-4o mini vision, and extracts clean event JSON records.

## User Stories

1. As a parent, I want to view a simple week calendar of kids activities, so that I can easily plan my child's schedule.
2. As a parent, I want to toggle between week and month views, so that I can see events on a longer horizon.
3. As a parent, I want to click an event to see location details, age range, and cost, so that I can decide if it is suitable.
4. As a parent, I want a direct link to the original Instagram post, so that I can verify full details or view original comments.
5. As an admin, I want to add or remove Instagram handles to scrape, so that I can curate our sources list.
6. As an admin, I want to click a 'Trigger Scrape' button, so that I can fetch fresh data on-demand.
7. As an admin, I want to view a review queue of pending events, so that I can check low-confidence extractions before they publish.
8. As an admin, I want to inline edit event details (title, dates, times, cost) in the queue, so that I can correct extraction mistakes.
9. As an admin, I want to approve or reject events, so that I keep the public calendar clean and high-quality.
10. As an admin, I want to log in using a single dashboard password, so that the admin tools are secured from public edits.

## Implementation Decisions

### 1. Ingestion Pipeline
- **Apify Integration:** Call `POST /run-sync-get-dataset-items` with `directUrls`. Scrape limit set to 10-15 posts per account.
- **Multimodal Vision:** For `Sidecar` (carousel) posts, download images in the backend, convert to base64, and send to `gpt-4o-mini` vision.
- **Auto-Publish Threshold:** Confidence >= 0.8 automatically sets event status to `approved`. Below 0.8 goes to `pending` review.
- **De-duplication:** Unique index on `rawPostUrl` (or post ID). Re-scraping updates metadata but leaves approved/rejected events alone.

### 2. Database Schema
- **Source:** id, handle, name, lastScrapedAt, isActive.
- **Event:** id, sourceId, title, startDate, endDate, startTime, endTime, location, ageRange, category, cost, isFree, rawPostUrl, rawCaption, status ('pending'|'approved'|'rejected'), confidence, createdAt, updatedAt.

### 3. Server Architecture
- **Tech Stack:** Next.js (App Router, Standalone mode), Prisma ORM, PostgreSQL (Railway-managed).
- **Admin Auth:** Simple cookie-based password checks in Next.js middleware.
- **Deployments:** Railway with `preDeployCommand: npx prisma migrate deploy` and referenced `DATABASE_URL` variables.

## Testing Decisions
- **Seam:** We will test the core ingestion engine at the service layer: a mock Apify client output fed into the OpenAI service wrapper, asserting that the output yields expected database transactions.
- **Unit/Integration Tests:** Mock OpenAI responses to test that the schema parser handles missing times, date normalization (e.g. converting 'this Saturday' relative dates relative to current date), and category enums correctly.
- **Database Tests:** Ensure duplicate post URLs result in updates/ignores rather than database duplication errors.

## Out of Scope
- Automated recurring crons (for prototype, manual triggers only).
- Multiple admin accounts / permission levels.
- Mobile apps (web-only).
- Location geocoding / maps rendering.
- Category or age-range search filtering in the calendar (MVP supports week/month view only).
