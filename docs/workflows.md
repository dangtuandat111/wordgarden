# Functional workflows

## Manual save and Cambridge lookup

The editor collects a term, optional definition, folder, and content. **Tra Cambridge** calls `POST /api/lookup`; the server fetches public HTML, parses at most 24 senses and two examples per sense, and returns a URL/status/message. An HTTP error, timeout, or changed markup returns an unavailable status. The learner can still save with an empty definition. `POST /api/entries` validates content, checks folder ownership and duplicates, then creates a due entry. Invalid input returns 400, missing folder 400, duplicate 409.

## Extension capture

The popup requests host permission and calls `POST /api/extension/connect`. The server issues an extension-bound token in local mode. A page selection or context menu sends term, sentence when extractable, and URL to the background worker. The worker calls `POST /api/extension/save` with the token. The API validates the extension ID/token, sanitizes URLs, checks duplicates, and saves. A missing deleted folder falls back to unfiled. A failure is shown and the latest failed capture can be retried; no queue is maintained.

## Editing and review

The UI sends the entry's `version` with `PATCH /api/entries/:id`. The server checks owner and version, validates the new content, and atomically increments version; stale versions return 409. Review uses `PATCH /api/entries/:id/review` with `remembered` and version. It updates stage, due date, and version. New entries are due immediately; see [review schedule](data-model.md#review-schedule).

## Import, export, and authentication

`GET /api/export` reads only the current user's entries; optional IDs restrict the result. CSV is for spreadsheets. JSON includes content and folder information. `POST /api/import` validates the Wordgarden v1 envelope, upserts folder names, skips existing term/definition pairs, and creates new entries with fresh review scheduling. The default local account is resolved automatically. With `LOCAL_MODE=false`, Auth.js Google sign-in requires a verified, allowlisted email; API data access is scoped to that user. State-changing main API requests check `Origin` and JSON content type. Extension requests use their own ID/origin/token checks.
