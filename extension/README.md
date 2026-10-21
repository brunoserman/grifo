# Save to Grifo (Chrome extension)

Saves the page you are on, or any link, to Grifo's queue or straight to Favorites.

- **Toolbar button:** opens a small popup with "Save to queue" and "Save to favorites".
- **Right-click:** on a page, "Save page to Grifo queue/favorites"; on a link, "Save link to Grifo queue/favorites", without opening it.

Saving to Favorites files the item as read: it shows in Favorites and in the read archive, not in the queue.

A link that is already in Grifo is not saved again: the earlier item is kept as it is, and the popup (or a notification, for right-click saves) says where it already is.

## Install

The extension is not on the Chrome Web Store. It is loaded from this folder.

1. Get this folder onto the computer: clone the repository, or on GitHub use **Code → Download ZIP** and unzip it.
2. In Chrome, open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `extension` folder.
4. A settings tab opens. Paste the address you open Grifo at (the `workers.dev` one) and click **Save**.
5. Chrome asks to let the extension read and change data on that site. Allow it.
6. Optional: pin the Grifo icon in the puzzle-piece menu so it stays on the toolbar.

To update, replace the folder's contents with the new version and click the reload arrow on the extension's card in `chrome://extensions`.

## How it saves

It calls Grifo's API directly, using the Cloudflare Access session Chrome already holds for Grifo. When that is not possible (the session expired, or the site permission was refused), it opens Grifo's `/share` page in a new tab instead, which logs in if needed and saves from there. Either way the link is saved; the tab is just the slower path.
