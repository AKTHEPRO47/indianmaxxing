# ESG Momentum Engine — Node.js Backend

Complete Node.js/Express rewrite of the Python/FastAPI backend with 20+ new features.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| ORM | Prisma (SQLite → easy migration to PostgreSQL) |
| Auth | Session cookies + Google OAuth 2.0 |
| WebSocket | ws |
| Scheduler | node-cron |
| Email | Nodemailer |
| File Upload | Multer |
| Rate Limiting | express-rate-limit |
| Security | Helmet, PBKDF2 password hashing |

## Quick Start

```bash
cd backend-node
npm install
npm run prisma:push    # Creates SQLite DB from schema
npm run seed           # Seeds company data
npm run dev            # Start dev server with nodemon
```

Or combined:
```bash
npm run setup && npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL="file:./esg_momentum.db"
PORT=8000
SECRET_KEY=your-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id
OPENAI_API_KEY=sk-...
USE_MOCK_LLM=true   # Set false to use real OpenAI
SMTP_HOST=smtp.gmail.com
SMTP_PASSWORD=your-app-password
```

## API Routes

### Auth (`/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register with email/password |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout (revokes session) |
| POST | `/auth/google` | Google Sign-In |
| GET | `/auth/me` | Current user info |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset with token |
| GET | `/auth/verify-email` | Verify email token |
| POST | `/auth/change-password` | Change password (authenticated) |
| POST | `/auth/2fa/setup` | Set up TOTP 2FA |
| POST | `/auth/2fa/verify` | Enable 2FA |
| POST | `/auth/2fa/disable` | Disable 2FA |
| GET | `/auth/sessions` | List active sessions |
| DELETE | `/auth/sessions/:id` | Revoke a session |

### Account (`/account`)
| Method | Path | Description |
|---|---|---|
| GET | `/account/profile` | Get profile |
| PUT | `/account/profile` | Update profile |
| PUT | `/account/preferences` | Update UI preferences |
| POST | `/account/avatar` | Upload avatar |
| GET | `/account/notifications` | Get notifications |
| POST | `/account/notifications/:id/read` | Mark read |
| POST | `/account/notifications/read-all` | Mark all read |
| DELETE | `/account/notifications/:id` | Delete notification |
| GET | `/account/watchlist` | Get watchlist |
| POST | `/account/watchlist/:id` | Add to watchlist |
| DELETE | `/account/watchlist/:id` | Remove from watchlist |
| GET | `/account/favorites` | Get favorites |
| POST | `/account/favorites/:id` | Add to favorites |
| DELETE | `/account/favorites/:id` | Remove from favorites |
| GET | `/account/tags` | Get company tags |
| POST | `/account/tags/:id` | Add tag to company |
| DELETE | `/account/tags/:id` | Remove tag |
| GET | `/account/activity` | View activity log |
| GET | `/account/export` | Export account data (GDPR) |

### Companies (`/companies`)
| Method | Path | Description |
|---|---|---|
| GET | `/companies` | List companies (with pagination + filters) |
| POST | `/companies` | Create company |
| GET | `/companies/compare/batch?ids=1,2,3` | Compare multiple companies |
| GET | `/companies/export/csv` | Export all as CSV |
| POST | `/companies/import/csv` | Bulk import from CSV (admin) |
| GET | `/companies/shared/:token` | View shared report (public) |
| GET | `/companies/:id` | Get company detail |
| PUT | `/companies/:id` | Update company |
| DELETE | `/companies/:id` | Delete company (admin) |
| GET | `/companies/:id/reports` | List reports |
| POST | `/companies/:id/upload-report` | Upload PDF/TXT report |
| POST | `/companies/:id/scan-signals` | AI signal scanning |
| POST | `/companies/:id/calculate-scores` | Recalculate ESG scores |
| GET | `/companies/:id/score-history` | Historical score snapshots |
| GET | `/companies/:id/signals` | Get signals |
| GET | `/companies/:id/evidence` | Get evidence items |
| GET | `/companies/:id/metrics` | Get ESG metrics |
| GET | `/companies/:id/stock?range=1mo` | Stock price data |
| POST | `/companies/:id/copilot` | AI Q&A copilot |
| GET | `/companies/:id/esg-summary` | AI executive summary |
| GET | `/companies/:id/search?q=...` | Full-text search |
| POST | `/companies/:companyId/reports/:reportId/share` | Create share link |

