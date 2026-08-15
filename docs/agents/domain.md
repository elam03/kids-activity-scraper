# Domain docs

This repo uses **single-context** layout.

- `CONTEXT.md` at the repo root — the living domain glossary and architectural overview
- `docs/adr/` — Architecture Decision Records, one file per decision

## Consumer rules

- Always read `CONTEXT.md` before designing or modifying a module — it defines the
  canonical names and boundaries for this domain.
- When making a significant architectural decision, create an ADR in `docs/adr/`
  using the format `NNN-short-title.md`.
- ADRs are append-only. Mark superseded records as `Status: Superseded by ADR-NNN`.
