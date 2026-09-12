# Railway Tunnel: Local Development with Production Postgres

**Date:** 2026-09-12  
**Primary Sources:**
- Railway CLI docs: https://docs.railway.com/guides/cli
- Railway networking: https://docs.railway.com/guides/private-networking
- Railway GitHub CLI: https://github.com/railwayapp/cli
- Prisma connection URL reference: https://www.prisma.io/docs/orm/reference/connection-urls
- Prisma PostgreSQL connector: https://www.prisma.io/docs/orm/overview/databases/postgresql

> **⚠️ Verify flag names before first use:** run `railway tunnel --help` to confirm `--service` and `--port` flag names against your installed CLI version.

---

## Overview

`railway tunnel` creates an authenticated, encrypted TCP tunnel from your local machine to a service running inside Railway's private network. For Postgres this means:

- Railway exposes port 5432 on a **local port** you control (e.g. `127.0.0.1:5433`)
- Auth is your Railway login token — no SSH key needed
- You connect Prisma to `127.0.0.1:5433` as if it were local
- The tunnel handles TLS end-to-end; wire protocol inside the tunnel is plain TCP

---

## Installation & Auth

```bash
# 1. Install Railway CLI (macOS)
brew install railway          # or: npm install -g @railway/cli

# Verify v3+
railway --version

# 2. Authenticate
railway login                 # opens browser OAuth
# railway login --browserless # non-interactive alternative

# 3. Link to this project (run from repo root where railway.json lives)
railway link                  # select team → project → environment
```

---

## Tunnel Commands (`railway connect`)

```bash
# Basic tunnel — picks the only TCP service automatically
railway tunnel

# Recommended: named service + fixed local port (avoids collision with local Postgres on 5432)
railway connect Postgres --port 5433

# Target a specific environment
railway environment production
railway connect Postgres --port 5433
```

> The Railway canvas service name for this project is **`Postgres`**  
> (seen in `.env.example`: `${{Postgres.DATABASE_URL}}`)

Keep the tunnel terminal **open** for as long as you need it. It is a foreground process.

---

## DATABASE_URL Format

When connecting through the tunnel, use `127.0.0.1` (not `localhost` — see IPv4 gotcha below) and `sslmode=disable` (the tunnel already encrypts):

```
postgresql://USER:PASSWORD@127.0.0.1:5433/railway?sslmode=disable&connection_limit=3
```

**Get credentials from:** Railway Dashboard → Postgres service → **Variables** tab  
Copy `PGUSER`, `PGPASSWORD`, `PGDATABASE`, then build the URL above.

Or: copy the full `DATABASE_URL` from Variables and swap out the host+port:
```
# Railway's public DATABASE_URL (example):
postgresql://postgres:abc123@roundhouse.proxy.rlwy.net:12345/railway?sslmode=require

# Modified for tunnel on local port 5433:
postgresql://postgres:abc123@127.0.0.1:5433/railway?sslmode=disable&connection_limit=3
```

---

## Gotchas

| Issue | Fix |
|---|---|
| **SSL cert mismatch** | Use `sslmode=disable` — tunnel already encrypts; adding TLS on top fails on localhost |
| **IPv6** | Use `127.0.0.1`, not `localhost` — macOS may resolve `localhost` → `::1`, tunnel binds `127.0.0.1` |
| **Port collision** | Use `--port 5433`; `5432` is likely taken by a local Postgres |
| **Connection limits** | Add `&connection_limit=3` — Hobby plan has ~25 connections; `next dev` + Prisma Studio eat them fast |
| **`railway link` required** | Must run once from project root before `railway tunnel` works |
| **Production mutations** | `prisma migrate dev` through the tunnel runs against **prod**. Use `prisma migrate deploy` only when intentional |

---

## Local Dev Setup (npm run dev:railway)

### 1. Create `.env.railway.local` (gitignored)

```bash
# .env.railway.local — LOCAL TUNNEL MODE
# Fill in your values from Railway Dashboard → Postgres → Variables
DATABASE_URL="postgresql://postgres:YOUR_PGPASSWORD@127.0.0.1:5433/railway?sslmode=disable&connection_limit=3"

# Keep all other env vars the same as .env.local:
APIFY_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
ADMIN_PASSWORD=fr33SCRAPER
APP_URL=https://kids-activity-scraper-production.up.railway.app
```

### 2. Add to `.gitignore`

```
.env.railway.local
```

### 3. Use the `dev:railway` npm script

The project's `package.json` includes a `dev:railway` script that loads `.env.railway.local`:

```bash
# Terminal 1 — start tunnel (keep open)
railway connect Postgres --port 5433

# Terminal 2 — start Next.js against prod DB
npm run dev:railway
```

---

## Prisma Commands via Tunnel

```bash
# Browse/edit production data visually
npx prisma studio

# Introspect current production schema
npx prisma db pull

# Apply pending migrations to production (⚠️ careful!)
npx prisma migrate deploy

# Push schema changes without migration history (⚠️ destructive)
npx prisma db push
```

---

## Restoring Local Dev (SQLite)

When done with the tunnel session:

1. Kill the tunnel terminal (`Ctrl+C`)
2. Switch back to the default `npm run dev` (uses `.env.local` with `DATABASE_URL="file:./dev.db"`)

---

## Verification Checklist

Before relying on this guide, confirm with your installed CLI:

- [ ] `railway tunnel --help` → confirm `--service` and `--port` flag names
- [ ] Test connection: `psql "postgresql://postgres:PW@127.0.0.1:5433/railway?sslmode=disable"`
- [ ] `lsof -i :5433` → confirm tunnel is bound to `127.0.0.1` not `::1`
- [ ] `railway --version` → should be v3.x
