# Grifo — Spec and Build Plan

Sections 1 to 6 are the reasoning. Sections 7 to 9 are for pasting into Claude Code. Section 10 is a glossary.

---

## 1. Problem

Two distinct problems. The second one has no solution today:

1. Articles saved for later never get read, and the links get lost.
2. Passages worth keeping have nowhere to live with their source attached.

Pocket solved the first one halfway and shut down in July 2025.

**Why halfway:** Pocket was an archive, not a queue. It swallowed links well and never helped decide what to read, so the list grew faster than the reading and turned into accumulated guilt. Grifo has to be a queue.

## 2. Definition of success

Two sentences. If both are true, the product worked.

1. Whenever I have twenty free minutes, I know what to read in five seconds, without choosing.
2. I can find a passage I read three months ago in under thirty seconds, with the source one click away.

The first is the queue. The second is highlights plus search: thirty seconds does not survive three hundred items without content search. Everything else is means.

## 3. Alternative considered and rejected

**Karakeep** (formerly Hoarder), open source, covers nearly everything needed: links, notes, PDFs, nested folders, highlights with annotation, full-text search, mobile apps. Rejected for two reasons:

- It requires a machine running 24/7 to self-host, which I don't have, and that breaks the zero-cost constraint.
- The goal includes learning and building a portfolio, not only having the tool.

This goes in the README. Having evaluated the alternative and explained the refusal is what separates a decision from a preference.

## 4. Requirements

**The queue**
- Save a link, a PDF, or pasted text as a note
- See the list of what's pending
- Reorder by dragging, in my own priority order
- Mark as read, which removes it from the queue without deleting anything

**Highlights**
- Select a passage and keep it, with an optional note
- One page with every highlight from everything, each linked back to its source
- Marking an item as read never removes its highlights

**Search**
- Search content, not just titles
- Covers articles, notes and highlights in one result set
- Also search by author and by source site
- Ranked by relevance, showing the snippet where the term appeared
- Works with or without accents, indifferently
- Works in Portuguese, English, and any language written with spaces between words

**Everything else**
- Folders with subfolders
- Works on desktop and mobile
- Single user
- Zero infrastructure cost

**Deliberately out of scope:** multiple users, sharing, AI auto-tagging, offline reading.

## 5. Product decisions

**Drag to prioritize, don't label.**

The reflex is priority levels (high, medium, low). Not doing it. Labels force classification on the way in, and work on the way in is what makes people abandon a tool. Labels also collapse: nothing is high once thirty things are high.

Dragging is one concept instead of two, and order carries real information: "first" means something.

The real counterpoint: nobody drags two hundred items. So new items land on top by date automatically, only the first few get reordered when it matters, and the rest stays chronological untouched. If labels turn out to be missed after real use, add them. Adding is easier than removing.

**Extract the text at save time.**

Saving a link doesn't store just the address. Grifo fetches the page, discards nav, ads and footer, and stores the clean article in our own database.

This buys three things at once: the link can never rot, highlighting becomes possible because the text is ours, and content search becomes possible for the same reason.

This is the decision the project rests on. Without it, this is a bookmark manager.

**Multi-language and stemming are the same decision, and multi-language wins.**

The search engine has two modes. `unicode61` splits text on whitespace and punctuation and is language-indifferent: it behaves the same in Portuguese, English, Spanish, French, German. `porter` adds stemming, making "running" find "run", but it only exists for English and degrades everything else.

Since the requirement is any language, `porter` is out. That's why "gestão" won't find "gestões": not a bug, the price of being language-agnostic, and worth paying.

The mitigation is prefix search, which is also language-agnostic: `gest*` finds gestão, gestões, gestor. The UI appends the `*` to the last word itself, so it's never typed.

Honest limit: languages without spaces between words (Chinese, Japanese, Korean, Thai) won't work without extra effort. Probably irrelevant here, but recorded.

**Typo tolerance: not now, and for a reason, not out of laziness.**

It isn't very hard. Three tiers:

1. Prefix, which we get for free. Fixes truncated words, not transposed letters.
2. "Did you mean": D1 exposes the vocabulary of the index via `fts5vocab`. When a search returns zero results, compare the query against that list and suggest the nearest word. Half a day, about sixty lines.
3. Semantic search with embeddings. Far more complex.

Why not now: I'll be searching text I read myself, typing one or two words I remember. A typo in that scenario is self-evident, because it returns zero results and I retype in two seconds. What will actually frustrate me is different: searching "contratação" when the article said "recrutamento". That's a synonym problem, and typo tolerance does nothing for synonyms. Different medicines for different diseases.

