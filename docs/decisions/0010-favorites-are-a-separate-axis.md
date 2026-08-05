# 10. Favorites are a separate axis from the queue

**Status:** accepted

## Context

The queue orders what to read next, by drag priority, over unread items. After two weeks of real use, a different need surfaced: reaching the read items I liked most, easily, later. The queue can't serve this, because it's about unread reading order, and a favorite is usually something already read.

## Decision

Add a favorite toggle to any item, links and notes alike, and a Favorites view listing all favorited items regardless of read/unread status. Favorites is independent of the queue and of drag order. It is not a second priority system; it's a shortcut to a small set of items worth returning to.

## Consequences

Two axes that don't compete: the queue answers "what do I read now", favorites answers "where's that good thing again". This was deliberately not built up front. It earned its place only when usage showed the queue couldn't cover it, which is the right threshold for adding an organizing feature.
