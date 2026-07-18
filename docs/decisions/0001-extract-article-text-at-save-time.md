# 1. Extract article text at save time

**Status:** accepted

## Context

Two options for saving a link: store the URL and fetch on read, or fetch once and store the cleaned article. Highlighting only works reliably on content we own, because a live third-party page changes, goes behind a paywall, or disappears.

## Decision

At save time, fetch the page, run Mozilla Readability over `linkedom`, and store the cleaned HTML and plain text in D1. `jsdom`, the more common choice, does not run on Cloudflare Workers; `linkedom` does. This one fact would have cost hours if discovered by trial.

## Consequences

Three problems solved at once: links can't rot, highlighting becomes possible because the text is ours, and content search becomes possible for the same reason. The cost is that extraction can fail (see ADR 6), and when it does the item must still be saved and openable.