So: use search for two weeks and look at the queries that returned nothing. If they're typos, build tier 2, which is cheap. If they're synonyms, the remedy is embeddings. Building now is betting on which, with no data.

**Search covers highlights, not just articles.**

If it only searched article text, you'd find the article and then have to hunt for the passage inside it again. Searching highlights directly is what closes the thirty seconds in success criterion 2.

**No database triggers: the Worker maintains the search index.**

The natural design would be for the database to update the search index itself, via triggers, so nobody can forget. Not possible: remote D1 does not reliably accept `CREATE TRIGGER`. Known bug, open since 2023, returns `incomplete input: SQLITE_ERROR`.

So the Worker updates the index in the same place it writes the item.

The cost is real: if some code path forgets to update, search goes stale silently, which is the worst kind of bug. Two things contain it. The Worker is the only writer to this database, so there is no other path to forget through. And `/api/reindex` rebuilds the entire index from the articles, because the index is derived and never the source of truth. If it drifts, press the button.

**Searching by author and site is nearly free.**

Just include `author` and `site_name` in the index. FTS5 has native column filters, so `author:silva` works with no extra code, and a site selector comes from a simple query. Ships in phase 3 with the rest.

**Search competes with folders, so it comes first.**

Folders are you predicting, at save time, which label you'll look under in three months. Search is you not having to predict anything. In practice, when search is good, the folder tree tends to become filing work nobody asked for.

So the phase order flipped: search is phase 3 and folders dropped to phase 5. The bet is that I get there and no longer want them. If I still do, I'll build them out of conviction rather than assumption.

**Search tables ship in the first migration, even though the screen comes in phase 3.**

Practical reason: adding the index later forces reprocessing everything already saved. Doing it now costs nothing. It's the only place in the project where plumbing goes ahead of use, and it's justified.

**PDF highlights are deliberately half-built.**

On a web page the text is structured, so a highlight can be repainted in the right place later. In a PDF the text is a set of coordinates, and repainting is far more expensive.

The cut: select a passage in a PDF and Grifo stores the text, the page and the note. Reopening the PDF shows no yellow marker. But the passage is in the highlights page and in search, linked to the file and the page. Most of the value for a fraction of the effort. The marker becomes an optional refinement later, if it still bothers me.

## 6. Phases

Each phase must be usable on its own. A personal project that only works at the end never reaches the end.

1. **The queue.** Save link with extraction, upload PDF, paste note. Drag-to-reorder list. Mark as read. Password-protected access. The search index is created here, with no screen.
2. **Reader and highlights.** Clean reading view, select text to highlight, aggregated highlights page linking back to sources.
3. **Search.** One field, unified results across articles, notes and highlights, ranked by relevance, with the matching snippet. Filter by author and site. Automatic prefix on the last word.
4. **PDF.** In-app viewing and passage capture with page number, per the cut above.
5. **Folders, if still missed.** Nested tree, move item, navigation.
6. **Quick capture.** Save from mobile via the share sheet, and from the browser via an extension.

Phase 1 is already a product: on its own it satisfies success criterion 1.

---

# For pasting into Claude Code

The three sections below are technical instructions.

## 7. Data model

D1 officially supports FTS5, per `developers.cloudflare.com/d1/sql-api/sql-statements/`.

Comments are omitted on purpose: the D1 dashboard console can receive this as a single line, and `--` would swallow everything after it. Explanations are in the notes below the block.

```sql
CREATE TABLE folders (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE TABLE items (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK (type IN ('link','pdf','note')), title TEXT NOT NULL, source_url TEXT, author TEXT, site_name TEXT, excerpt TEXT, content_html TEXT, content_text TEXT, word_count INTEGER, r2_key TEXT, file_size INTEGER, folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','read')), position REAL NOT NULL, progress REAL NOT NULL DEFAULT 0, extraction TEXT NOT NULL DEFAULT 'pending' CHECK (extraction IN ('pending','ok','failed','skipped')), extraction_error TEXT, saved_at INTEGER NOT NULL DEFAULT (unixepoch()), read_at INTEGER);
CREATE INDEX idx_items_queue ON items(status, position DESC);
CREATE INDEX idx_items_folder ON items(folder_id);
CREATE TABLE highlights (id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE, text TEXT NOT NULL, prefix TEXT, suffix TEXT, page_number INTEGER, color TEXT NOT NULL DEFAULT 'yellow', note TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
CREATE INDEX idx_highlights_item ON highlights(item_id, created_at DESC);
CREATE VIRTUAL TABLE items_fts USING fts5(item_id UNINDEXED, title, author, site_name, content_text, tokenize = "unicode61 remove_diacritics 2", prefix = '2 3');
CREATE VIRTUAL TABLE highlights_fts USING fts5(highlight_id UNINDEXED, item_id UNINDEXED, text, note, tokenize = "unicode61 remove_diacritics 2", prefix = '2 3');
```

