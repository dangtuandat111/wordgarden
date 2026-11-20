# Verification record

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
