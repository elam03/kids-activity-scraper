---
name: local-railway
description: Start the local Next.js development server connected directly to the production Railway Postgres database. Checks if the Railway SSH tunnel on port 5433 and dev server on port 3000 are running, starts them if needed, and directs to http://localhost:3000. Use when the user asks to run locally with Railway/prod database, start local dev against production, or runs /local-railway.
---

# Local Railway Dev (`/local-railway`)

Run the Next.js dev server connected to the production Railway Postgres database via an SSH tunnel.

## Instructions for Agent

Follow these steps:

### 1. Ensure Railway Tunnel is Running (Port 5433)
Check if port 5433 is listening:
```bash
nc -z 127.0.0.1 5433 || lsof -i :5433
```
If not running, launch the tunnel in the background (as a daemon process):
```bash
railway connect Postgres --tunnel-only -P 5433
```
Wait briefly until port 5433 responds before continuing.

### 2. Ensure Dev Server is Running (Port 3000)
Check if port 3000 is listening:
```bash
nc -z 127.0.0.1 3000 || lsof -i :3000
```
If not running, start the dev server in the background:
```bash
npm run dev:railway
```
Wait briefly until port 3000 is accepting connections.

### 3. Report Ready
Point the user to [http://localhost:3000](http://localhost:3000).
