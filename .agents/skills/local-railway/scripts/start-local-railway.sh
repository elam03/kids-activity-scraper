#!/usr/bin/env bash
set -e

# Start Local Dev Server with Railway Production Postgres Tunnel
# Usage:
#   .agents/skills/local-railway/scripts/start-local-railway.sh
#   .agents/skills/local-railway/scripts/start-local-railway.sh --tunnel-only
#   .agents/skills/local-railway/scripts/start-local-railway.sh --port 5433

PORT=5433
TUNNEL_ONLY=false
TUNNEL_PID=""

for arg in "$@"; do
  case $arg in
    --tunnel-only)
      TUNNEL_ONLY=true
      shift
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
  esac
done

cleanup() {
  if [ -n "$TUNNEL_PID" ]; then
    echo ""
    echo "🛑 Shutting down Railway tunnel (PID: $TUNNEL_PID)..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "🚂 Kids Activity Scraper — Local Railway Dev Environment"
echo "--------------------------------------------------------"

# 1. Check railway CLI
if ! command -v railway >/dev/null 2>&1; then
  echo "❌ Error: railway CLI is not installed."
  echo "👉 Install with: brew install railway (or npm install -g @railway/cli)"
  exit 1
fi

# 2. Check .env.railway.local
if [ ! -f ".env.railway.local" ]; then
  echo "❌ Error: .env.railway.local not found."
  echo "👉 Copy .env.railway.local.example to .env.railway.local and set credentials."
  exit 1
fi

# 3. Check if tunnel is already listening on PORT
is_port_open() {
  nc -z -G 1 127.0.0.1 "$PORT" >/dev/null 2>&1
}

if is_port_open; then
  echo "✅ Railway Postgres tunnel is already active on 127.0.0.1:$PORT"
else
  echo "🔌 Opening Railway Postgres tunnel on port $PORT..."
  railway connect Postgres --tunnel-only -P "$PORT" >/dev/null 2>&1 &
  TUNNEL_PID=$!

  echo "⏳ Waiting for tunnel connection..."
  READY=false
  for i in {1..20}; do
    if is_port_open; then
      READY=true
      break
    fi
    sleep 0.5
  done

  if [ "$READY" = true ]; then
    echo "✅ Railway Postgres tunnel established on 127.0.0.1:$PORT (PID: $TUNNEL_PID)"
  else
    echo "❌ Failed to connect Railway tunnel on port $PORT."
    echo "👉 Try running: railway connect Postgres --tunnel-only -P $PORT"
    exit 1
  fi
fi

if [ "$TUNNEL_ONLY" = true ]; then
  echo "🚀 Tunnel-only mode. Press Ctrl+C to close."
  wait "$TUNNEL_PID" 2>/dev/null || while true; do sleep 1; done
  exit 0
fi

# 4. Start Next.js dev server with .env.railway.local
echo "🚀 Starting Next.js dev server on http://localhost:3000..."
npm run dev:railway
