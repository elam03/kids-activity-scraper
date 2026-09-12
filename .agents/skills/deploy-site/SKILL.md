---
name: deploy-site
description: Deploy the site by synchronizing all commits from branch 'main' to branch 'deploy' and pushing to the origin remote. Use when the user asks to deploy, release to production, push to deploy branch, or runs /deploy-site.
disable-model-invocation: true
---

# Deploy Site (`/deploy-site`)

Deploy the latest verified code from branch `main` to the production `deploy` branch.

---

## Workflow Overview

```mermaid
flowchart TD
    A["1. Safety Check\n(Ensure clean working tree)"] --> B["2. Quality Gates\n(npx tsc & tests)"]
    B --> C["3. Pull & Rebase\n(Sync local main with origin/main)"]
    C --> D["4. Push to Deploy\n(git push origin main:deploy)"]
    D --> E["5. Update Local Ref\n(git branch -f deploy main)"]
    E --> F["6. Report Deployment Status"]
```

---

## Quick Usage

Run the automated helper script:

```bash
# Standard deployment (runs typechecks, tests, and pushes main to deploy)
.agents/skills/deploy-site/scripts/deploy.sh

# Dry-run mode (validates working tree and runs tests without pushing)
.agents/skills/deploy-site/scripts/deploy.sh --dry-run

# Emergency skip tests (if tests were already verified)
.agents/skills/deploy-site/scripts/deploy.sh --skip-tests
```

---

## Step-by-Step Manual Procedure

If running individual commands manually:

1. **Verify working tree is clean:**
   ```bash
   git status
   ```
   Ensure there are no uncommitted changes. If dirty, commit or stash them first.

2. **Run quality gates:**
   ```bash
   npx tsc --noEmit
   npx tsx --test src/lib/*.test.ts
   ```

3. **Ensure local `main` is up to date:**
   ```bash
   git fetch origin main
   git pull --rebase origin main
   ```

4. **Sync commits to `deploy` branch on remote:**
   ```bash
   git push origin main:deploy
   ```

5. **Update local `deploy` branch pointer for consistency:**
   ```bash
   git branch -f deploy main
   ```

6. **Confirm deployed commit:**
   ```bash
   git log -1 --oneline origin/deploy
   ```
