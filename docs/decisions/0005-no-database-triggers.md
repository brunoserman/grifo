# 5. No database triggers; the Worker syncs the search index

**Status:** accepted, supersedes an earlier draft

## Context

The search index (`items_fts`, `highlights_fts`) must stay in sync with the source tables. The clean design is database triggers, so nobody can forget. This was the original rule in the spec.

## Decision

No triggers. Remote D1 does not reliably accept `CREATE TRIGGER`; the dashboard console splits statements on `;` and a trigger body contains semicolons, producing `incomplete input: SQLITE_ERROR`. The Worker updates the index in the same code path that writes the item.

## Consequences

The right decision in theory was wrong here, because it depended on a feature the platform doesn't support. The cost of moving sync into the app is that a forgotten code path could leave search stale silently. Contained two ways: the Worker is the only writer to this database, and `/api/reindex` rebuilds the index from scratch, since it's derived and never the source of truth. This is the clearest example of the repo's pattern: decided X for the right reason, reality said no, moved to Y and recorded the cost.
