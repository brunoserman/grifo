# Grifo

**A read-later queue with Kindle-style highlights. Save links, PDFs and notes, keep the passages that matter, find them again. Runs free on Cloudflare Workers.**

<!-- TODO: substituir por um GIF de 10 segundos mostrando salvar um link, arrastar na fila e grifar um trecho -->

---

## The problem

I save a lot of articles. I read almost none of them. Then I lose the links.

When I do read something and find a passage worth keeping, there is nowhere to put it. So I keep the article and lose the sentence, which is backwards: the sentence was the point.

Pocket solved the first half of this and shut down in July 2025. But it only ever solved half, and the half it solved was the easier one.

**Pocket was an archive, not a queue.** It was excellent at swallowing links and useless at telling me what to read next. So the list grew faster than my reading and turned into a pile of guilt. Any replacement that gets this wrong reproduces the original problem with new colors.

Grifo is a queue that happens to archive, not an archive that happens to have a list.

## Definition of success

Two sentences. If both are true, the product worked.

1. Whenever I have twenty free minutes, I know what to read in five seconds, without choosing.
2. I can find a passage I read three months ago in under thirty seconds, with the source one click away.

The first is the queue. The second is highlights plus search. Everything else is means.

## Why I didn't just use Karakeep

[Karakeep](https://karakeep.app) (formerly Hoarder) is open source and covers nearly every requirement here: links, notes, PDFs, nested folders, highlights with annotations, full-text search, mobile apps. It is a good piece of software and it was the honest first answer.

I rejected it for two reasons:

- **It needs a machine.** Self-hosting requires a server running 24/7. I don't have one, and I wasn't going to run a personal project on a work laptop I'm about to hand back. That breaks the zero-cost constraint.
- **The point isn't only to have the tool.** I work in Product and I wanted to build something end to end, and to have the reasoning be visible.

If you have a spare machine and just want the problem solved, use Karakeep. That is a sincere recommendation, not a disclaimer.

## What it does

**The queue**
- Save a link, a PDF, or pasted text as a note
- Reorder the list by dragging, in whatever priority is true today
- Mark as read, which removes it from the queue and deletes nothing

**Highlights**
- Select a passage, optionally annotate it
- One page with every highlight from everything, each linked back to its source
- Marking an item as read never touches its highlights

**Search**
- Searches content, not just titles
- Covers articles, notes and highlights in one result set
- Filter by author or by site
- Accent-insensitive, and language-agnostic

## Design decisions

These are the choices that shaped the thing. Each one has a cost I accepted on purpose.

### Drag to prioritize. No labels.

The reflex is priority levels: high, medium, low. I didn't build them.

Labels force you to classify every item on the way in, and work on the way in is what makes people abandon a tool. Labels also collapse: nothing is high priority once thirty things are high priority. Order carries real information, because "first" means something.

**The cost, which is real:** nobody drags two hundred items. So new items land on top by date automatically and I only reorder the first few when I care. The rest stays chronological, untouched. If labels turn out to be missed after real use, they get added. Adding is easier than removing.

### Extract the text at save time

Saving a link doesn't store a URL. It fetches the page, strips the nav and the ads and the footer, and stores the clean article in my own database.

This is the decision the whole project rests on. It buys three things at once: the link can never rot, I can highlight because the text is now mine, and I can search inside the content for the same reason. Without it, this is a bookmark manager.

### Search comes before folders

Folders are you predicting, at save time, which label you'll look under in three months. Search is you not having to predict anything.

So search is phase 3 and folders dropped to phase 5. The bet is that I get there and no longer want them. If I still do, I'll build them out of conviction rather than assumption.

### No stemming, because multi-language wins

The search engine can add stemming, which makes "running" find "run". It only exists for English and it degrades everything else.

Since the requirement is any language, stemming is out. That's why "gestão" won't find "gestões". Not a bug: the price of being language-agnostic, and worth it. Mitigated by prefix search, which is language-agnostic, and the UI appends the wildcard itself.

### PDF highlights, deliberately half-built

On a web page the text is structured, so a highlight can be repainted in the right place later. In a PDF the text is a set of coordinates, and repainting is far more expensive.

The cut: select a passage in a PDF and Grifo stores the text, the page number and your note. Reopen the PDF and there's no yellow marker. But the passage is in your highlights and in your search, linked to the file and the page. That's most of the value for a fraction of the work. The marker is an optional refinement, later, if it still bothers me.

### No typo tolerance yet, and that's a measurement, not laziness

It isn't hard. When a search returns nothing, compare the query against the vocabulary of the index and suggest the nearest word. Half a day of work.

I'm not building it because I'll be searching text I read myself, typing one or two words I remember. A typo there is self-evident: zero results, retype, two seconds. The failure that will actually hurt is searching "contratação" when the article said "recrutamento", and spell correction does nothing for synonyms. Those are different medicines for different diseases.

So: use search for two weeks, look at the queries that returned nothing, and see which disease I actually have.

## What doesn't work yet

- Phase 1 is what exists. See the roadmap below.
- No typo tolerance and no synonyms. Exact word matching only.
- No stemming, per the decision above.
- Languages without spaces between words (Chinese, Japanese, Korean, Thai) are not indexed correctly.
- PDF highlights have no persistent marker in the document.
- Cloudflare D1 can't export a database that has full-text search tables in it. Backups require dropping the search tables, exporting, and recreating them. Documented because losing data is literally the problem this app exists to solve.

## Architecture

| Piece | Choice | Why |
|---|---|---|
| Hosting | Cloudflare Workers | 100k requests/day free, no sleep on inactivity |
| Database | D1 (SQLite) | 5 GB free, plain SQL, no ORM |
| Files | R2 | 10 GB free, no egress fees |
| API | Hono | Standard on Workers, small |
| Frontend | React + Vite + Tailwind, served by the same Worker | One PWA covers desktop and mobile, no app store |
| Auth | Cloudflare Access | Free, and I don't write a login screen |
| Extraction | Mozilla Readability over linkedom | `jsdom` does not run on Workers. This cost me nothing only because I found out first |
| Search | SQLite FTS5, `unicode61 remove_diacritics 2` | No external search service, no cost |

Three tables: `items`, `folders`, `highlights`. Folders nest through a self-referencing `parent_id`. Queue order is a `REAL` column so an item can be dropped between two neighbors by averaging their positions, without rewriting the list.

Highlights are anchored by quote plus surrounding context, in the spirit of the W3C Web Annotation model, never by DOM position. DOM positions break the first time the page is re-extracted.

Full spec and reasoning: [`read-later-spec.md`](./read-later-spec.md).

## Cost

Zero. Not "free tier for now" zero, but zero: single user, on free tiers with no expiry, no card on file. The only optional cost would be a custom domain, and it isn't needed since Cloudflare Access protects the `workers.dev` address directly.

## Roadmap

- [ ] **1. The queue.** Save with extraction, upload PDFs, paste notes. Drag to reorder. Mark as read.
- [ ] **2. Reader and highlights.** Clean reading view, select to highlight, aggregated highlights page.
- [ ] **3. Search.** Unified results across articles, notes and highlights. Filter by author and site.
- [ ] **4. PDF.** In-app viewing and passage capture with page numbers.
- [ ] **5. Folders, if I still miss them.**
- [ ] **6. Quick capture.** iOS Shortcut, browser extension, Android share target.

Each phase is usable on its own. Phase 1 alone satisfies success criterion 1.

## About the name

*Grifar* is the Portuguese verb for marking a passage in a text. **"Grifo meu"** is a set phrase in Portuguese academic and legal writing that means, roughly: this is someone else's words, the source is credited, and the emphasis is mine.

That's the entire product in two words the language already had.

A *grifo* is also the griffin of myth, whose job was guarding accumulated treasure. Which is the other half.

## Built with Claude Code

I'm a Product person, not an engineer. This was built with Claude Code, and the interesting artifact here isn't the code. It's the decision record: what was considered, what was rejected, what was cut and why.

Decisions live in [`docs/decisions/`](./docs/decisions), written as they were made rather than reconstructed afterwards.

## License

MIT. See [LICENSE](./LICENSE).
