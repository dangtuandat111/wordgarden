# API reference

## Reset workspace

`POST /api/reset` requires JSON `{ "confirmation": "RESET WORDGARDEN" }`, the exact configured `AUTH_URL` origin, and the current account. It deletes that user's database row with cascading folders, entries and review state. Returns `{ "ok": true }` with no-store caching. Invalid confirmation returns 400; missing/wrong origin returns 403. The next visit creates a fresh workspace; extension tokens tied to the deleted user return 401. Files already downloaded and extension storage must be removed separately. See [resources and reset](resources-and-reset.md).

Base URL: `http://localhost:3080` for Docker, `http://localhost:3000` for default host development. JSON responses include an `error` string on failure. Main API calls resolve the local user or require an Auth.js session in Google mode. State-changing calls require `Content-Type: application/json`; if an `Origin` header is present it must match `AUTH_URL`. Entries and folders are scoped to the user.

| Method and path | Request | Success | Common errors |
| --- | --- | --- | --- |
| `GET /api/health` | None | `{ok:true}` after database query | 500 if database unavailable |
| `GET /api/me` | None | Name, email, `localMode`, `cambridgeSync:false` | 401 |
| `GET /api/folders` | None | Folder array | 401 |
| `POST /api/folders` | `{name,color?}` | Folder, 201 | 400, 409 |
| `DELETE /api/folders/:id` | JSON header | `{ok:true}`; entries become unfiled | 401, 403 |
| `POST /api/lookup` | `{term,vietnamese?}` | `{senses,url,status,message}` | 400; lookup unavailable is a successful response |
| `GET /api/entries` | None | Entry array, newest first | 401 |
| `POST /api/entries` | Entry input | Entry, 201 | 400 invalid/folder; 409 duplicate |
| `PATCH /api/entries/:id` | Entry input plus `version` | Updated entry | 400, 404, 409 stale/duplicate |
| `PATCH /api/entries/:id/review` | `{version,remembered}` | Updated entry | 400, 404, 409 stale |
| `DELETE /api/entries/:id` | JSON header | `{ok:true}` | 401, 403 |
| `GET /api/export?format=json\|csv&ids=id1,id2` | `format=csv` optional; `ids` optional | Download; JSON by default | 401 |
| `POST /api/import` | Wordgarden v1 JSON envelope | `{created,skipped}` | 400, 413, 409/500 |

Entry input is `{term,definition?,folderId?,content}`. `content` fields and limits are defined in the [data model](data-model.md). Main JSON request bodies have a 2 MB cap. `DELETE` handlers accept an empty JSON body from the UI but do not read it.

```powershell
$baseUrl = 'http://localhost:3080'
Invoke-RestMethod "$baseUrl/api/health"
$entry = @{ term='take off'; definition=''; folderId=$null; content=@{ sentence='The plane will take off soon.' } } | ConvertTo-Json -Depth 8
Invoke-RestMethod "$baseUrl/api/entries" -Method Post -ContentType 'application/json' -Body $entry
```

## Extension API

These endpoints require `LOCAL_MODE=true` and a valid `X-Wordgarden-Extension` ID. If `Origin` is sent, it must be `chrome-extension://<same-id>`. `POST /api/extension/connect` requires JSON and returns `{token,folders,...}`. `GET /api/extension/folders` and `POST /api/extension/save` require `Authorization: Bearer <token>`. Save accepts entry input and returns `{id,duplicate,folderReset,message}`; duplicate may return HTTP 200, creation 201. Missing/invalid token returns 401, wrong mode or origin 403, invalid data 400, oversized save 413. Tokens are extension-bound and expire after 30 days. The save body has a 30,000-character limit.

Auth.js owns `/api/auth/*` for Google sign-in and callbacks. The configured callback is `/api/auth/callback/google`; see [operations](operations.md#google-mode-and-network-access). These are library-managed routes, not custom entry APIs.
