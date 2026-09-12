#!/usr/bin/env bash
set -e

# Deploy script: Syncs all commits from branch 'main' to branch 'deploy' and pushes to origin.

DRY_RUN=false
SKIP_TESTS=false
FORCE=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
  esac
done

echo "🚀 Initiating /deploy-site workflow..."

# 1. Check working directory status
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️ Working directory contains uncommitted changes."
  echo "Please commit or stash your changes before deploying."
  git status -s
  exit 1
fi

# 2. Verify current branch is main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️ Current branch is '$CURRENT_BRANCH'. Switching to 'main'..."
  git checkout main
fi

# 3. Fetch latest origin
echo "📡 Fetching origin..."
git fetch origin main

# 4. Check if local main is behind origin/main
LOCAL_HASH=$(git rev-parse main)
REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL_HASH")

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
  echo "⚠️ Local 'main' ($LOCAL_HASH) differs from 'origin/main' ($REMOTE_HASH)."
  echo "Attempting fast-forward pull..."
  git pull --rebase origin main
fi

LATEST_COMMIT=$(git log -1 --oneline main)
echo "📦 Commit to deploy: $LATEST_COMMIT"

# 5. Run Quality Gates (unless skipped)
if [ "$SKIP_TESTS" = false ]; then
  echo "🧪 Running quality gates (typecheck + test suite)..."
  npx tsc --noEmit
  npx tsx --test src/lib/*.test.ts
  echo "✅ All tests and typechecks passed!"
else
  echo "⏭️ Skipping tests (--skip-tests flag passed)."
fi

# 6. Push main to deploy branch on origin
if [ "$DRY_RUN" = true ]; then
  echo "🔍 [DRY RUN] Would execute: git push origin main:deploy"
  echo "🔍 [DRY RUN] Local branch 'deploy' would be updated to match 'main'."
  echo "✨ Dry run complete. Everything is ready to deploy."
  exit 0
fi

echo "🚀 Syncing commits from 'main' to 'deploy'..."
PUSH_ARGS="origin main:deploy"
if [ "$FORCE" = true ]; then
  PUSH_ARGS="--force origin main:deploy"
fi

git push $PUSH_ARGS

# Update local deploy branch reference as well for local consistency
git branch -f deploy main

echo "🎉 Deployment sync complete!"
echo "📡 Branch 'deploy' is now synced with 'main' ($LATEST_COMMIT)."
