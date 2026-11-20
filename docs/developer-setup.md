# Developer setup (Windows and PowerShell)

Install Git, Node.js 22+, npm, and Docker Desktop. Run commands from the repository root. The default Docker stack is the quickest way to inspect the production build:

```powershell
docker compose up -d --build
docker compose ps
Invoke-RestMethod http://localhost:3080/api/health
```

Open `http://localhost:3080`. `db` must become healthy before `migrate` runs; `web` starts after migration succeeds. The app is mapped from container port 3000 to host port 3080. Docker restart reuses the built image; after code changes use `docker compose up -d --build` to see them.

## Hot reload with an isolated database

The main Compose file does not publish PostgreSQL to the host, and its `db` hostname resolves only inside Docker. Create a **separate** PostgreSQL container, port, and volume for development. The following names are intentionally distinct from the app's Compose resources:

```powershell
docker volume create wordgarden-dev-db
docker run -d --name wordgarden-dev-db -p 127.0.0.1:5433:5432 -e POSTGRES_USER=wordgarden_dev -e POSTGRES_PASSWORD=dev_password_only -e POSTGRES_DB=wordgarden_dev -v wordgarden-dev-db:/var/lib/postgresql/data postgres:17-alpine
```

Copy `.env.example` to `.env` and change `DATABASE_URL` to `postgresql://wordgarden_dev:dev_password_only@localhost:5433/wordgarden_dev` and `AUTH_URL` to `http://localhost:3000`. Prisma CLI reads `.env`; this file is gitignored. Keep `LOCAL_MODE=true` for local development. Compose also reads `.env`, so move or rename this host-development file before starting the default Compose stack; otherwise its host database URL will be passed into containers. Then:

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. If PostgreSQL is still starting, wait for `docker exec wordgarden-dev-db pg_isready -U wordgarden_dev -d wordgarden_dev` before migration. If port 3000 is occupied, run `npm run dev -- -p 3001`, set `AUTH_URL=http://localhost:3001`, and point the extension popup at the same URL. Use `docker stop wordgarden-dev-db` when finished and `docker start wordgarden-dev-db` to resume; the separate volume persists.

## Environment variables

| Variable | Local meaning | Change when |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection; Compose defaults to `db:5432`, host dev uses `localhost:5433`. | Switching database or execution context. |
| `LOCAL_MODE` | `true` auto-selects the local user. | Configuring Google sign-in behind HTTPS. |
| `AUTH_SECRET` | Signs auth/capture credentials. | Required secure random value before sharing a server; rotating invalidates capture tokens. |
| `AUTH_URL` | Browser-facing app origin; Compose defaults to `http://localhost:3080`. | Changing host, port, or public domain. |
| `AUTH_TRUST_HOST` | Auth.js host trust; Compose sets `true`. | Deployment-specific auth configuration. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth credentials; empty locally. | Enabling Google mode. |
| `ALLOWED_EMAILS` | Comma-separated Google account allowlist. | Enabling Google mode. |

Never commit real credentials. `.env.example` uses Docker's `db` hostname and must be adjusted for host development. Check [operations](operations.md) for Google mode and troubleshooting.
