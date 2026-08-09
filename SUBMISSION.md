# Submission Package

The repository contains placeholder-only environment templates:

- `backend-node/.env.example` for the supported Node/Express API
- `frontend/.env.example` for the Vite client

Do not include local credentials, deployment tokens, databases, dependencies, build output, uploads, or runtime logs in the submission archive. In particular, exclude `.env`, `.env.local`, `.venv`, `.vercel`, `node_modules`, `frontend/dist`, `uploads`, `*.db`, and `*.log`.

From the repository parent directory, create a clean submission ZIP with:

```powershell
Compress-Archive -Path .\polyfintech\* -DestinationPath .\polyfintech-submission.zip -Force
```

Before submitting, remove excluded local artifacts from the copied folder or archive only the tracked project files with `git archive`:

```powershell
git archive --format=zip --output ..\polyfintech-submission.zip HEAD
```

`git archive` is the recommended option because it includes the source, documentation, and environment examples while excluding ignored local secrets and generated files.