# Sanitized Chat Export

**Export date:** 2026-08-09  
**Project:** ESG Momentum Engine / Tricard  
**Sanitization:** All credentials, tokens, session values, passwords, and secret environment-variable contents are omitted.

## Conversation Objectives

1. Commit the existing project work in logical groups without deleting files.
2. Document and perform frontend and backend hosting.
3. Load and verify the public website.
4. Confirm production data, prices, scheduled jobs, and Telegram bot behavior.
5. Add the public demo link, changelog, and AI process documentation.

## Work Completed

### Repository and Documentation

- Reviewed the dirty worktree and organized changes into focused commits.
- Added Render and Vercel hosting instructions in `docs/hosting.md`.
- Added the public frontend demo URL to `README.md`.
- Added `CHANGELOG.md` for major product and deployment updates.
- Added AI usage logs and reflections for the Kota/Neil/Aryan, Matthew, and Neelaansh documentation areas.

### Production Hosting

- Deployed the React/Vite frontend to Vercel.
- Deployed the Node/Express backend to Render Starter with a persistent disk for SQLite data and uploads.
- Configured the Vercel frontend to use `/api` and proxy requests to the Render backend through `frontend/vercel.json`.
- Retained HTTP-only, secure production session cookies without storing access tokens in browser storage.

### Production Data and Market Quotes

- Verified that the deployed database retained 71 seeded companies, score snapshots, signals, and ESG metrics.
- Confirmed that the apparent empty dashboard was a browser session/proxy issue, not a data-loss event.
- Verified public production health responses after deployment.
- Fixed Yahoo Finance ticker normalization so recognized international exchange suffixes are preserved.
- Confirmed production data for Singapore Telecommunications using ticker `Z74.SI`, including a live SGD quote and OHLCV history.
- Kept unavailable/private instruments as unavailable rather than fabricating a live price.

### Scheduler and Telegram Bot

- Confirmed the backend scheduler starts on Render for market notifications, periodic WebSocket summaries, news ingestion, and stale-score work.
- Confirmed the Telegram service is connected to application startup and graceful shutdown.
- Configured Telegram credentials only as encrypted Render environment variables; no credential was added to source control or this export.
- Validated the configured bot identity through Telegram and confirmed Render logging reported polling enabled.
- Recorded that Telegram polling supports one active `getUpdates` worker for the configured bot token.

## Key Technical Decisions

| Decision | Reason | Validation |
|---|---|---|
| Use a Vercel same-origin API rewrite | Direct Vercel-to-Render session cookies can be unreliable in browser privacy contexts. | Fresh production login loaded authenticated dashboard data. |
| Keep the Node backend on Render Starter | SQLite persistence, uploads, scheduler jobs, and WebSockets require a continuously running service and persistent disk. | Render health checks passed; data persisted across deploys. |
| Preserve recognized Yahoo exchange suffixes | Generic dot-to-hyphen conversion invalidated Singapore ticker `Z74.SI`. | Production endpoint returned a live SGD quote and history. |
| Do not reseed or clear production data | Database checks showed existing seeded data and signals were intact. | Production counts and dashboard data were verified. |
| Store Telegram credentials in Render only | Prevents secrets from entering Git history and documentation. | Telegram identity validation and Render startup log confirmed configuration. |

## Verification Performed

- Frontend production build completed successfully.
- Node unit tests passed.
- Notification tests passed.
- Python compilation passed.
- Render `/health` returned an `ok` status after each relevant deployment.
- Production dashboard loaded ESG scores, momentum values, Singapore company data, and persisted signals after authentication.
- Production SGX market endpoint returned a live quote for `Z74.SI`.
- Telegram bot identity validated and Render reported polling enabled.

## Public Endpoints

- Frontend demo: https://frontend-ebon-six-10.vercel.app/
- Backend health check: https://tricard-api.onrender.com/health

## Commits Created During This Work

| Commit | Summary |
|---|---|
| `2a269e1` | Added same-origin API proxy and corrected SGX ticker handling. |
| `407a766` | Added the live frontend demo URL to the README. |
| `c17a46f` | Added the project changelog. |
| `d8f2da3` | Added AI usage logs and reflections. |

## Notes for Future Work

- Use the production frontend URL for browser testing so proxy and session behavior match users' experience.
- Keep the Render persistent disk attached; do not reset or delete the SQLite database unless a deliberate migration plan exists.
- Do not run a second polling instance with the same Telegram bot token.
- Verify live market-data availability per ticker and provider; no-data states are valid outcomes.
- Keep future credentials in encrypted hosting environment variables, not in repository files or chat exports.