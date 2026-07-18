# 4. Zero-cost Cloudflare stack, deployed from GitHub

**Status:** accepted

## Context

Constraint: no hosting cost, and no local machine, since the project started on a work laptop about to be returned. Karakeep, the mature open-source alternative, was rejected because self-hosting needs a machine running 24/7.

## Decision

Everything on Cloudflare free tiers: Workers for the API, D1 for the database, R2 for files, all served from one Worker. Auth is Cloudflare Access, so no login screen is written. Claude Code on the web writes to GitHub; Cloudflare Workers Builds deploys on push to main. No terminal, no credentials on the returned laptop.

## Consequences

`wrangler` is intentionally absent from the Claude Code environment, because cloud sessions have no secrets store and a token there would be exposed. Its absence confused the agent, which flagged it as a blocker; it isn't (see CLAUDE.md). Cost is genuinely zero, not free-trial zero, for a single user well within all free limits.
