# ESG Momentum Engine

AI-assisted ESG intelligence for discovering changes in environmental, social, governance, AI-adoption, and controversy signals before annual reporting catches up.

## Active stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Node.js 18+, Express, WebSocket (`ws`) |
| Data | Prisma with SQLite by default |
| Intelligence | ESG extraction, signal classification, momentum scoring, greenwashing and controversy agents |
| Security | HTTP-only sessions, PBKDF2 passwords, Google sign-in, rate limits, Helmet |

`backend-node/` is the supported backend. The Python `backend/` folder is legacy source and is not started, built, or deployed.

## Local setup

Prerequisites: Node.js 18+ and npm.

```powershell
git clone https://github.com/AKTHEPRO47/indianmaxxing.git
cd indianmaxxing

npm --prefix backend-node install
npm --prefix frontend install

Copy-Item backend-node/.env.example backend-node/.env
# Optional: Copy-Item frontend/.env.example frontend/.env.local
# Set DATABASE_URL, SECRET_KEY, CORS_ORIGINS, and optional provider credentials.

npm --prefix backend-node run prisma:push
npm --prefix backend-node run seed
npm --prefix backend-node start
```

In a second terminal:

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. The API health check is `http://localhost:8000/health`.

## Validation

```powershell
npm --prefix backend-node run test:unit
npm --prefix frontend run build
```

The Node unit suite covers ESG signal classification, response casing, and authentication security helpers.

## Submission

Use the placeholder-only environment templates in `backend-node/.env.example` and `frontend/.env.example`. See [SUBMISSION.md](SUBMISSION.md) for a submission-safe archive command that excludes local secrets and generated artifacts.

## Deployment

1. Provision a Node.js 18+ service for `backend-node/` and persistent database/upload storage.
2. Set `NODE_ENV=production`, a strong `SECRET_KEY`, production `DATABASE_URL`, `CORS_ORIGINS`, `FRONTEND_URL`, and optional Google/OpenAI/SMTP variables.
3. Run `npm --prefix backend-node run prisma:push` and `npm --prefix backend-node run seed` once, then start with `npm --prefix backend-node start`.
4. Build the client with `npm --prefix frontend run build` and deploy `frontend/dist/` to a static host. Configure that host to proxy `/api` to the API service, or use an equivalent reverse proxy.
5. Enable HTTPS so production secure session cookies are sent correctly.

## Live URL

Demo: https://frontend-ebon-six-10.vercel.app/

The verified local URLs are `http://127.0.0.1:5173` and `http://localhost:8000/health`.

## Stock Screener

The **Stock Screener** ranks the top three matching companies for a selected industry. Users can filter by market-cap range, dividend-yield profile, minimum ESG score, minimum momentum, and maximum controversy risk. Results are ranked from the current ESG, momentum, AI-adoption, and controversy data available through the Matrix API.

## Watchlist Signal Notifications

When the system records a new AI-scanned or RSS news signal for a company, every user tracking that company receives an in-app notification with a link to its analysis page. Connected clients receive the update in real time; configured email and Telegram delivery continues to respect each user's notification preferences.

## Documentation

- [Architecture](docs/architecture.md)
- [Aryan use cases](docs/Kota%20Neil%20Aryan/use-cases.md)
- [Aryan API documentation](docs/Kota%20Neil%20Aryan/api-documentation.md)
- [Aryan database schema](docs/Kota%20Neil%20Aryan/database-schema.md)
- [Aryan watchlist system](docs/Kota%20Neil%20Aryan/system.md)
- [Aryan AI and analytics note](docs/Kota%20Neil%20Aryan/my-ai.md)
- [Neelaansh authentication documentation](docs/Neelaansh/README.md)