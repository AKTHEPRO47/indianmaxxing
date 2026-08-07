# SGX Stock Investment Tool

Team project — long-term investing tool for SGX-listed stocks.

> Group deliverable (A3). Sections marked TODO are completed by the team
> before submission.

## Run locally

Backend (notification module):

```bash
cd backend
npm install
cp .env.example .env      # fill in credentials — never commit .env
npm test                  # offline unit tests
npm run demo              # one manual alert through configured channels
npm run auto              # automatic pipeline against live SGX prices
```

Database: run the SQL files in `backend/migrations/` in numeric order against
your PostgreSQL instance.

Frontend: TODO (React app — see `frontend/` once added).

## Deploy

TODO — deployment steps and platform.

## Live URL

TODO — public URL of the deployed app.

## Repository layout

See `docs/` for individual and group documentation, `tests/<student>/` for
per-student unit tests.
