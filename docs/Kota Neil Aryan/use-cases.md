# Aryan Use Cases

## Roles

| Role | Goal | Main application areas |
|---|---|---|
| Visitor | Inspect publicly available company intelligence | Company search, dashboard, matrix |
| Authenticated investor | Track companies, upload reports, manage portfolios, and receive alerts | Dashboard, company detail, upload, portfolio, alerts |
| Administrator | Maintain company data and operate the platform | Admin API, company import/export, user management |
| API consumer | Read permitted data programmatically | API key endpoints and `X-API-Key` authentication |

## Core flows

### Review ESG momentum
1. An investor opens the dashboard.
2. The frontend requests `GET /dashboard` through the Vite `/api` proxy.
3. The Node service reads the latest Prisma score snapshots and signals.
4. The investor opens a company detail page to review ESG, momentum, AI adoption, controversy risk, evidence, and score history.

### Search and compare companies
1. A visitor searches by name or ticker with `GET /companies?q=`.
2. Optional exchange, industry, country, page, and limit filters narrow the list.
3. The investor selects companies and requests the comparison endpoint.
4. The UI renders the response using snake_case keys produced by the response middleware.

### Upload a sustainability report
1. An authenticated investor selects a company and uploads a PDF, TXT, or DOCX file up to 50 MB.
2. The API creates a report with `processing` status and returns `201`.
3. Background extraction creates evidence and ESG metric records.
4. The UI polls or refreshes the report list until the report is `done` or `failed`.

### Generate investment signals
1. An investor starts a signal scan for a company.
2. The service obtains source material from the configured AI service or mock implementation.
3. The signal classifier assigns category, sentiment, confidence, and severity.
4. The investor recalculates scores to create a new score snapshot and update dashboard rankings.

### Manage a portfolio and alerts
1. An authenticated investor creates a portfolio and adds company positions.
2. The portfolio route calculates an ESG-weighted score from holdings and current company scores.
3. The investor creates an alert rule for a threshold or risk condition.
4. The scheduler evaluates enabled rules and delivers in-app or email notifications.

## Edge cases and expected behavior

| Situation | Expected behavior |
|---|---|
| No matching companies | `GET /companies` returns an empty array with count headers. |
| Unknown company ID | Company routes return `404` with a `detail` message. |
| Duplicate ticker | `POST /companies` returns `400`; the unique ticker is not overwritten. |
| Invalid report type or oversized file | Upload middleware rejects the request; allowed types are PDF, TXT, and DOCX. |
| Extraction failure | The report status is changed to `failed`; existing company data remains intact. |
| No score history | Detail/dashboard responses use `null` latest-score values rather than fabricated database records. |
| Mock AI mode | The application remains usable with `USE_MOCK_LLM=true`; no OpenAI key is required. |
| API unavailable in hosted static mode | The frontend displays its explicit static fallback data only outside localhost. |
| Expired or revoked session | Protected API calls return `401`; the frontend redirects the user to login. |
| Non-admin destructive request | Delete/import/admin actions return `403`. |
| Rate limit exceeded | Auth, API, and upload limiters return `429`; clients should retry after the window. |
| Concurrent score requests | Each successful calculation records a timestamped snapshot; consumers use the newest snapshot. |