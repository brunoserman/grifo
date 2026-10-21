# 13. A link is never saved twice

**Status:** accepted

## Context

With three ways to save (the app's add bar, the Android share sheet, the Chrome extension), saving the same article twice became easy: forget it was already saved, or favorite something from the browser that was queued weeks ago. Each duplicate splits highlights and reading progress across two copies of one page, and clutters the queue that is supposed to say what to read next.

## Decision

The rule lives in the API, in `POST /api/items`, so every way of saving obeys it. A link that matches one already saved is refused with a 409 that carries the earlier item and says where it is (queue, favorites or read items). Nothing new is created and the earlier item is left untouched: saving a queued link "to favorites" does not favorite it.

"The same link" means the same page after normalization: scheme, `www.`, a trailing slash, the `#fragment`, tracking parameters (`utm_*`, `fbclid` and similar) and parameter order are ignored. Hash routes (`#/…`, `#!…`) and real parameters still tell pages apart. The check runs before extraction, so a duplicate costs no page fetch, and again on the resolved URL when a wrapper (a LinkedIn post) points at a page already saved.

## Consequences

One copy per page, and a clear notice instead of a silent second item. The earlier item wins on purpose: it may already hold highlights, tags and a queue position, and replacing it would lose them.

The cost: there is no normalized URL column, so the check scans links on the same host and compares in the Worker. At a single user's volume this is negligible, and it avoided a schema change. Duplicates saved before this rule stay as they are. Normalization can be wrong in rare cases (a site where a tracking-looking parameter selects content); the fix there is narrowing the list in `worker/lib/dedupe.ts`.