**Column notes.**
- `items.content_html`: Readability output for links, rendered HTML for notes.
- `items.content_text`: plain text, feeds search.
- `items.r2_key`: only for `type='pdf'`.
- `highlights.prefix` / `suffix`: about 32 characters before and after the passage.
- `highlights.page_number`: PDF only.

**On `position`:** REAL, not INTEGER, on purpose. This allows fractional indexing: to move an item between neighbors at 3 and 4, write 3.5, without rewriting the whole list. New items enter at `position = unixepoch()`, so they land on top with no user action.

**On `status`:** only two states, `queued` and `read`. Marking as read moves the item out of the queue and never touches `highlights`.

**On the FTS tokenizer:** `remove_diacritics 2` is mandatory. Without it, "estrategia" won't find "estratégia" and half of all Portuguese searches fail silently. Never use `porter`: English-only, and the requirement is multi-language. `prefix='2 3'` makes prefix search (`gest*`) fast, which is the language-agnostic mitigation for the absence of stemming.

**On search sync:** no triggers. Remote D1 doesn't reliably accept `CREATE TRIGGER`. The Worker keeps `items_fts` and `highlights_fts` in sync at every write. `/api/reindex` rebuilds them from scratch. The `_fts` tables are derived, never the source of truth.

**Known search limitations, for the README:**
- No stemming, because `porter` is English-only and the requirement is multi-language. "gestão" won't find "gestões". Mitigated by prefix search, which the UI appends to the last word automatically.
- Languages without spaces between words (Chinese, Japanese, Korean, Thai) are not indexed correctly by `unicode61`.
- Exact word matching: no typo tolerance, no synonyms. See section 5 for why this waits and how to measure whether it's worth it.
- D1 cannot export a database containing virtual tables. To back up: drop the `_fts` tables, export, recreate. Document this, because losing data is literally the problem this app exists to solve.

## 8. Scaffolding prompt

Paste into Claude Code with this file saved as `SPEC.md` in the repository.

> Let's build phase 1 of Grifo, a personal read-later app. The spec is in `SPEC.md`, read it before starting. I'm not very technical, so explain your decisions to me in simple Portuguese as you go. All code, comments, and repository files must be in English.
>
> Required stack: Cloudflare Workers with Hono for the API, D1 for the database with plain SQL and no ORM, R2 for files, React with Vite and Tailwind for the frontend served as static assets from the same Worker. TypeScript. Managed by wrangler.
>
> Scope for this phase, and nothing beyond:
> - `POST /api/items` accepting `{type:'link', url}`, `{type:'note', title, text}`, or a multipart PDF upload
> - For `type=link`: fetch the URL and extract with `@mozilla/readability` over `linkedom`. Important: `jsdom` does NOT run on Cloudflare Workers, use `linkedom`. Populate title, author, site_name, excerpt, content_html, content_text, word_count. On extraction failure, save the item anyway with `extraction='failed'` and the error recorded. Never lose a link because extraction failed.
> - For `type=pdf`: upload to R2, store the key in `r2_key`, `extraction='skipped'`
> - `GET /api/items?status=queued` ordered by `position DESC`
> - `PATCH /api/items/:id` to mark as read and to reorder
> - `POST /api/items/:id/move` receiving neighbor ids and computing the new `position` by averaging
> - `POST /api/reindex` that clears and rebuilds `items_fts` and `highlights_fts` from `items` and `highlights`
> - Every write to `items` must update `items_fts` in the same flow. Do not use triggers, remote D1 does not support them reliably.
> - Frontend: a single screen. URL paste field at the top, PDF upload button, new note button. Drag-and-drop list to reorder. Each item shows title, site, estimated reading time and date. Mark as read and delete buttons.
>
> Use the exact schema from section 7 of the spec, in full, as a migration at `migrations/0001_init.sql`. Do not invent columns.
>
> Before writing any code, show me the proposed file structure and the `wrangler.toml`, and wait for my confirmation.
>
> Do not implement authentication, Cloudflare Access handles that. Do not implement folders, highlights or the search screen, those are later phases.

## 9. CLAUDE.md

