# 9. Mobile reading is a dedicated screen, not a modal

**Status:** accepted, revises the original spec

## Context

The spec described the reading view as a modal. In real use on Android the modal was cramped and hard to read, and the extracted text, though complete, was poorly styled: no column width limit, tight spacing, unstyled headings.

## Decision

On mobile, replace the modal with a dedicated full-screen reading route with its own URL and a visible back control, so the browser's back gesture also returns to the list. Desktop keeps the modal. Separately, style the reading view as a proper reader: a single centered column around 65-70 characters wide, line-height ~1.6, clear paragraph spacing, and styled headings, lists, blockquotes and images.

## Consequences

A decision reversed by usage, not by argument: the modal read fine in the spec and badly in the hand. This is the most valuable kind of entry in this log, because it could only be found by using the thing. Formatting was pure CSS on the reading view; extraction was untouched, since the text was arriving complete and only looked bad.
