# Operations and troubleshooting

Machine-specific resource measurements and daily notes are kept locally and excluded from Git. Use `docker stats --no-stream` to inspect current container usage.

Run `docker compose up -d` to start existing images, `docker compose restart web` to restart the current image, and `docker compose up -d --build` after code changes. Check `docker compose ps`, `docker compose logs --tail 80 web`, and `Invoke-RestMethod http://localhost:3080/api/health`. `docker compose down` stops services and retains the named database volume. **`docker compose down -v` deletes it.** Startup order is healthy database, successful one-shot migration, then web.

## Database backup and restore

From the repository root, run `powershell -ExecutionPolicy Bypass -File scripts/backup.ps1`. The SQL dump is stored in ignored `backups/`; copy it to another disk for protection. To inspect a restore, use a separate instance/database. The existing script example uses a new database in the container:

```powershell
docker compose cp backups/your-backup.sql db:/tmp/restore.sql
docker compose exec db createdb -U wordgarden wordgarden_restore
docker compose exec db psql -U wordgarden -d wordgarden_restore -v ON_ERROR_STOP=1 -f /tmp/restore.sql
```

Point a separate test app at `wordgarden_restore` to verify records and review dates. Do not restore into the active database. JSON export/import transfers content and folder names, but newly imported entries restart review; use the SQL dump for full state.

## Common failures

| Symptom | Check |
| --- | --- |
| Docker API unavailable | Start Docker Desktop and wait for its engine; then `docker compose ps`. |
| Port 3080/3000/5433 in use | Find the listener or choose a free port; update `AUTH_URL` and extension address. |
| Web waits or exits | Check `docker compose ps` and `docker compose logs migrate db web`; migration needs a healthy DB. |
| Host dev cannot resolve `db` | Use `localhost:5433` and the isolated dev container in [developer setup](developer-setup.md). |
| 403 origin error | Match the browser's origin to `AUTH_URL`; send JSON on write requests. |
| Extension 401/connection error | Start the app, reopen popup, press **Kết nối lại**, then retry last failed capture. |
| Cambridge lookup unavailable | Open the Cambridge page manually and save the word without a definition. |
| Print dialog missing | Open the app in Chrome/Edge and press **In / Lưu PDF** there. |

## Google mode and network access

For an intentional multi-device deployment, set `LOCAL_MODE=false`, a random `AUTH_SECRET` of at least 32 characters, public HTTPS `AUTH_URL`, Google client ID/secret, and `ALLOWED_EMAILS`. Set the OAuth web callback to `https://your-domain/api/auth/callback/google`. Run behind a trusted HTTPS reverse proxy and explicitly change the Compose loopback binding. Do not expose local mode to a network. Google mode code exists but has not been verified with real credentials in this project. Local and Google accounts have separate data; export JSON locally before switching and import under Google if needed. The extension's quick save does not operate in Google mode.
