# 12. The browser extension calls the API and falls back to the share route

**Status:** accepted

## Context

Reading on desktop Chrome meant switching to Grifo and pasting the link by hand. The Android share target already covers mobile. Desktop needed the same one-step save, to the queue or straight to Favorites.

The catch is authentication. Cloudflare Access sits in front of everything, so a request only gets through with the Access session cookie, and Access answers anything else with a redirect to its login page, which a background request cannot follow.

## Decision

A small unpacked Manifest V3 extension in `extension/`, with no build step. It saves by calling `POST /api/items` with the browser's Access cookie, which Chrome sends because the extension holds host permission for the Grifo address. If that fails for any reason other than Grifo rejecting the link, it opens `/share?url=...` in a tab, the same route the Android share target uses, where a normal page load can go through the Access login.

Saving to Favorites is a `favorite` flag on the save. Such a link was already read in the browser, so it is filed as read instead of landing on the queue.

## Consequences

No API token, no second auth path, nothing secret in the extension: Access stays the only gate. The fallback means a save never silently fails, at the cost of an extra tab when the session has expired. The extension is installed in developer mode rather than from the Chrome Web Store, which is fine for one user and avoids a store listing for a private app.
