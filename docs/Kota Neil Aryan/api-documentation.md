# Aryan API Documentation

## Base URL and conventions

- Development base URL: `http://localhost:8000`
- The React app calls the same routes through Vite at `/api/*`; the proxy removes `/api`.
- JSON responses are converted from Prisma camelCase to snake_case.
- Authenticated requests use the `tricard_session` HTTP-only cookie or an `X-API-Key` header where API-key access is permitted.
- Standard errors: `400` invalid input, `401` unauthenticated, `403` unauthorized, `404` absent resource, `409` conflict, `413` oversized upload, `429` rate limit, and `500` server failure.

### Common request examples

```bash
curl http://localhost:8000/companies?q=TSLA
curl -X POST http://localhost:8000/companies/1/calculate-scores
curl -X POST http://localhost:8000/portfolios -b "tricard_session=<token>" -H "Content-Type: application/json" -d '{"name":"Long-term ESG"}'
```

## Health and dashboard

| Method | Endpoint | Example request | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | `GET /health` | `200` service/version/timestamp | `500` |
| GET | `/dashboard` | `GET /dashboard` | `200` dashboard lists and summary | `500` |
| GET | `/dashboard/stats` | `GET /dashboard/stats` | `200` platform totals/averages | `500` |
| GET | `/dashboard/trending` | `GET /dashboard/trending` | `200` recent score movements | `500` |
| GET | `/dashboard/dividends` | `?include_zero=false&limit=50` | `200` dividend rows | `400`, `500` |

## Companies and ESG intelligence

| Method | Endpoint | Example request | Success | Errors |
|---|---|---|---|---|
| POST | `/companies` | `{"name":"Example Corp","ticker":"EXM"}` | `201` company | `400`, `500` |
| GET | `/companies` | `?q=Tesla&country=USA&page=1&limit=50` | `200` company array | `500` |
| GET | `/companies/compare/batch` | `?ids=1,2,3` | `200` comparison | `400`, `404`, `500` |
| GET | `/companies/export/csv` | `GET /companies/export/csv` | `200` CSV attachment | `500` |
| POST | `/companies/import/csv` | multipart `file=@companies.csv` | `201` import result | `400`, `401`, `403`, `413`, `429`, `500` |
| GET | `/companies/shared/:token` | `/companies/shared/abc123` | `200` shared report | `404`, `500` |
| GET/PUT/DELETE | `/companies/:id` | `PUT {"industry":"Technology"}` | `200` resource/message | `401`, `403`, `404`, `500` |
| GET | `/companies/:id/reports` | `/companies/1/reports` | `200` reports | `404`, `500` |
| POST | `/companies/:id/upload-report` | multipart `file=@report.pdf`, `year=2025` | `201` processing report | `400`, `404`, `413`, `429`, `500` |
| POST | `/companies/:id/scan-signals` | `POST /companies/1/scan-signals` | `200` signals | `404`, `500` |
| POST | `/companies/:id/calculate-scores` | `POST /companies/1/calculate-scores` | `200` score snapshot | `404`, `500` |
| GET | `/companies/:id/score-history` | `/companies/1/score-history` | `200` snapshots | `404`, `500` |
| GET | `/companies/:id/signals` | `/companies/1/signals?category=controversy` | `200` signals | `404`, `500` |
| GET | `/companies/:id/evidence` | `/companies/1/evidence?report_id=3` | `200` evidence | `404`, `500` |
| GET | `/companies/:id/metrics` | `/companies/1/metrics?pillar=environmental` | `200` metrics | `404`, `500` |
| GET | `/companies/:id/stock` | `/companies/1/stock?range=1mo` | `200` quote/history | `400`, `404`, `502`, `500` |
| POST | `/companies/:id/copilot` | `{"question":"What are the key risks?"}` | `200` answer | `400`, `404`, `500` |
| GET | `/companies/:id/esg-summary` | `/companies/1/esg-summary` | `200` summary | `404`, `500` |
| GET | `/companies/:id/search` | `/companies/1/search?q=emissions` | `200` matching content | `400`, `404`, `500` |
| POST | `/companies/:companyId/reports/:reportId/share` | `POST /companies/1/reports/2/share` | `200` share token | `401`, `403`, `404`, `500` |

## Matrix and market

| Method | Endpoint | Example request | Success | Errors |
|---|---|---|---|---|
| GET | `/matrix` | `?exchange=NASDAQ&industry=Technology` | `200` matrix entries | `500` |
| GET | `/matrix/leaderboard` | `?sortBy=momentum&order=desc&limit=20` | `200` ranked snapshots | `400`, `500` |
| GET/POST | `/matrix/peer-groups` | `POST {"name":"EV peers","companyIds":[1,2]}` | `200`/`201` groups | `400`, `500` |
| GET | `/matrix/peer-groups/:id/benchmarks` | `/matrix/peer-groups/1/benchmarks` | `200` averages | `404`, `500` |
| GET | `/market/batch-quotes` | `?tickers=AAPL,MSFT,TSLA` | `200` quotes by ticker | `500` |
| GET | `/market/movers` | `GET /market/movers` | `200` gainers/losers | `500` |

