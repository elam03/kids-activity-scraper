# Issue tracker: Beads (`bd`)

Issues for this repo live in **Beads** — a git-native, Dolt-backed issue tracker
accessible via the `bd` CLI. Run `bd prime` for full workflow context.

## Conventions

- Issue IDs are prefixed `kids-activity-scraper-<hash>` (e.g. `kids-activity-scraper-a3f2dd`)
- Use `bd ready` to find unblocked, unclaimed work
- Use `bd update <id> --claim` to atomically claim an issue before starting
- Use `bd close <id>` when work is done
- Use `bd link <blocking-id> <blocked-id>` to wire dependency edges
- Use `bd create "Title" --description="..." --type=task` to file new work

## When a skill says "publish to the issue tracker"

Run `bd create "Title" --description="Full issue body"` and capture the returned ID.

## When a skill says "fetch the relevant ticket"

Run `bd show <id>` to read the full issue body.

## Wayfinding operations

Used by `/wayfinder`. The map and its child tickets all live as Beads issues.

- **Map**: a Beads issue labelled `wayfinder:map`; its body follows the wayfinder
  map schema (Destination / Notes / Decisions-so-far / Not yet specified / Out of scope).
- **Child ticket**: a Beads issue created as a child of the map with
  `bd create "Title" --parent <map-id> --label wayfinder:<type>`.
- **Ticket types**: label values `wayfinder:research`, `wayfinder:prototype`,
  `wayfinder:grilling`, `wayfinder:task`.
- **Blocking**: wire edges with `bd link <blocking-id> <blocked-id>`.
  A ticket is unblocked when every issue blocking it is closed.
- **Frontier**: run `bd ready` — unblocked, open, unclaimed children of the map.
- **Claim**: `bd update <id> --claim` before any work.
- **Resolve**: append an `## Answer` section via `bd comment <id> "## Answer\n..."`,
  then `bd close <id>`, then update the map's Decisions-so-far via `bd update <map-id>`.

## Quick reference

```bash
bd prime               # Full context and session protocol
bd ready               # Find available work
bd list --label wayfinder:map   # List all wayfinder maps
bd show <id>           # View issue details
bd update <id> --claim # Claim work atomically
bd create "Title" --description="..." --type=task --priority=2
bd link <blocking-id> <blocked-id>
bd close <id>          # Complete work
```
