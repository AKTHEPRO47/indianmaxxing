# Changelog

All notable updates to the ESG Momentum Engine are recorded here.

## Current Release

### Added

- Node.js ESG intelligence backend with company dashboards, scoring, signals, portfolios, alerts, WebSocket updates, and API-key support.
- React frontend features for news, watchlists, accounts, notifications, and company analytics.
- Background news ingestion, market notifications, and Telegram alert-bot polling.
- Render and Vercel hosting documentation and a public frontend demo.

### Fixed

- Production frontend API requests now use a same-origin Vercel proxy, preserving authenticated sessions.
- Yahoo Finance ticker normalization preserves international exchange suffixes such as the Singapore Exchange `.SI` format.

### Deployment

- Frontend demo: https://frontend-ebon-six-10.vercel.app/
- Production backend: https://tricard-api.onrender.com/health

## Earlier Work

- Added AI adoption, controversy risk, greenwashing, document extraction, momentum-scoring, and signal-classification capabilities.
- Added authentication and notification support across the Python legacy backend and Node.js application.