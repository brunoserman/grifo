# 6. Extraction failure is never a dead end

**Status:** accepted

## Context

`linkedom` reads raw HTML. Sites that build their body with JavaScript after load (Substack, for example) return a near-empty page at fetch time, so Readability finds no article. This is a known limit of the chosen approach, not a bug, and was accepted when the paid Browser Rendering option was rejected in ADR 4.

Two failures surfaced together during real use. First, a saved Substack link extracted empty. Second, and worse, the queue had no way to open a saved item at all: only drag, mark-as-read, and delete. An item you can't open is a lost link, which is the exact problem Grifo exists to prevent.

## Decision

Saving must never fail because extraction failed: the item is stored with `extraction='failed'` and the error recorded. Every item, whatever its type or extraction status, must have a way to reach its content. For a link with failed extraction, "Open" falls back to the original URL, so the source is always one click away.

## Consequences

Failed extraction degrades from "lost article" to "read it on the original site". Recovering full-page extraction for JavaScript-rendered sites via Browser Rendering is deferred to a later phase, and only worth building once real usage shows how often it's actually needed, and that it's always the same cause. Both failures were gaps in the phase-1 prompt, not the model: the spec asked for a reading queue and the prompt forgot the action that lets you read. The bottleneck is the precision of the request, which is the product work.
