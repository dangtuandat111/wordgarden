# Verification record

## Vocabulary date filters — 20 November 2026

- Implemented [date filters](docs/features/date-filters/README.md): local inclusive creation/last-review ranges, presets, never-reviewed mode and shared library/review/print/export state. No migration or deployment.
- `npm run typecheck` passed; `npm test` passed 21/21; `npm run build` passed. Date tests also passed under America/New_York for DST coverage.
- Fixture-backed headless Chrome checks passed for combined search/folder/date filters, presets, never-reviewed mode, review refresh, print result count, filtered CSV IDs, invalid-range blocking, clearing and reload. Desktop/mobile screenshots inspected; 390 px mobile had no horizontal overflow. API requests were intercepted with synthetic data; no personal database was accessed.
- Targeted ESLint passed for new logic, component and tests. Full optional local ESLint reports 13 existing findings in legacy API typing, links/effects and capture tests. The local hook remains disabled; no rules were suppressed. No Sonar configuration/scanner or dedicated semantic review tool is available. Manual review covered null dates, local-day boundaries, filter intersections and export scope.
- Initial sandbox junction test and dependency-resolution build attempts failed, then passed after the required permissions and isolated dependency installation. Browser checks required an isolated server outside sandbox; temporary test-script errors were corrected before the passing run.
- Live database smoke tests, physical printing and deployment were not run. Existing user edits in the original checkout are preserved; this work uses an isolated feature worktree.

## Daily practice and related vocabulary — 20 November 2026

- Implemented [daily practice](docs/features/daily-practice/README.md): fixed sessions of up to ten due words per browser-local day, exact-term sentence masking, server grading, transactional idempotent scheduling, stale/deleted-entry handling and optional Cambridge-related drafts.
- `npm run typecheck` passed; `npm test` passed 17/17; `npm run build` passed. Initial sandboxed test/build attempts failed on Windows junction permissions and passed with the required permission. Prisma regeneration once failed while a test server held its Windows DLL; stopping that server and rebuilding resolved it. One production-server startup found a missing BUILD_ID; rebuilding produced and verified the artifact, and the final server ran successfully.
- Applied both committed migrations to disposable PostgreSQL `practice_test` on localhost:55434. Final Prisma schema diff reported no differences. An initial diff exposed implicit ON UPDATE CASCADE expectations; the schema now explicitly maps existing and new foreign keys to the migrations' ON UPDATE NO ACTION behavior, without changing existing database constraints.
- `scripts/practice-smoke.mjs` passed against the isolated server on port 3318: session creation races, oldest-due ordering, ten-question cap, hidden answers, correct/incorrect grading, repeat/concurrent submission, version conflicts, deleted words, account isolation, cache filtering/five-suggestion cap, explicit save, resume, next-day sessions and reset cascades. Main API and extension capture smoke scripts also passed and reported removing temporary records.
- In-app browser checks covered empty-library behavior, saving context, masking repeated terms, correct grading, resumed completion after reload, Cambridge failure messaging, cache-backed suggestions, canceling a draft without saving, and explicit saving followed by removal from suggestions. Suggestion success UI used synthetic cached relationship evidence because live Cambridge access was blocked. Desktop and 390 × 844 mobile screenshots were inspected; the final mobile document had matching content/client widths with no horizontal overflow.
- Markdown relative links and whitespace checks passed. No Sonar configuration/scanner or dedicated automated review tool was available; these checks were not run. A manual code review covered API ownership, hidden-answer projection, row locking/version guards, source attribution, restricted outbound links and the additive migration.
- Remaining limitations: successful extraction from a live Cambridge page could not be verified because access was blocked; parser relationships were tested with HTML fixtures. Real Google OAuth, physical printing and installed-extension browser behavior were not rechecked for this feature. No production deployment or release was performed.
- The isolated test server was stopped and its disposable PostgreSQL container/anonymous volume removed after verification. The running app on port 3080 was not deployed or modified.
- Publication: reviewed feature files only; concurrent edits to AGENTS.md, the Git workflow and the separate main-approval verification section are preserved outside this feature commit. Required staged/history secret scans are recorded in the PR check results.

## Local resource notes — 20 November 2026

- Kept `docs/resources-and-reset.md` on disk for personal daily measurements, removed it from the Git index, and added an exact ignore rule. Removed published documentation links to the local-only file.
- Verified the file remains on disk, is ignored, and is absent from the Git index. Checked changed documentation links and whitespace.
- Reviewed the six selected paths for sensitive content; staged-content and existing-history Gitleaks scans passed with redacted output. Publication is limited to these documentation/tracking changes; unfinished daily-practice work remains local.
- Application tests and build were not run because this changes only documentation and Git tracking. No release, deployment, or history rewrite is included; earlier commits still contain the file. Rescan the final staged content and committed history before pushing.

## Initial Git publication preparation — 20 November 2026

