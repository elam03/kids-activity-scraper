---
name: local-railway
description: Run the local Next.js development server connected directly to the production Railway Postgres database via an authenticated secure SSH tunnel. Automatically verifies or opens the Railway tunnel on port 5433, loads .env.railway.local, and launches the app on http://localhost:3000. Use when the user asks to run locally with Railway/prod database, start local dev against production, or runs /local-railway.
---

# Local Railway Dev Skill (`/local-railway`)

Run the local Next.js development server against the production Railway Postgres database through an authenticated, secure SSH tunnel.

---

## Capabilities

1. **One-Command Startup**: Automatically checks if port `5433` is listening; if closed, launches `railway connect Postgres --tunnel-only -P 5433` in the background.
2. **Production Data Access**: Connects Prisma to real production data (events, sources, submissions, feedback) with `sslmode=disable` over the local encrypted tunnel.
3. **Graceful Teardown**: Cleans up background tunnels when stopped.

---

## Quick Reference Commands

```bash
# Start local dev server connected to prod Railway Postgres (auto-tunnels if needed)
.agents/skills/local-railway/scripts/start-local-railway.sh

# Or run the npm script directly (if tunnel is already running)
npm run dev:railway

# Launch only the Railway SSH tunnel on port 5433
railway connect Postgres --tunnel-only -P 5433
```

---

## Configuration (`.env.railway.local`)

Ensure `.env.railway.local` contains:

```env
# Database tunnel endpoint (encrypted SSH tunnel to Railway private network)
DATABASE_URL="postgresql://postgres:<password>@127.0.0.1:5433/railway?sslmode=disable&connection_limit=3"

# APIs & credentials
APIFY_API_KEY=...
OPENAI_API_KEY=...
OPENROUTER_API_KEY=...
ADMIN_PASSWORD=...
APP_URL=https://kids-activity-scraper-production.up.railway.app
```

---

## Useful Prisma Commands via Tunnel

When the tunnel is open on `127.0.0.1:5433`:

```bash
# Visual database browser / editor against prod DB
env $(cat .env.railway.local | grep -v '^#' | xargs) npx prisma studio

# Sync schema changes safely to prod DB
env $(cat .env.railway.local | grep -v '^#' | xargs) npx prisma db push
```
