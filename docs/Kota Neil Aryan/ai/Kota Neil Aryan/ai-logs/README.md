# AI Usage Log: Kota, Neil, and Aryan

## Purpose and Scope

This log records the AI-assisted work completed for the ESG Momentum Engine by the Kota/Neil/Aryan documentation area. It is a concise reconstruction based on the implemented repository, project documentation, validation results, and deployment activity. Prompts are summarized where an exact transcript was not retained. No AI output was accepted without reviewing it against the codebase and the product requirements.

## Phase 1: Requirements and Feature Mapping

### Goal

Translate the investor-research brief into implementable application flows and make the expected behavior auditable.

### Prompt / Request

"Map the ESG research platform requirements into user roles, use cases, routes, and edge cases. Cover company discovery, comparison, report uploads, scoring, watchlists, market charts, alerts, and an evidence-grounded copilot."

### AI-Assisted Output

- A structured use-case outline with visitor, authenticated investor, administrator, and API consumer roles.
- Suggested user flows for company search, report processing, signal generation, portfolios, watchlists, and alert delivery.
- Edge-case expectations for missing companies, invalid uploads, absent score history, mock AI mode, expired sessions, and authorization failures.

### Human Review and Decision

- The team retained only behavior that matched existing Node routes and frontend screens.
- The team documented the frontend API proxy as part of the dashboard flow because hosted authentication depends on it.
- The team explicitly rejected fabricated values for unavailable market data or score history; the API returns `null` or an empty result instead.

### Evidence

- `use-cases.md` documents UC-001 through UC-010, the main user flows, and expected edge cases.
- Implemented route areas include `/companies`, `/dashboard`, `/account`, `/portfolios`, `/alerts`, and `/news`.

## Phase 2: ESG Analytics and Research Design

### Goal

Define how the application combines ESG, momentum, AI-adoption, controversy, evidence, and market context without presenting unsupported investment advice.

### Prompt / Request

"Propose a research workflow that lets investors inspect ESG movement and risk, compare companies, and ask evidence-grounded questions while separating stored facts from generated interpretation."

### AI-Assisted Output

- A score-oriented research model combining environmental, social, governance, AI-adoption, controversy, confidence, and momentum dimensions.
- A company-copilot pattern that uses stored reports, extracted evidence, signals, and the latest score snapshot as context.
- Candidate analytics for trend slope, momentum acceleration, downside risk, risk-adjusted momentum, signal quality, and evidence coverage.

### Human Review and Decision

- The team kept the copilot grounded in persisted application data rather than treating it as an independent source of facts.
- The watchlist was designed as a comparison workspace, not a recommendation engine.
- The team chose to expose both score and risk context so a positive momentum value cannot be read in isolation.

### Evidence

- `my-ai.md` describes the grounded copilot, scheduled signal classification, and quantitative analytics.
- The company detail flow exposes ESG, momentum, AI-adoption, controversy, evidence, and score-history information.

## Phase 3: Watchlist, News, and Notification Workflows

### Goal

Turn saved companies into a useful investor workspace and connect new research signals to notification channels.

### Prompt / Request

"Design a watchlist that merges the user’s saved companies with one-day quote data and ESG snapshots. Identify the derived indicators, route calls, and notification behavior needed for a practical workflow."

### AI-Assisted Output

- A data-flow proposal: fetch the authenticated watchlist, retrieve per-company market data, merge the latest score snapshot, and derive aggregate indicators.
- Suggested metrics: average ESG score, average momentum, average available daily price move, and high-controversy count.
- A notification event for a newly tracked company, delivered through in-app, email, and Telegram channels when enabled.

### Human Review and Decision

- The team used authenticated account endpoints for watchlist mutations and avoided duplicating company data in the client.
- Re-adding an existing company was made idempotent so it does not create duplicate notification events.
- Quote-dependent aggregates intentionally exclude unavailable quotes instead of substituting placeholder prices.

### Evidence

- `system.md` documents the watchlist data flow, analytics, and idempotent notification integration.
- `use-cases.md` documents the investor watchlist and 15-minute RSS signal ingestion flows.

## Phase 4: Production Hosting and Session Reliability

### Goal

Deploy the frontend and backend while preserving authenticated browser sessions and persistent SQLite data.

### Prompt / Request

"Diagnose why a hosted Vercel frontend can show an empty authenticated dashboard when it calls a Render API directly. Recommend the smallest production-safe fix compatible with HTTP-only sessions."