- Initialized the local `main` branch and verified personal GitHub account `dangtuandat111` (`User`). GitHub CLI 2.105.0 stores its authentication in the system keyring; Git author identity uses the account's public name and GitHub noreply email.
- Installed Gitleaks 8.30.1. Reviewed the 65 selected source/configuration/documentation files for credentials and personal content. The only email literals in application/test code are synthetic local fixtures; configuration credentials are explicit disposable local defaults or placeholders, not private service credentials. No personal vocabulary export, backup, private key, or local environment file is included.
- Expanded `.gitignore` for environment variants, credential/key files, exports, dumps, logs, and local agent settings. Checked representative sensitive/generated paths are ignored while `.env.example` remains tracked. Changed Markdown hard breaks to backslash syntax where existing trailing spaces failed `git diff --cached --check`.
- `npm run typecheck` passed; `npm test` passed 11/11; `npm run build` passed. The initial sandboxed test and build failed on Windows junction creation (EPERM/access denied); both passed when rerun with the required permission. The build regenerated `next-env.d.ts` with production type paths.
- Staged-content Gitleaks scanning passed with redacted output. Repeat the staged scan after the final documentation update; committed history must also pass before any push. Record the published commit and remote verification in the task handoff after publication; preparation alone does not establish a remote repository or a deployment.
- Database/API smoke tests, browser/extension acceptance, and deployment checks were not rerun: this task establishes source control and changes no application behavior. No versioned release or new PROD baseline is claimed.

## Personal GitHub workflow documentation — 20 November 2026

- Added the reusable [personal GitHub workflow](docs/git-workflow.md) and linked it from the documentation index, development guide, and agent rules. This is documentation maintenance; no application behavior or release status changed.
- Checked local Markdown link targets and parsed all 10 PowerShell example blocks without executing them. CLI syntax was cross-checked against official GitHub CLI and Gitleaks documentation linked in the workflow.
- During that documentation pass, GitHub CLI and Gitleaks were not installed in the shell. Authentication, repository initialization/creation, staged/history secret scans, commits, pushes, and PR creation were not run in that pass. It did not establish that the project was cleared for public publication; the later preparation checks are recorded separately above.
- Typecheck, unit tests, build, and database/browser checks were not run because only documentation changed. Existing verification evidence below remains historical.

## Resource and reset checks — 20 November 2026

- Measured CPU/RAM, folder size, database, volume and image usage; machine-specific figures are retained only in local notes.
- TypeScript passed; 11/11 unit tests passed, including cleanup preview, wrong confirmation and a build junction pointing outside the build folder.
- Docker production build passed. App/database healthy; the real account's 1 entry remains intact.
- Reset verified with real Prisma/PostgreSQL in separate database `wordgarden_reset_verification`: confirmation/origin guards, cascading content/review deletion, account isolation, old tokens returning 401, and a fresh workspace with 3 default folders. Verification database removed afterward.
- UI checked for reset action, counts in the confirmation dialog and deletion enabled only after typing the confirmation. Canceled on real data.
- Docker log limits applied and inspected: 5 MB × 2 files per service. Full machine reset was previewed only; user data and shared build cache were retained.
- Extension storage-reset button syntax checked; not exercised in an installed Chrome/Edge extension.

This record separates earlier project checks from documentation work. It is not a claim that every item was rerun today.

## Earlier implementation checks (recorded before this documentation pass)

- Docker production build, healthy PostgreSQL/web, and successful migration were reported.
- TypeScript and 10 unit tests were reported passing.
- Main API and capture API smoke tests were reported passing with temporary data removed.
- Manual UI checks covered saving without a Cambridge meaning, flashcards, print layouts, and a 390 × 844 viewport.
- Google OAuth with real credentials, extension installation in the user's Chrome/Edge, generated PDF output, and physical printing were **not** directly verified.
- Cambridge automated lookup encountered HTTP 403; saving without a definition was verified as fallback.

## Documentation pass (2026-11-20)

The documentation was checked against route handlers, Prisma schema, shared model, extension code, Compose setup, scripts, and visible UI labels. Markdown relative links passed a local existence check. `npm run typecheck` passed; `npm test` passed 10/10; `npm run build` passed when run with permission to create Windows junction points. A first sandboxed build failed with Windows access denied while Turbopack created a Prisma junction, before the permission-adjusted build succeeded.

An isolated disposable PostgreSQL container on `127.0.0.1:55433` accepted the committed migration. A temporary Next.js dev server on port 3317 passed the health check, main API smoke test, and extension capture API smoke test. Both scripts reported removing their temporary records. The temporary server and database container were stopped. This validates the host development path without using the existing Wordgarden database; it does not prove a clean-machine install or a real-browser extension flow.

## Remaining manual checks

Use an isolated development database for API smoke tests and restore drills. Check extension permissions and capture in real Chrome/Edge, Google OAuth with configured credentials, and PDF/physical print through a browser dialog. Proposed work is tracked in [the roadmap](docs/roadmap.md).