### Dashboard (`/dashboard`)
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Main dashboard data |
| GET | `/dashboard/stats` | Platform statistics |
| GET | `/dashboard/trending` | Trending companies |

### Matrix (`/matrix`)
| Method | Path | Description |
|---|---|---|
| GET | `/matrix` | ESG matrix (all companies with scores) |
| GET | `/matrix/leaderboard` | Ranked leaderboard |
| GET | `/matrix/peer-groups` | List peer groups |
| POST | `/matrix/peer-groups` | Create peer group |
| GET | `/matrix/peer-groups/:id/benchmarks` | Peer benchmarks |

### Portfolios (`/portfolios`) — Extra Feature
| Method | Path | Description |
|---|---|---|
| GET | `/portfolios` | List user portfolios |
| POST | `/portfolios` | Create portfolio |
| GET | `/portfolios/:id` | Get portfolio detail |
| PUT | `/portfolios/:id` | Update portfolio |
| DELETE | `/portfolios/:id` | Delete portfolio |
| POST | `/portfolios/:id/items` | Add company position |
| DELETE | `/portfolios/:id/items/:companyId` | Remove position |
| GET | `/portfolios/:id/esg-score` | ESG-weighted portfolio score |

### Alerts (`/alerts`) — Extra Feature
| Method | Path | Description |
|---|---|---|
| GET | `/alerts` | List alert rules |
| POST | `/alerts` | Create alert rule |
| PUT | `/alerts/:id` | Update alert |
| DELETE | `/alerts/:id` | Delete alert |
| POST | `/alerts/test/:id` | Send test notification |

### API Keys (`/api-keys`) — Extra Feature
| Method | Path | Description |
|---|---|---|
| GET | `/api-keys` | List API keys |
| POST | `/api-keys` | Generate new API key |
| DELETE | `/api-keys/:id` | Revoke API key |

### Admin (`/admin`) — Extra Feature
| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Platform statistics |
| GET | `/admin/users` | List users (paginated) |
| PUT | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/activity` | Global activity log |
| POST | `/admin/broadcast` | Broadcast notification to all users |
| GET | `/admin/health` | System health check |

## WebSocket

Connect to `ws://localhost:8000/ws?token=<session_token>` for real-time notifications.

Message types:
- `connected` — authentication successful
- `notification` — new notification pushed
- `market_update` — periodic market stats (every 5 min)

## 20 Extra Features

1. **Google Sign-In** — Full OAuth 2.0 via `google-auth-library`
2. **API Key Authentication** — Programmatic access with `X-API-Key` header
3. **Portfolio Tracking** — Multi-portfolio, ESG-weighted score calculation
4. **Custom Alert Rules** — Threshold-based notifications (ESG drop, controversy spike, etc.)
5. **Two-Factor Authentication** — TOTP via `speakeasy` + QR code
6. **Email Verification** — Verify email on registration
7. **Activity / Audit Log** — All user actions tracked
8. **WebSocket Real-Time** — Live notifications and market updates
9. **Rate Limiting** — Per-endpoint limits for auth, API, and uploads
10. **Company Comparison** — Side-by-side multi-company ESG comparison
11. **Bulk CSV Import** — Admin company import via CSV upload
12. **CSV Export** — Export full company list with scores as CSV
13. **User Company Tags** — Personal tagging / categorization of companies
14. **Peer Group Benchmarking** — Create groups, compare averages
15. **Shareable Report Links** — Generate public share tokens for reports
16. **AI ESG Executive Summary** — AI-generated per-company brief
17. **Full-Text Search** — Search evidence and signals within a company
18. **Admin Dashboard** — User management, stats, broadcast notifications
19. **Account Data Export** — GDPR-style full data export
20. **Session Management** — View and revoke individual sessions
21. **Avatar Upload** — Profile picture with disk storage
22. **Change Password** — In-app without requiring reset flow
23. **Score History** — Full historical ESG score snapshots per company
24. **ESG-Weighted Portfolio Score** — Shares-weighted aggregate ESG score
25. **Trending Dashboard** — Most momentum-changed companies in 7 days
