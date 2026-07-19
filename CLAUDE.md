# Grifo

Personal read-later app with a draggable priority queue, highlights, and content search. Single user.
Full spec in `SPEC.md`.

## Language

All code, comments, commits, and repository files in English.
Explanations to the owner in chat in simple Portuguese: he works in Product, not engineering.

## Stack

Cloudflare Workers + Hono, D1 (plain SQL, no ORM), R2, React + Vite + Tailwind.

## Infrastructure is already provisioned. Do not try to provision it.

- The D1 database and the R2 bucket already exist. Their bindings are in `wrangler.toml`.
- The schema in `SPEC.md` section 7 has already been applied by hand through the D1 dashboard console. Do not run `wrangler d1 execute`. When the schema changes, tell the owner what SQL to paste; do not try to apply it yourself.
- Deploy is handled by Cloudflare Workers Builds on push to main. Never run `wrangler deploy`.
- `wrangler` is intentionally absent from this environment and has no Cloudflare credentials, by design: cloud sessions have no secrets store, so an API token here would be exposed. Its absence is not a problem to solve.
- `npm install` and typechecking should work. If the network is blocked, that is an environment setting for the owner to fix, not a reason to change the architecture.

## Rules

- No ORM. D1 prepared statements directly.
- No auth library. Cloudflare Access handles it at the edge.
- `jsdom` does not run on Workers. Extraction uses `linkedom`.
- Extraction failure must never prevent saving the item.
- Marking as read must never delete highlights.
- Highlights are anchored by quote + prefix + suffix, never by DOM offset.
- Search is D1 native FTS5, always `unicode61 remove_diacritics 2` with `prefix='2 3'`. No external service.
- NEVER use the `porter` tokenizer: English-only, and the requirement is multi-language.
- NEVER use CREATE TRIGGER: remote D1 does not support it reliably. The Worker syncs the search index alongside every write.
- One phase at a time. Phase scope is in SPEC.md, section 6.

## Current state

Phase 1 (queue) and phase 2 (highlights) shipped. Phase 3 (search) in progress.
