# AI Reflection: Kota, Neil, and Aryan

## Context

Our contribution focused on the investor-facing research experience: ESG analytics, grounded company research, watchlists, news signals, market data, production hosting, and documentation. AI was most valuable when it accelerated the transition from a broad feature request to a narrow, testable engineering task. It was less valuable when treated as an authority about the repository or a live service, so we used code, tests, logs, and endpoint responses as the final source of truth.

## Where AI Added Value

### Converting a broad product idea into concrete flows

The project combines several concepts that can become vague quickly: ESG scoring, controversy risk, AI adoption, financial momentum, alerts, and an investor copilot. AI helped organize those ideas into roles, use cases, route contracts, and edge cases. This directly informed the documented flows for searching companies, comparing companies, uploading reports, creating signals, managing a watchlist, and receiving alerts.

The practical value was structure rather than novelty. The generated outline helped ensure that every visible feature had an actor, entry point, data source, and failure behavior. We still checked the outline against the actual frontend pages and Node routes before documenting a feature as implemented.

### Narrowing production debugging

The strongest use of AI was hypothesis formation during hosting work. When the deployed frontend appeared empty despite a populated database, the important distinction was between a missing-data problem and a browser session problem. AI suggested a falsifiable explanation: authenticated cross-site requests from Vercel to Render were not consistently carrying the HTTP-only session cookie in the browser context.

That hypothesis was cheap to test. We signed in again through the production frontend, inspected API behavior, and compared it with direct requests. The selected fix, a Vercel same-origin `/api` rewrite, was deliberately small. It preserved the existing session model and avoided exposing access tokens in browser storage. After the change, the dashboard returned the expected ESG values, companies, prices, and signals.

### Improving the scope of a market-data fix

AI helped isolate a specific, non-obvious data issue: a generic period-to-hyphen ticker conversion made the Singapore ticker `Z74.SI` invalid for Yahoo Finance. The useful contribution was not merely noticing the exception; it was framing a general constraint. A correct solution needed to preserve recognized exchange suffixes while keeping existing normalization for tickers where Yahoo expects a hyphen.

We then verified that condition locally and in production. The deployment returned a real SGD quote and history for `Z74.SI`. This was a good example of AI accelerating reasoning while validation determined whether the reasoning was correct.

### Creating auditable documentation

AI also made documentation more complete and consistent. It helped group implementation evidence into a readable description of use cases, analytics, watchlist behavior, hosting configuration, and AI boundaries. We did not use it to invent product claims. For example, we documented that unavailable quotes remain unavailable rather than claiming every catalog company has a live market price.

## Changes We Made to AI Suggestions

We modified or rejected several categories of suggestions:

1. We did not treat CORS alone as the full hosting fix. The relevant issue was browser cookie context, so we chose a same-origin proxy rather than merely broadening CORS settings.
2. We did not add a hard-coded Singapore-only exception. We implemented suffix-aware normalization to cover multiple international exchanges.
3. We did not reseed or delete the production database when the dashboard looked empty. Counts, signals, and score snapshots were checked first; the data existed.
4. We did not store Telegram credentials in source files, commits, or documentation. They were configured as encrypted Render environment variables and validated without printing the token.
5. We did not label private or unsupported instruments as live-priced. The user interface and API preserve no-data states where the market provider has no valid quote.

These changes were necessary because a plausible answer is not the same as a safe or correct implementation. Existing architecture, browser behavior, provider constraints, and test results set the boundary for acceptance.

## Limitations and Risks

AI cannot independently verify a deployment, market quote, database state, or external credential. It can propose steps, but the team must run the checks. We also recognize that live prices are provider-dependent, scheduled jobs require a continuously running backend, and Telegram polling permits only one active `getUpdates` worker for a bot token. These operational constraints were documented and validated in the deployed service.

The project uses a data-driven research interface, not investment advice. Scores and generated interpretations should be reviewed alongside source evidence, uncertainty, and current market conditions.

## What We Learned

The main lesson was to use AI as a fast collaborator for decomposition and hypothesis testing, then require evidence before changing shared or production-facing behavior. The most reliable workflow was:

1. Identify the nearest controlling code path.
2. State a small, falsifiable hypothesis.
3. Make the smallest reversible change.
4. Run a focused validation before widening scope.
5. Document what was verified separately from what was proposed.

This approach made the work faster without allowing AI-generated confidence to replace engineering judgment.