# 7. A PWA needs an explicit manifest and correct static-file serving

**Status:** accepted

## Context

The spec called the product a PWA so it would install on desktop and mobile without an app store. On Android the installed shortcut kept opening with a browser bar instead of standalone.

## Decision

Ship a `manifest.webmanifest` with `display: standalone`, name, icons (192 and 512), and theme colors, linked from `index.html`. Separately, the Worker must serve real static files as themselves: it was returning `index.html` for every route, so `/manifest.webmanifest` came back as the app's HTML and Chrome reported "no manifest detected". Only unknown routes fall back to `index.html`.

## Consequences

Two distinct bugs hid behind one symptom: a missing manifest, and a single-page-app catch-all that swallowed the manifest even once it existed. The phase-1 prompt named the destination (a PWA) but never requested the piece that gets you there. Same lesson as ADR 6: the gap was in the request, not the tool.
