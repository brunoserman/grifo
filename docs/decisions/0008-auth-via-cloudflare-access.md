# 8. Authentication via Cloudflare Access, no password

**Status:** accepted

## Context

The app needs to be private to one person. Writing a login screen is the easiest security thing to get wrong, so it was pushed to the edge with Cloudflare Access from the start.

## Decision

Cloudflare Access guards both the production and preview `workers.dev` URLs, so no custom domain is needed. Access stores no password by design: it either emails a one-time code or delegates to an identity provider. Google was added as that provider so login is one click with an already-signed-in browser, and the global session was set to one month so it rarely prompts.

## Consequences

"I want a password" isn't available, but Google sign-in plus a one-month session gets closer to the actual goal (don't ask me every time) than a password would. Connecting Google was two-sided and easy to half-finish: creating the provider in Zero Trust is separate from allowing it on the application's policy, and the Google Cloud client secret only appears if you click into the credential after creating it. Enabling Access must happen before saving anything, since until then the URL is open to the internet.