Create at the repository root. Claude Code reads it automatically every session, which saves context and money.

```markdown
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
```

---

## 10. Glossary

**Cloudflare** — internet infrastructure company. Grifo uses four of its services, all with generous permanent free tiers.

**Worker** — the program that runs on Cloudflare's servers and responds when someone opens the site. The brain of the app. Free up to 100k requests per day.

**D1** — Cloudflare's database, holding articles, folders and highlights. Free up to 5 GB.

**R2** — file storage, holding the PDFs. Free up to 10 GB.

**Cloudflare Access** — the password-protected front door. Free, and it removes the need to write a login screen, which is the easiest thing to get wrong.

**Hono** — the library organizing "when someone requests X, respond Y".

**React** — the library building the visual interface. Industry standard.

**Vite** — the tool packaging React into files a browser understands.

**Tailwind** — a way to write visual style (colors, spacing) directly in the screen code.

**TypeScript** — JavaScript with type checking. Catches silly errors before running, which matters more when an AI is writing.

**PWA** — a site the phone lets you install like an app, with a home screen icon. Covers desktop and mobile without an app store.

**API** — the set of entry points into the program. `POST /api/items` means "the door that receives a new item".

**Readability** — the code Mozilla uses for Firefox's reader mode, released as a standalone library. Takes a messy page and returns just the article. Runs on the server, not in the browser, so the reader's choice of browser is irrelevant.

**linkedom** — helper Readability needs to work inside a Worker. The more famous alternative, `jsdom`, does NOT work there. That trap costs hours.

**PDF.js** — the code Mozilla uses to display PDFs in Firefox, also a standalone library. Works in Chrome identically.

**wrangler** — the command-line tool that publishes to Cloudflare. Grifo uses Workers Builds instead, so this is mostly not needed.

**Migration** — a file that creates or alters database tables. Versioned, so the database can be rebuilt from scratch.

**ORM** — a layer translating database to code. Deliberately skipped: it adds magic and the project is too small to pay for it.

**Schema** — the database blueprint: which tables exist and what fields each has.

**Index** — a shortcut the database uses to find things fast, like the index at the back of a book.

**FTS5** — the search engine built into SQLite, and therefore into D1. Instead of reading every article looking for a word, it keeps a list of "this word appears in these documents". It makes full-text search instant with no external service.

**Virtual table** — where FTS5 stores that index. "Virtual" because it isn't your data, it's derived. If deleted, it can be rebuilt from the articles.

**Tokenizer** — the rule for chopping text into words for the index. `remove_diacritics 2` makes accents optional, so "estratégia" and "estrategia" become the same thing.

**Stemming** — reducing a word to its root, so "gestão" finds "gestões". FTS5 does this for English only. Limitation accepted, worked around with prefix search.

**Prefix search** — searching by part of a word, writing `gest*` to find gestão, gestor and gestões. How Grifo compensates for the absence of stemming without depending on language.

**fts5vocab** — an FTS5 feature, supported in D1, exposing every word present in the index. The raw material for a "did you mean", since it allows comparing what was typed against what actually exists.

**Levenshtein distance** — counts how many letters must change to turn one word into another. "gsetão" and "gestão" are distance 2. The math behind typo suggestions.

**Embeddings** — turning text into numbers representing meaning, which allows finding "recrutamento" when you searched "contratação". Solves synonyms, a different problem from typos.

**BM25** — the algorithm FTS5 uses to rank by relevance rather than date. Accounts for term frequency and document length.

**Trigger** — an automatic database rule: "whenever an article is saved, update the search index". Deliberately not used here, because remote D1 doesn't support it reliably.

**DOM** — the tree structure of a web page. What allows saying "the third paragraph inside this section".

**Anchoring by quote, prefix and suffix** — remembering where a highlight was by storing its text plus a bit of what came before and after, instead of storing a position. Positions break when the page changes. Quote and context survive.

**ADR** — a short record of an architecture decision: what was decided, what the options were, and why. One file per decision. This is what makes the repository work as a portfolio.

---

## 11. Portfolio hygiene

The repository is the deliverable, not the app. A recruiter won't run the software, they'll read the README in ninety seconds.

- README with the problem, the rejected alternative and why, the product decisions, and the deliberate cuts. GIF or screenshot at the top.
- `docs/decisions/` with short ADRs, written at the moment of the decision rather than reconstructed. Five paragraphs maximum each.
- Commits telling the story by phase, not one "initial commit" with 4,000 lines.
- An honest "what doesn't work yet" section. Nobody believes a portfolio with no declared limitations.