## News and alerts

| Method | Endpoint | Example request | Success | Errors |
|---|---|---|---|---|
| GET | `/news` | `?limit=50&category=controversy` | `200` persisted headline signals with company metadata | `400`, `500` |
| POST | `/news/refresh` | authenticated request | `200` bounded RSS refresh summary | `401`, `429`, `500` |

The Node scheduler performs a bounded Yahoo Finance RSS ingestion every 15 minutes. New headlines are classified, deduplicated by company/title/source, stored as signals, and trigger score recalculation for the affected company.

## Portfolios, alerts, and API keys

| Method | Endpoint | Example request | Success | Errors |
|---|---|---|---|---|
| GET/POST | `/portfolios` | `POST {"name":"Core holdings"}` | `200`/`201` portfolios | `400`, `401`, `500` |
| GET/PUT/DELETE | `/portfolios/:id` | `PUT {"description":"Updated"}` | `200` resource/message | `401`, `404`, `500` |
| POST | `/portfolios/:id/items` | `{"companyId":1,"shares":10,"avgCost":250}` | `201` item | `400`, `401`, `404`, `500` |
| DELETE | `/portfolios/:id/items/:companyId` | `DELETE /portfolios/1/items/1` | `200` message | `401`, `404`, `500` |
| GET | `/portfolios/:id/esg-score` | `/portfolios/1/esg-score` | `200` weighted metrics | `401`, `404`, `500` |
| GET/POST | `/alerts` | `POST {"name":"Risk spike","triggerType":"controversy_spike"}` | `200`/`201` alerts | `400`, `401`, `404`, `500` |
| PUT/DELETE | `/alerts/:id` | `PUT {"isActive":false}` | `200` alert/message | `401`, `404`, `500` |
| POST | `/alerts/test/:id` | `POST /alerts/test/1` | `200` test notification | `401`, `404`, `500` |
| GET/POST | `/api-keys` | `POST {"name":"Research script","scopes":"read"}` | `200`/`201` key data | `400`, `401`, `500` |
| DELETE | `/api-keys/:id` | `DELETE /api-keys/1` | `200` message | `401`, `404`, `500` |

## Account and administration

| Method | Endpoint | Example request | Success | Errors |
|---|---|---|---|---|
| GET/PUT | `/account/profile` | `PUT {"fullName":"Ada"}` | `200` profile | `400`, `401`, `500` |
| PUT | `/account/preferences` | `{"themeMode":"light"}` | `200` preferences | `400`, `401`, `500` |
| POST | `/account/avatar` | multipart `file=@avatar.png` | `200` profile | `400`, `401`, `413`, `500` |
| GET | `/account/notifications` | `?unread_only=true` | `200` notifications | `401`, `500` |
| POST | `/account/notifications/:id/read` | `POST /account/notifications/1/read` | `200` notification | `401`, `404`, `500` |
| POST | `/account/notifications/read-all` | `POST /account/notifications/read-all` | `200` count | `401`, `500` |
| DELETE | `/account/notifications/:id` | `DELETE /account/notifications/1` | `200` message | `401`, `404`, `500` |
| GET/POST/DELETE | `/account/watchlist[/:companyId]` | `POST /account/watchlist/1` | `200` list/message and delivery status; new additions notify in-app, email, and Telegram | `401`, `404`, `409`, `500` |
| GET/POST/DELETE | `/account/favorites[/:companyId]` | `POST /account/favorites/1` | `200` list/message | `401`, `404`, `409`, `500` |
| GET | `/account/tags` | `GET /account/tags` | `200` tags | `401`, `500` |
| POST/DELETE | `/account/tags/:companyId` | `POST {"tag":"Watch"}` | `200` tags/message | `400`, `401`, `404`, `500` |
| GET | `/account/activity` | `?limit=50` | `200` activity | `401`, `500` |
| GET | `/account/export` | `GET /account/export` | `200` export | `401`, `500` |
| GET | `/admin/stats` | admin request | `200` statistics | `401`, `403`, `500` |
| GET | `/admin/users` | `?page=1&limit=50` | `200` users | `401`, `403`, `500` |
| PUT/DELETE | `/admin/users/:id` | `PUT {"isActive":false}` | `200` user/message | `401`, `403`, `404`, `500` |
| GET | `/admin/activity` | `?limit=100` | `200` audit records | `401`, `403`, `500` |
| POST | `/admin/broadcast` | `{"title":"Maintenance","body":"..."}` | `200` result | `400`, `401`, `403`, `500` |
| GET | `/admin/health` | admin request | `200` dependency health | `401`, `403`, `500` |

Authentication endpoints are documented separately in `docs/Neelaansh/README.md` because they are Neelaansh's contribution area.