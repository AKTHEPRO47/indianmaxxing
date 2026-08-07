# Hosting The Application

## Production Architecture

Deploy the React frontend to Vercel and the active Node API in `backend-node/` to Render. Do not deploy the Node API to Vercel: it requires a persistent SQLite file and upload directory, a continuously running scheduler, and WebSocket connections, which Vercel serverless functions do not provide.

## 1. Prepare The Repository

1. Push the committed `main` branch to GitHub.
2. In the GitHub repository settings, confirm no `.env` file is tracked.
3. Generate a production session secret, for example: `openssl rand -hex 32`.
4. Create a Vercel account and a Render account using the same GitHub repository.

## 2. Deploy The Backend To Render

1. In Render, select **New > Web Service** and connect the repository.
2. Set **Root Directory** to `backend-node`.
3. Select **Node** as the runtime.
4. Set **Build Command** to `npm ci && npx prisma generate`.
5. Set **Start Command** to `npx prisma db push && npm start`.
6. Attach a persistent disk mounted at `/var/data`. This preserves SQLite data and uploaded files through restarts and deployments.
7. Add these environment variables. Replace the example frontend domain after Vercel has created it.

```text
NODE_ENV=production
DATABASE_URL=file:/var/data/esg_momentum.db
UPLOAD_DIR=/var/data/uploads
SECRET_KEY=<the generated random secret>
SESSION_DAYS=30
CORS_ORIGINS=https://your-project.vercel.app
FRONTEND_URL=https://your-project.vercel.app
COOKIE_SAME_SITE=none
COOKIE_SECURE=true
USE_MOCK_LLM=true
OPENAI_API_KEY=<optional; required only when USE_MOCK_LLM=false>
OPENAI_MODEL=gpt-4.1-mini
GOOGLE_CLIENT_ID=<optional>
SMTP_HOST=<optional>
SMTP_PORT=587
SMTP_USERNAME=<optional>
SMTP_PASSWORD=<optional>
SMTP_FROM_EMAIL=<optional>
SMTP_FROM_NAME=Tricard Alerts
TELEGRAM_BOT_TOKEN=<optional>
TELEGRAM_BOT_USERNAME=<optional>
```

8. Deploy the service and open `https://<render-service>.onrender.com/health`. It must return JSON with `status` set to `ok`.
9. Copy the Render service URL without a trailing slash.

## 3. Deploy The Frontend To Vercel

1. In Vercel, select **Add New > Project** and import the same GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Leave the framework preset as Vite. Vercel should use `npm run build` and publish `dist`.
4. Add this production environment variable, using the Render URL copied above:

```text
VITE_API_URL=https://<render-service>.onrender.com
```

5. Deploy and copy the resulting `https://<project>.vercel.app` URL.
6. Return to Render and set both `CORS_ORIGINS` and `FRONTEND_URL` to that exact Vercel URL. Redeploy the Render service.
7. Redeploy Vercel once more after confirming `VITE_API_URL` is present in the Vercel production environment.

## 4. Verify The Hosted Application

1. Visit the Vercel URL and verify the dashboard loads live API data instead of static fallback data.
2. Register a test account, refresh the page, and confirm the account remains signed in.
3. Open browser developer tools and confirm API calls go to the Render URL and return successful responses.
4. Confirm `https://<render-service>.onrender.com/health` remains healthy.
5. Upload a small document and restart or redeploy the Render service; confirm the document remains available. This checks the persistent disk.

## Local Development

Keep `VITE_API_URL` unset locally. Vite will proxy `/api` calls to `http://localhost:8000`, using the existing `frontend/vite.config.ts` configuration. Use `COOKIE_SAME_SITE=lax` and `COOKIE_SECURE=false` locally.