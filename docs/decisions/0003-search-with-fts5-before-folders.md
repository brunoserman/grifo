# 3. Search with FTS5, before folders, multi-language over stemming

**Status:** accepted

## Context

Finding a passage read months ago is one of the two success criteria, and it doesn't survive a few hundred items without content search. Folders were originally planned before search.

## Decision

Use SQLite FTS5, built into D1, with no external search service. Ship search before folders: folders are you predicting at save time which label you'll look under later, while search is not having to predict. Use the `unicode61` tokenizer, not `porter`: `porter` adds stemming but is English-only and degrades every other language, and the requirement is multi-language. `remove_diacritics 2` makes accents optional so Portuguese searches don't fail silently.

## Consequences

"gestão" won't find "gestões", because that flexion needs stemming we deliberately gave up. Mitigated with prefix search (`gest*`), which the UI appends automatically and which is language-agnostic. Folders dropped to a later phase on the bet that good search makes them unnecessary. Typo tolerance and synonyms are explicitly deferred until real usage shows which one actually matters.
