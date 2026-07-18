# 2. Drag to prioritize, not priority labels

**Status:** accepted

## Context

Pocket failed as an archive that never helped decide what to read next. Grifo has to be a queue. The obvious way to prioritize is labels: high, medium, low.

## Decision

No labels. Reorder by dragging. Labels force classification on the way in, and work on the way in is what makes people abandon a tool. Labels also collapse, because nothing is high once thirty things are high. Order carries real information: "first" means something.

## Consequences

Nobody drags two hundred items, so new items land on top by date automatically and only the first few get reordered by hand. `position` is stored as a REAL, allowing an item to be dropped between two neighbors by averaging their positions without rewriting the list. If labels turn out to be missed after real use, they can be added; adding is easier than removing.
