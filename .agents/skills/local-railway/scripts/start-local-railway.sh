#!/usr/bin/env bash
set -e

PORT=5433

# 1. Start Railway tunnel if not already listening
if ! nc -z 127.0.0.1 "$PORT" 2>/dev/null; then
  echo "🔌 Starting Railway Postgres tunnel on port $PORT..."
  railway connect Postgres --tunnel-only -P "$PORT" &
  while ! nc -z 127.0.0.1 "$PORT" 2>/dev/null; do
    sleep 0.5
  done
  echo "✅ Railway Postgres tunnel active on port $PORT"
else
  echo "✅ Railway Postgres tunnel already running on port $PORT"
fi

# 2. Start dev server if not already listening
if ! nc -z 127.0.0.1 3000 2>/dev/null; then
  echo "🚀 Starting Next.js dev server on http://localhost:3000..."
  npm run dev:railway
else
  echo "✅ Dev server already running on http://localhost:3000"
fi
