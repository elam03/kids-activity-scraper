# Railway Deployment: Next.js + Prisma + PostgreSQL

**Date:** 2026-08-15
**Sources:** https://docs.railway.app, https://railway.app/templates

---

## 1. Detection & Build Commands

Railway's builder (**Railpack**, formerly Nixpacks) auto-detects Next.js by scanning `package.json` for `next` in dependencies.

### Build and Start Commands

**Build Command:** `pnpm build` (or `npm run build`)
- Ensure `"postinstall": "prisma generate"` is in `package.json` so Prisma Client is generated before `next build`.
- Or prepend: `"build": "prisma generate && next build"`

**Start Command:** `pnpm start` or `node .next/standalone/server.js`

---

## 2. Prisma Migrations on Deploy

Railway supports a native **`preDeployCommand`** phase in `railway.json`:

- Runs **after** build and **before** new container starts serving traffic
- Has full access to Railway's private network and runtime env vars (`DATABASE_URL`)
- If it fails, Railway keeps the previous healthy deployment running

```bash
# Single package / root:
npx prisma migrate deploy
```

---

## 3. Service Wiring & DATABASE_URL

Railway does **NOT** automatically inject `DATABASE_URL` into the app service.
Use **Reference Variables** in the Next.js service Variables tab:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

*(Replace `Postgres` with the exact service name on your Railway canvas.)*

Railway then:
1. Uses private networking (`postgres.railway.internal`) — no public egress
2. Ensures Postgres is healthy before deploying the Next.js service
3. Automatically propagates credential changes

---

## 4. Pricing

| Plan | Price | Usage Credit | Execution |
| :--- | :--- | :--- | :--- |
| Free | $0/mo | $1/mo | Restricted 8 AM–8 PM (sleeps) |
| **Hobby (recommended)** | **$5/mo** | **$5/mo included** | **24/7 always-on** |
| Pro | $20/mo | $0 included | 24/7 always-on |

**Verdict:** The **Hobby plan ($5/mo)** is required. Free tier sleeps during peak hours and only gives $1/mo credit — not enough for Next.js + Postgres running continuously. The Hobby plan's included $5 credit covers a typical Next.js (256–512MB RAM) + Postgres (256MB RAM) deployment.

---

## 5. Known Gotchas

### `prisma generate` must run before `next build`
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "next build"
  }
}
```

### Internal DB not accessible during `next build`
Mark any routes with DB queries as dynamic:
```typescript
export const dynamic = 'force-dynamic';
```

### Edge Runtime incompatibility
Standard Prisma Client uses native Node.js binaries — incompatible with Edge Runtime. Keep all route handlers on Node.js runtime (the default). Never import `PrismaClient` in Edge Middleware.

### Prisma singleton pattern (prevent connection pool exhaustion)
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Linux binary targets for Prisma (macOS dev → Linux prod)
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]
}
```

---

## 6. Recommended Config Files

### `railway.json`
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "pnpm build"
  },
  "deploy": {
    "preDeployCommand": "npx prisma migrate deploy",
    "startCommand": "node .next/standalone/server.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### Health check route (`app/api/health/route.ts`)
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: (error as Error).message },
      { status: 503 }
    );
  }
}
```

### `nixpacks.toml` (if custom OpenSSL needed)
```toml
[variables]
NIXPACKS_NODE_VERSION = "20"

[phases.setup]
nixPkgs = ["openssl"]

[phases.install]
cmds = ["pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["pnpm prisma generate", "pnpm build"]

[start]
cmd = "pnpm start"
```
