# Grifo

Personal read-later app with a draggable priority queue, highlights, and content search. Single user.
Full spec in `SPEC.md`.

## Language

All code, comments, commits, and repository files in English.
Explanations to the owner in chat in simple Portuguese: he works in Product, not engineering.

## Stack

Cloudflare Workers + Hono, D1 (plain SQL, no ORM), R2, React + Vite + Tailwind.
Deploy: handled by Cloudflare Workers Builds on push to main. Do not run `wrangler deploy`.

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

Phase 1 in progress.