### AI-Assisted Output

- Identified that direct cross-site cookie behavior is unreliable in browser privacy contexts even when CORS is configured.
- Recommended a same-origin Vercel rewrite from `/api/*` to the Render backend.
- Recommended keeping `VITE_API_URL=/api` in production so Axios requests remain first-party from the browser’s perspective.

### Human Review and Decision

- The team adopted the Vercel proxy because it solves the session boundary without weakening cookie security or moving tokens into browser storage.
- The backend remained on Render Starter with a persistent disk because the project requires SQLite persistence, uploads, scheduled jobs, and WebSockets.
- The production database was not cleared or reseeded during the repair; counts and responses were checked first.

### Evidence

- `frontend/vercel.json` defines the `/api/:path*` rewrite.
- `frontend/src/api/client.ts` reads `VITE_API_URL` with `/api` as the hosted default.
- `hosting.md` records the Vercel and Render configuration.

## Phase 5: Market-Data Defect Investigation

### Goal

Restore a live Singapore quote without changing valid ticker formats for other exchanges.

### Prompt / Request

"Investigate why Singapore Telecommunications (`Z74.SI`) returns no quote. Verify the provider’s expected ticker and change only the normalization logic needed to preserve international suffixes."

### AI-Assisted Output

- Isolated the defect to converting every period to a hyphen, which changed `Z74.SI` into invalid `Z74-SI`.
- Proposed a suffix-aware normalizer that preserves known exchange suffixes such as `.SI`, `.AX`, `.TO`, `.L`, and `.HK` while retaining hyphen normalization where Yahoo expects it.

### Human Review and Decision

- The team accepted the focused normalizer because it corrects SGX and avoids a one-off special case.
- A local focused request confirmed the provider returned SGD 4.30 and 24 history points for `Z74.SI`.
- After deployment, the production endpoint returned `Z74.SI`, `currency: SGD`, `last_price: 4.3`, and daily OHLCV history.

### Evidence

- `backend-node/src/services/marketData.js` contains the suffix-preserving ticker logic.
- Commit `2a269e1` records the production proxy and SGX ticker correction.

## Phase 6: Telegram Bot Deployment

### Goal

Enable the existing Telegram alert bot in production without placing credentials in source control.

### Prompt / Request

"Verify that Telegram polling is wired into application startup, configure the already available credentials as encrypted Render variables, and confirm the bot starts without exposing the token."

### AI-Assisted Output

- Confirmed `startTelegramBot()` is invoked during backend startup and uses `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`.
- Recommended adding these values only through Render’s encrypted environment-variable interface.
- Suggested validation through Telegram `getMe`, Render logs, and the public `/health` endpoint.

### Human Review and Decision

- The team retained the token outside Git and did not copy it into documentation.
- Telegram `getMe` authenticated the configured `@MatthewIco_bot` account.
- Render logs confirmed background jobs started and Telegram polling was enabled. A brief `getUpdates` conflict occurred during worker handover; no repeated conflict appeared after the old instance stopped.

### Evidence

- `backend-node/src/services/telegramBot.js` implements `/start` and `/id` handling plus polling.
- `backend-node/src/index.js` starts and stops the bot with the service lifecycle.

## Phase 7: Validation and Documentation

### Goal

Confirm that the built system, public hosting, and user-facing documentation agree.

### Checks Performed

| Check | Result | Decision |
|---|---|---|
| Frontend production build | Passed | Deploy Vite output to Vercel. |
| Node unit tests | Passed | Retain current response/auth behavior. |
| Notification tests | Passed | Retain notification changes. |
| Python compilation | Passed | Preserve legacy backend sources without deploying them. |
| Render `/health` | Returned `status: ok` | Service is publicly reachable. |
| Production dashboard | Loaded scores, prices, Singapore company, and persisted signals after fresh login | Data was present; proxy/session issue resolved. |
| Production SGX endpoint | Returned live SGD quote and history | Deploy suffix-preserving normalizer. |
| Telegram `getMe` and Render logs | Authenticated and polling enabled | Keep production bot configuration. |

## AI Use Boundaries

- AI was used for analysis, drafting, debugging hypotheses, and documentation organization.
- Humans reviewed implementation choices, controlled production credentials, and approved environment changes.
- The system does not claim that generated text is financial advice or that unavailable provider data is a live price.
- This record intentionally distinguishes AI proposals from decisions verified by code, tests, logs, or production endpoint responses.