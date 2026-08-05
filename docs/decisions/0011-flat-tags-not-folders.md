# 11. Flat tags, not folders

**Status:** accepted, refines ADR 3

## Context

Folders were deferred (ADR 3) on the bet that good search makes manual organization unnecessary. After two weeks, a real need appeared: grouping items by theme (AI, product management, gestão) to find them by topic later. This is the folders question returning, and now there's usage to judge it against.

## Decision

Add flat, freeform tags: type one or more tags on any item, then filter the list by tag. Flat means no nesting, no hierarchy, not folders. Tags differ from search in one way that justifies them: search finds what the text says, while a tag finds what I decided belongs to a theme even when the word never appears (a piece on prioritization can be "product management" without using the term).

## Consequences

The theme grouping the user wanted, without the heavy nested-folder system that was deferred. The cost is manual tagging on the way in, the exact friction ADR 2 warned about with priority labels; accepted here because the recall need is real and search alone missed the "belongs to a theme but doesn't say it" case. If flat tags later prove insufficient, hierarchy can be reconsidered, again with usage in hand rather than up front.
